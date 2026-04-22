const CART_KEY = 'kontinent_cart';
const ORDERS_KEY = 'kontinent_orders';

export async function loadData() {
  const [productsRes, siteRes] = await Promise.all([
    fetch('data/products.json'),
    fetch('data/site.json')
  ]);
  return {
    products: await productsRes.json(),
    site: await siteRes.json()
  };
}

export function formatPrice(value) {
  return `${Number(value || 0).toLocaleString('ru-RU')} руб.`;
}

export function getCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY) || '[]');
  } catch {
    return [];
  }
}

export function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

export function addToCart(item) {
  const cart = getCart();
  const idx = cart.findIndex(
    (c) => c.productId === item.productId && (c.size || '') === (item.size || '')
  );
  if (idx >= 0) {
    cart[idx].qty += item.qty;
  } else {
    cart.push(item);
  }
  saveCart(cart);
  return cart;
}

export function removeFromCart(productId, size = '') {
  const cart = getCart().filter(
    (c) => !(c.productId === productId && (c.size || '') === (size || ''))
  );
  saveCart(cart);
  return cart;
}

export function updateQty(productId, size, qty) {
  const cart = getCart();
  const item = cart.find((c) => c.productId === productId && (c.size || '') === (size || ''));
  if (!item) return cart;
  if (qty <= 0) {
    return removeFromCart(productId, size);
  }
  item.qty = qty;
  saveCart(cart);
  return cart;
}

export function cartCount() {
  return getCart().reduce((acc, item) => acc + item.qty, 0);
}

export function cartTotal(products) {
  const map = new Map(products.map((p) => [p.id, p]));
  return getCart().reduce((sum, item) => {
    const p = map.get(item.productId);
    return sum + (p ? p.price * item.qty : 0);
  }, 0);
}

export function saveOrder(order) {
  let orders = [];
  try {
    orders = JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]');
  } catch {
    orders = [];
  }
  orders.unshift(order);
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
}

export function buildOrderNumber() {
  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
    now.getDate()
  ).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(
    2,
    '0'
  )}`;
  const random = Math.floor(Math.random() * 900 + 100);
  return `KR-${stamp}-${random}`;
}

export function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
