/**
 * Client-side validation helpers shared across forms.
 * Keep this as pure functions over plain values — no Svelte, no stores —
 * so it can be tested directly in vitest without a component runtime.
 */

/**
 * Loose email format check: requires a local part, an @ sign, a domain
 * part, and a TLD. Rejects obvious non-addresses like "bad@" or "a@b"
 * while accepting the common valid formats. Mirrors the regex used in
 * Cart.svelte.
 */
export function isValidEmail(email: string): boolean {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
