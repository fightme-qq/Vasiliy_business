import { addToCart, cartCount, escapeHtml, formatPrice, loadData } from './common.js';

function byId(id) {
  return document.getElementById(id);
}

function getProductId() {
  const params = new URLSearchParams(window.location.search);
  return Number(params.get('id') || 0);
}

function renderNotFound() {
  byId('product-root').innerHTML = '<p class="empty">Товар не найден.</p>';
}

function renderGallery(images, title) {
  if (!images.length) {
    return '<img src="assets/logo.png" alt="Нет фото" class="product-main-image" />';
  }

  return `
    <img src="${images[0]}" alt="${escapeHtml(title)}" class="product-main-image" id="main-image" />
    <div class="thumbs">
      ${images
        .map(
          (img, idx) =>
            `<button class="thumb ${idx === 0 ? 'active' : ''}" data-img="${img}"><img src="${img}" alt="${escapeHtml(
              title
            )}" /></button>`
        )
        .join('')}
    </div>`;
}

function renderSpecs(specs) {
  if (!specs.length) return '';
  return `
    <section class="product-section">
      <h3>Характеристики</h3>
      <ul class="specs-list">
        ${specs
          .map((s) => `<li><span>${escapeHtml(s.label)}</span><strong>${escapeHtml(s.value)}</strong></li>`)
          .join('')}
      </ul>
    </section>`;
}

function renderSizes(sizes) {
  if (!sizes.length) return '';
  return `
    <div class="sizes" id="sizes-wrap">
      ${sizes
        .map((s, idx) => `<button class="size-btn ${idx === 0 ? 'active' : ''}" data-size="${escapeHtml(s)}">${escapeHtml(s)}</button>`)
        .join('')}
    </div>`;
}

function setupGallery() {
  const main = byId('main-image');
  if (!main) return;
  document.querySelectorAll('.thumb[data-img]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const next = btn.dataset.img;
      if (!next) return;
      main.src = next;
      document.querySelectorAll('.thumb').forEach((el) => el.classList.remove('active'));
      btn.classList.add('active');
    });
  });
}

function setupSizePicker() {
  const wrap = byId('sizes-wrap');
  if (!wrap) return;
  wrap.querySelectorAll('button[data-size]').forEach((btn) => {
    btn.addEventListener('click', () => {
      wrap.querySelectorAll('button[data-size]').forEach((el) => el.classList.remove('active'));
      btn.classList.add('active');
    });
  });
}

async function main() {
  const { products } = await loadData();
  byId('cart-count').textContent = cartCount();

  const id = getProductId();
  const product = products.find((p) => p.id === id);
  if (!product) return renderNotFound();

  document.title = `${product.title} - Континент`;

  byId('product-root').innerHTML = `
    <nav class="breadcrumb"><a href="index.html">Каталог</a> / <span>${escapeHtml(product.category)}</span></nav>
    <div class="product-layout">
      <div class="product-gallery">${renderGallery(product.images, product.title)}</div>
      <div class="product-meta">
        <p class="card-category">${escapeHtml(product.category)}</p>
        <h1>${escapeHtml(product.title)}</h1>
        <p class="product-price">${formatPrice(product.price)}</p>
        ${renderSizes(product.sizes)}
        <button class="btn btn-big" id="add-cart-btn">Добавить в корзину</button>
        <a href="index.html" class="btn btn-secondary">Вернуться в каталог</a>
      </div>
    </div>
    <section class="product-section">
      <h3>Описание</h3>
      <div class="description">${product.descriptionHtml || escapeHtml(product.description)}</div>
    </section>
    ${renderSpecs(product.specs)}
  `;

  setupGallery();
  setupSizePicker();

  byId('add-cart-btn').addEventListener('click', () => {
    const activeSize = document.querySelector('.size-btn.active');
    addToCart({
      productId: product.id,
      size: activeSize?.dataset.size || '',
      qty: 1
    });
    byId('cart-count').textContent = cartCount();
    alert('Товар добавлен в корзину. Перейдите в каталог для оформления заказа.');
  });
}

main().catch((error) => {
  console.error(error);
  renderNotFound();
});
