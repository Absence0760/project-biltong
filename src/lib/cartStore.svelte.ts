// UPDATE THIS to your email address where orders should be sent
export const SHOP_EMAIL = 'your@email.com';

export type Product = {
	id: string;
	name: string;
	price: number;
	weight: string;
	description: string;
	badge?: string;
};

export type CartItem = Product & { quantity: number };

export const products: Product[] = [
	{
		id: 'original',
		name: 'Original Biltong',
		price: 18,
		weight: '250g',
		description: 'Traditional coriander & black pepper cured beef, air-dried to perfection.',
		badge: 'Best Seller'
	},
	{
		id: 'chili',
		name: 'Chili Biltong',
		price: 18,
		weight: '250g',
		description: 'A bold chili kick that complements the natural beefy flavour.'
	},
	{
		id: 'peri-peri',
		name: 'Peri-Peri Biltong',
		price: 20,
		weight: '250g',
		description: "Fiery African bird's eye chili — not for the faint-hearted.",
		badge: 'Hot'
	},
	{
		id: 'garlic',
		name: 'Garlic Biltong',
		price: 19,
		weight: '250g',
		description: 'Slow-dried with a rich roasted garlic marinade.'
	},
	{
		id: 'droewors',
		name: 'Droëwors',
		price: 14,
		weight: '150g',
		description: 'Classic South African dried sausage snack, seasoned with coriander.'
	},
	{
		id: 'slab',
		name: 'Biltong Slab',
		price: 34,
		weight: '500g',
		description: 'Whole muscle slabs — slice to your preferred thickness at home.',
		badge: 'Value'
	}
];

function createCart() {
	let items = $state<CartItem[]>([]);

	function add(product: Product) {
		const existing = items.find((i) => i.id === product.id);
		if (existing) {
			existing.quantity++;
		} else {
			items.push({ ...product, quantity: 1 });
		}
	}

	function remove(id: string) {
		const idx = items.findIndex((i) => i.id === id);
		if (idx !== -1) items.splice(idx, 1);
	}

	function increment(id: string) {
		const item = items.find((i) => i.id === id);
		if (item) item.quantity++;
	}

	function decrement(id: string) {
		const item = items.find((i) => i.id === id);
		if (!item) return;
		item.quantity--;
		if (item.quantity <= 0) remove(id);
	}

	function clear() {
		items.length = 0;
	}

	function sendOrder(name: string, notes: string) {
		const lines = items.map(
			(i) => `  ${i.name} (${i.weight}) × ${i.quantity}  —  $${(i.price * i.quantity).toFixed(2)}`
		);
		const total = items.reduce((s, i) => s + i.price * i.quantity, 0);

		const body = [
			name ? `Name: ${name}` : '',
			'',
			'Order:',
			...lines,
			'',
			`Total: $${total.toFixed(2)}`,
			notes ? `\nNotes:\n${notes}` : ''
		]
			.filter((l, i, arr) => !(l === '' && arr[i - 1] === ''))
			.join('\n');

		const subject = name ? `Biltong order from ${name}` : 'Biltong order';
		const mailto = `mailto:${SHOP_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
		window.location.href = mailto;
	}

	return {
		get items() {
			return items;
		},
		get count() {
			return items.reduce((s, i) => s + i.quantity, 0);
		},
		get total() {
			return items.reduce((s, i) => s + i.price * i.quantity, 0);
		},
		add,
		remove,
		increment,
		decrement,
		clear,
		sendOrder
	};
}

export const cart = createCart();
