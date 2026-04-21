import { createHmac, timingSafeEqual } from 'crypto';

export type StripeConfig = {
	secretKey: string;
	webhookSecret: string;
	currency: string;
};

export type CheckoutLineItem = {
	name: string;
	amountMinor: number; // amount in the smallest currency unit (cents)
	quantity: number;
};

export type CheckoutSessionInput = {
	orderRef: string;
	customerEmail: string;
	lineItems: CheckoutLineItem[];
	successUrl: string;
	cancelUrl: string;
};

export type CheckoutSession = {
	id: string;
	url: string;
};

export type WebhookEvent = {
	valid: boolean;
	type: string;
	orderRef: string;
	paymentId: string;
	amountMinor: number;
	currency: string;
};

const STRIPE_API = 'https://api.stripe.com/v1';
const SIGNATURE_TOLERANCE_SECONDS = 300;

/**
 * Create a Stripe Checkout Session via the REST API. We use fetch + form
 * encoding rather than pulling in the stripe SDK to keep the Lambda bundle
 * small — this endpoint is the only Stripe surface we call outbound.
 */
export async function createCheckoutSession(
	config: StripeConfig,
	input: CheckoutSessionInput
): Promise<CheckoutSession> {
	const params = new URLSearchParams();
	params.set('mode', 'payment');
	params.set('success_url', input.successUrl);
	params.set('cancel_url', input.cancelUrl);
	params.set('customer_email', input.customerEmail);
	params.set('client_reference_id', input.orderRef);
	params.set('metadata[orderRef]', input.orderRef);
	params.set('payment_intent_data[metadata][orderRef]', input.orderRef);

	input.lineItems.forEach((item, idx) => {
		params.set(`line_items[${idx}][quantity]`, String(item.quantity));
		params.set(`line_items[${idx}][price_data][currency]`, config.currency);
		params.set(`line_items[${idx}][price_data][unit_amount]`, String(item.amountMinor));
		params.set(`line_items[${idx}][price_data][product_data][name]`, item.name);
	});

	const res = await fetch(`${STRIPE_API}/checkout/sessions`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${config.secretKey}`,
			'Content-Type': 'application/x-www-form-urlencoded'
		},
		body: params.toString()
	});

	if (!res.ok) {
		const body = await res.text();
		throw new Error(`Stripe checkout session create failed: ${res.status} ${body}`);
	}

	const json = (await res.json()) as { id: string; url: string };
	return { id: json.id, url: json.url };
}

/**
 * Verify a Stripe webhook signature. Stripe signs the raw request body
 * concatenated with a timestamp; we must validate against the byte-exact body
 * the HTTP layer received, not a re-serialized parse.
 *
 * See https://stripe.com/docs/webhooks/signatures for the spec.
 */
export function verifyWebhookSignature(
	rawBody: string,
	signatureHeader: string | null | undefined,
	webhookSecret: string,
	nowSeconds: number = Math.floor(Date.now() / 1000)
): WebhookEvent {
	const invalid: WebhookEvent = {
		valid: false,
		type: '',
		orderRef: '',
		paymentId: '',
		amountMinor: 0,
		currency: ''
	};

	if (!signatureHeader) return invalid;

	// Header format: "t=<ts>,v1=<sig>,v1=<sig>,..."
	const parts = signatureHeader.split(',').map((p) => p.trim());
	let timestamp = '';
	const signatures: string[] = [];
	for (const part of parts) {
		const [k, v] = part.split('=');
		if (!v) continue;
		if (k === 't') timestamp = v;
		else if (k === 'v1') signatures.push(v);
	}

	if (!timestamp || signatures.length === 0) return invalid;

	const ts = Number(timestamp);
	if (!Number.isFinite(ts)) return invalid;
	if (Math.abs(nowSeconds - ts) > SIGNATURE_TOLERANCE_SECONDS) return invalid;

	const signedPayload = `${timestamp}.${rawBody}`;
	const expected = createHmac('sha256', webhookSecret).update(signedPayload).digest('hex');
	const expectedBuf = Buffer.from(expected);

	const match = signatures.some((sig) => {
		const sigBuf = Buffer.from(sig);
		return sigBuf.length === expectedBuf.length && timingSafeEqual(sigBuf, expectedBuf);
	});

	if (!match) return invalid;

	// Parse only after the signature checks out so we never trust attacker-
	// supplied JSON fields on an unverified payload.
	let parsed: { type?: string; data?: { object?: Record<string, unknown> } };
	try {
		parsed = JSON.parse(rawBody);
	} catch {
		return invalid;
	}

	const obj = parsed.data?.object ?? {};
	const orderRef =
		(obj.client_reference_id as string | undefined) ??
		((obj.metadata as Record<string, string> | undefined)?.orderRef ?? '');

	return {
		valid: true,
		type: parsed.type ?? '',
		orderRef,
		paymentId: (obj.payment_intent as string | undefined) ?? (obj.id as string) ?? '',
		amountMinor: Number(obj.amount_total ?? obj.amount ?? 0),
		currency: String(obj.currency ?? '').toLowerCase()
	};
}
