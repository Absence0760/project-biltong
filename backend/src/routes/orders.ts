import { Hono, type Context } from 'hono';
import { sendEmail } from '../email.js';
import { ownerNotification } from '../email-templates.js';
import { createOrder, getProductsByIds } from '../sanity.js';
import { createCheckoutSession, type StripeConfig } from '../stripe.js';
import { createRateLimiter } from '../rate-limit.js';

type CartItem = { productId: string; quantity: number };

type OrderFields = {
	name: string;
	email: string;
	phone: string;
	address: string;
	notes: string;
	cart: CartItem[];
};

const MAX_LEN = {
	name: 120,
	email: 200,
	phone: 40,
	address: 500,
	notes: 1000
} as const;

function generateOrderRef(): string {
	const now = new Date();
	const y = now.getFullYear().toString().slice(-2);
	const m = String(now.getMonth() + 1).padStart(2, '0');
	const d = String(now.getDate()).padStart(2, '0');
	// 6 base-36 chars = ~2.2 billion combinations per day. Combined with
	// email verification on /orders/:ref, brute-force enumeration is
	// computationally infeasible — see docs/security.md § Risk 3.
	const rand = Math.random().toString(36).slice(2, 8).toUpperCase().padEnd(6, '0');
	return `TB-${y}${m}${d}-${rand}`;
}

function validate(data: OrderFields): string | null {
	if (!data.name.trim()) return 'Please enter your name.';
	if (!data.email.trim()) return 'Please enter your email address.';
	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return 'Please enter a valid email address.';
	if (!data.address.trim()) return 'Please enter a shipping address.';

	if (!data.cart || data.cart.length === 0) {
		return 'Please add at least one product to your order.';
	}

	for (const item of data.cart) {
		if (!item.productId || typeof item.quantity !== 'number' || item.quantity < 1) {
			return 'Invalid cart item.';
		}
	}

	for (const [key, limit] of Object.entries(MAX_LEN) as [keyof typeof MAX_LEN, number][]) {
		if (data[key] && data[key].length > limit) return `${key} is too long (max ${limit} characters).`;
	}
	return null;
}

function getStripeConfig(): StripeConfig | null {
	const secretKey = process.env.STRIPE_SECRET_KEY;
	const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
	if (!secretKey || !webhookSecret) return null;
	return {
		secretKey,
		webhookSecret,
		currency: (process.env.STRIPE_CURRENCY ?? 'zar').toLowerCase()
	};
}

function siteUrl(): string {
	return (process.env.SITE_URL ?? 'http://localhost:7777').replace(/\/$/, '');
}

// Backend base URL is only needed when we construct webhook callbacks on
// behalf of external services. Stripe's webhook URL is configured once in
// the Stripe dashboard (or via CLI `stripe listen` locally), so we do not
// derive it per-request.
function apiUrl(c: Context): string {
	const override = process.env.API_URL?.trim();
	return (override || new URL(c.req.url).origin).replace(/\/$/, '');
}

export function ordersRouter() {
	const orders = new Hono();

	// 5 order submissions per IP per 15 minutes — generous for legitimate
	// retries (failed payment, validation correction) but caps spam.
	const orderLimiter = createRateLimiter({ windowMs: 15 * 60_000, max: 5 });

	orders.post('/', orderLimiter, async (c) => {
		let body: Partial<OrderFields & { website?: string; paymentMethod?: string; items?: string }>;
		try {
			body = await c.req.json();
		} catch {
			return c.json({ error: 'Invalid JSON body.' }, 400);
		}

		if (body.website) {
			return c.json({ success: true, ref: 'SKIPPED' });
		}

		const data: OrderFields = {
			name: (body.name ?? '').trim(),
			email: (body.email ?? '').trim(),
			phone: (body.phone ?? '').trim(),
			address: (body.address ?? '').trim(),
			notes: (body.notes ?? '').trim(),
			cart: Array.isArray(body.cart) ? body.cart : []
		};

		const error = validate(data);
		if (error) {
			return c.json({ error }, 400);
		}

		const ownerEmail = process.env.OWNER_EMAIL;
		if (!ownerEmail) {
			console.error('OWNER_EMAIL is not configured');
			return c.json({ error: 'Order cannot be processed: server is not configured.' }, 500);
		}

		const stripeConfig = getStripeConfig();
		if (!stripeConfig) {
			return c.json({ error: 'Payment processing is not configured.' }, 500);
		}

		// Look up product prices in Sanity and compute the total server-side.
		const productIds = data.cart.map((item) => item.productId);
		let products;
		try {
			products = await getProductsByIds(productIds);
		} catch (err) {
			console.error('Failed to look up products for cart', err);
			return c.json({ error: 'Sorry, something went wrong verifying your order. Please try again.' }, 500);
		}

		const productMap = new Map(products.map((p) => [p._id, p]));
		const lines: string[] = [];
		const lineItems: { name: string; amountMinor: number; quantity: number }[] = [];
		let total = 0;

		for (const item of data.cart) {
			const product = productMap.get(item.productId);
			if (!product) {
				return c.json({ error: `Product "${item.productId}" is not available.` }, 400);
			}
			if (product.priceZar == null) {
				return c.json({ error: `Product "${product.name}" does not have a price.` }, 400);
			}
			const lineTotal = product.priceZar * item.quantity;
			total += lineTotal;
			lines.push(`${item.quantity} x ${product.name} — R ${product.priceZar.toFixed(2)}`);
			lineItems.push({
				name: product.name,
				amountMinor: Math.round(product.priceZar * 100),
				quantity: item.quantity
			});
		}

		const amountZar = Math.round(total * 100) / 100;
		const itemsText = lines.join('\n');

		const ref = generateOrderRef();

		let sanityOrder;
		try {
			sanityOrder = await createOrder({
				orderRef: ref,
				customerName: data.name,
				customerEmail: data.email,
				customerPhone: data.phone,
				shippingAddress: data.address,
				items: itemsText,
				customerNotes: data.notes,
				paymentMethod: 'stripe',
				amountZar
			});
		} catch (err) {
			console.error('Failed to create Sanity order document', err);
			return c.json(
				{ error: 'Sorry, something went wrong saving your order. Please try again.' },
				500
			);
		}

		// Send owner notification. Customer gets their email after Stripe
		// confirms payment via webhook → Sanity webhook → status email.
		try {
			const ownerMail = ownerNotification({
				orderRef: ref,
				name: data.name,
				email: data.email,
				phone: data.phone,
				address: data.address,
				items: itemsText,
				notes: data.notes,
				paymentMethod: 'stripe',
				amountZar
			});
			await sendEmail({
				to: ownerEmail,
				subject: ownerMail.subject,
				html: ownerMail.html,
				replyTo: data.email
			});
		} catch (err) {
			console.error('Order email failed', err);
			return c.json(
				{
					success: true,
					ref,
					warning:
						"Your order was saved, but we couldn't send the notification email. We'll contact you shortly."
				},
				200
			);
		}

		const site = siteUrl();
		// apiUrl is retained for future use (e.g. building non-Stripe webhook
		// callbacks). Currently unused for Stripe since the webhook URL lives
		// in Stripe's dashboard config, not in each request.
		void apiUrl;

		let session;
		try {
			session = await createCheckoutSession(stripeConfig, {
				orderRef: ref,
				customerEmail: data.email,
				lineItems,
				successUrl: `${site}/payment/complete?ref=${encodeURIComponent(ref)}&session_id={CHECKOUT_SESSION_ID}`,
				cancelUrl: `${site}/payment/cancelled?ref=${encodeURIComponent(ref)}`
			});
		} catch (err) {
			console.error('Stripe checkout session create failed', err);
			return c.json(
				{
					success: true,
					ref,
					warning:
						"Your order was saved, but we couldn't start the payment session. Please contact us to complete payment."
				},
				200
			);
		}

		return c.json({ success: true, ref, stripe: { sessionId: session.id, url: session.url } });
	});

	return orders;
}
