import type { Product } from './sanity';
import {
	type CartItem,
	type PanelState,
	addItem,
	removeItem,
	incrementItem,
	decrementItem,
	cartCount,
	cartTotal,
	openPanel as _openPanel,
	closePanel as _closePanel
} from './cartLogic';

export type { CartItem };

function createCart() {
	let items = $state<CartItem[]>([]);
	let panel = $state<PanelState>({ open: false });

	return {
		get items() {
			return items;
		},
		get count() {
			return cartCount(items);
		},
		get total() {
			return cartTotal(items);
		},
		get panelOpen() {
			return panel.open;
		},
		add(product: Product) {
			addItem(items, product);
		},
		remove(productId: string) {
			removeItem(items, productId);
		},
		increment(productId: string) {
			incrementItem(items, productId);
		},
		decrement(productId: string) {
			decrementItem(items, productId);
		},
		clear() {
			items.length = 0;
		},
		openPanel() {
			_openPanel(panel);
		},
		closePanel() {
			_closePanel(panel);
		}
	};
}

export const cart = createCart();
