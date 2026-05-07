const CART_KEY = 'kontinent_cart';
const ORDERS_KEY = 'kontinent_orders';

export async function loadData() {
  const [productsRes, siteRes] = await Promise.all([
    fetch('data/products.json'),
    fetch('data/site.json')
  ]);
  return repairMojibake({
    products: await productsRes.json(),
    site: await siteRes.json()
  });
}

function decodeMojibake(value) {
  const mojibakePattern =
    /(?:[РС][\u0402-\u040f\u0452-\u045f\u201a-\u201e\u2020-\u2022\u0408\u0490\u0491\u0404\u0407\u0406\u0454\u0456\u0458\u0405\u0455\u0457]|вЂ)/;
  if (!mojibakePattern.test(value)) return value;

  try {
    const bytes = Uint8Array.from(Array.from(value, windows1251Byte));
    return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  } catch {
    return value;
  }
}

function windows1251Byte(char) {
  const code = char.charCodeAt(0);
  if (code < 128) return code;
  if (code === 0x0401) return 0xa8;
  if (code === 0x0451) return 0xb8;
  if (code >= 0x0410 && code <= 0x044f) return code - 0x0350;

  const table = {
    0x0402: 0x80,
    0x0403: 0x81,
    0x201a: 0x82,
    0x0453: 0x83,
    0x201e: 0x84,
    0x2026: 0x85,
    0x2020: 0x86,
    0x2021: 0x87,
    0x20ac: 0x88,
    0x2030: 0x89,
    0x0409: 0x8a,
    0x2039: 0x8b,
    0x040a: 0x8c,
    0x040c: 0x8d,
    0x040b: 0x8e,
    0x040f: 0x8f,
    0x0452: 0x90,
    0x2018: 0x91,
    0x2019: 0x92,
    0x201c: 0x93,
    0x201d: 0x94,
    0x2022: 0x95,
    0x2013: 0x96,
    0x2014: 0x97,
    0x2122: 0x99,
    0x0459: 0x9a,
    0x203a: 0x9b,
    0x045a: 0x9c,
    0x045c: 0x9d,
    0x045b: 0x9e,
    0x045f: 0x9f,
    0x00a0: 0xa0,
    0x040e: 0xa1,
    0x045e: 0xa2,
    0x0408: 0xa3,
    0x00a4: 0xa4,
    0x0490: 0xa5,
    0x00a6: 0xa6,
    0x00a7: 0xa7,
    0x00a9: 0xa9,
    0x0404: 0xaa,
    0x00ab: 0xab,
    0x00ac: 0xac,
    0x00ad: 0xad,
    0x00ae: 0xae,
    0x0407: 0xaf,
    0x00b0: 0xb0,
    0x00b1: 0xb1,
    0x0406: 0xb2,
    0x0456: 0xb3,
    0x0491: 0xb4,
    0x00b5: 0xb5,
    0x00b6: 0xb6,
    0x00b7: 0xb7,
    0x2116: 0xb9,
    0x0454: 0xba,
    0x00bb: 0xbb,
    0x0458: 0xbc,
    0x0405: 0xbd,
    0x0455: 0xbe,
    0x0457: 0xbf
  };

  return table[code] ?? 63;
}

function repairMojibake(value) {
  if (typeof value === 'string') return decodeMojibake(value);
  if (Array.isArray(value)) return value.map(repairMojibake);
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [key, repairMojibake(entry)])
  );
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
