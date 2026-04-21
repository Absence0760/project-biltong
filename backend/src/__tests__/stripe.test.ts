import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { verifyWebhookSignature } from '../stripe.js';

function sign(body: string, secret: string, timestamp: number): string {
	const mac = createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
	return `t=${timestamp},v1=${mac}`;
}

describe('verifyWebhookSignature', () => {
	const secret = 'whsec_test';
	const now = 1_700_000_000;
	const body = JSON.stringify({
		type: 'checkout.session.completed',
		data: {
			object: {
				client_reference_id: 'TB-260420-ABCDEF',
				payment_intent: 'pi_test_123',
				amount_total: 45000,
				currency: 'zar'
			}
		}
	});

	it('accepts a correctly signed payload within the tolerance window', () => {
		const header = sign(body, secret, now);
		const event = verifyWebhookSignature(body, header, secret, now);
		expect(event.valid).toBe(true);
		expect(event.type).toBe('checkout.session.completed');
		expect(event.orderRef).toBe('TB-260420-ABCDEF');
		expect(event.paymentId).toBe('pi_test_123');
		expect(event.amountMinor).toBe(45000);
		expect(event.currency).toBe('zar');
	});

	it('rejects a payload with a wrong signature', () => {
		const header = sign(body, 'other_secret', now);
		const event = verifyWebhookSignature(body, header, secret, now);
		expect(event.valid).toBe(false);
	});

	it('rejects a payload outside the tolerance window', () => {
		const header = sign(body, secret, now - 1000);
		const event = verifyWebhookSignature(body, header, secret, now);
		expect(event.valid).toBe(false);
	});

	it('rejects a missing signature header', () => {
		const event = verifyWebhookSignature(body, null, secret, now);
		expect(event.valid).toBe(false);
	});

	it('rejects a malformed signature header', () => {
		const event = verifyWebhookSignature(body, 'garbage', secret, now);
		expect(event.valid).toBe(false);
	});

	it('rejects a signed body whose JSON body has been tampered with', () => {
		const header = sign(body, secret, now);
		const tampered = body.replace('45000', '1');
		const event = verifyWebhookSignature(tampered, header, secret, now);
		expect(event.valid).toBe(false);
	});

	it('falls back to metadata.orderRef when client_reference_id is missing', () => {
		const alt = JSON.stringify({
			type: 'checkout.session.completed',
			data: {
				object: {
					metadata: { orderRef: 'TB-FROM-METADATA' },
					payment_intent: 'pi_x',
					amount_total: 100,
					currency: 'zar'
				}
			}
		});
		const header = sign(alt, secret, now);
		const event = verifyWebhookSignature(alt, header, secret, now);
		expect(event.valid).toBe(true);
		expect(event.orderRef).toBe('TB-FROM-METADATA');
	});
});
