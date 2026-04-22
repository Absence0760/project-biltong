import { describe, it, expect } from 'vitest';
import { isValidEmail } from './validation';

describe('isValidEmail', () => {
	it('accepts a standard address', () => {
		expect(isValidEmail('user@example.com')).toBe(true);
	});

	it('accepts a subdomain address', () => {
		expect(isValidEmail('user@mail.example.co.za')).toBe(true);
	});

	it('accepts a plus-addressed local part', () => {
		expect(isValidEmail('user+tag@example.com')).toBe(true);
	});

	it('rejects an address with no TLD (a@b)', () => {
		expect(isValidEmail('a@b')).toBe(false);
	});

	it('rejects an address with no domain after @ (bad@)', () => {
		expect(isValidEmail('bad@')).toBe(false);
	});

	it('rejects an address with no local part (@example.com)', () => {
		expect(isValidEmail('@example.com')).toBe(false);
	});

	it('rejects an address with a space in the local part', () => {
		expect(isValidEmail('bad email@example.com')).toBe(false);
	});

	it('rejects an empty string', () => {
		expect(isValidEmail('')).toBe(false);
	});

	it('rejects a plain string with no @', () => {
		expect(isValidEmail('notanemail')).toBe(false);
	});
});
