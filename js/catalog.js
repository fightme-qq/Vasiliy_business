import {
  addToCart,
  buildOrderNumber,
  cartCount,
  cartTotal,
  escapeHtml,
  formatPrice,
  getCart,
  loadData,
  removeFromCart,
  saveCart,
  saveOrder,
  updateQty
} from './common.js';

let state = {
  products: [],
  site: null,
  activeCategory: 'all',
  search: ''
};

function byId(id) {
  return document.getElementById(id);
}

function renderHeader() {
  byId('brand-title').textContent = state.site.brand;
  byId('catalog-title').textContent = `${state.site.catalogTitle} (${state.products.length})`;
  byId('cart-count').textContent = cartCount();
}

function renderCategories() {
  const wrap = byId('category-list');
  const categories = ['all', ...state.site.categories];
  wrap.innerHTML = categories
    .map((category) => {
      const active = state.activeCategory === category ? 'active' : '';
      const title = category === 'all' ? 'Все товары' : category;
      return `<button class="chip ${active}" data-category="${escapeHtml(category)}">${escapeHtml(
        title
      )}</button>`;
    })
    .join('');

  wrap.querySelectorAll('button[data-category]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.activeCategory = btn.dataset.category;
      renderCategories();
      renderProducts();
    });
  });
}

function filteredProducts() {
  return state.products.filter((p) => {
    const categoryMatch = state.activeCategory === 'all' || p.category === state.activeCategory;
    const q = state.search.trim().toLowerCase();
    const searchMatch =
      !q ||
      p.title.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q);
    return categoryMatch && searchMatch;
  });
}

function renderProducts() {
  const list = filteredProducts();
  const grid = byId('products-grid');

  if (!list.length) {
    grid.innerHTML = '<p class="empty">Товары по вашему запросу не найдены.</p>';
    return;
  }

  grid.innerHTML = list
    .map((p, index) => {
      const img = p.images[0] || 'assets/logo.png';
      return `
      <article class="card reveal" style="transition-delay:${Math.min(index * 0.03, 0.3)}s">
        <a href="product.html?id=${p.id}" class="card-image-wrap">
          <img src="${img}" alt="${escapeHtml(p.title)}" loading="lazy" class="card-image" />
        </a>
        <div class="card-body">
          <p class="card-category">${escapeHtml(p.category)}</p>
          <a href="product.html?id=${p.id}" class="card-title">${escapeHtml(p.title)}</a>
          <div class="card-bottom">
            <p class="card-price">${formatPrice(p.price)}</p>
            <button class="btn" data-add-id="${p.id}">В корзину</button>
          </div>
        </div>
      </article>`;
    })
    .join('');

  grid.querySelectorAll('button[data-add-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const productId = Number(btn.dataset.addId);
      addToCart({ productId, size: '', qty: 1 });
      byId('cart-count').textContent = cartCount();
      renderCart();
      btn.textContent = 'Добавлено';
      btn.disabled = true;
      setTimeout(() => {
        btn.textContent = 'В корзину';
        btn.disabled = false;
      }, 800);
    });
  });

  activateReveal(grid.querySelectorAll('.reveal'));
}

function renderCart() {
  const cart = getCart();
  const map = new Map(state.products.map((p) => [p.id, p]));
  const wrap = byId('cart-items');

  if (!cart.length) {
    wrap.innerHTML = '<p class="empty">Корзина пуста.</p>';
    byId('cart-total').textContent = formatPrice(0);
    return;
  }

  wrap.innerHTML = cart
    .map((item) => {
      const p = map.get(item.productId);
      if (!p) return '';
      return `
      <div class="cart-item">
        <img src="${p.images[0] || 'assets/logo.png'}" alt="${escapeHtml(p.title)}" class="cart-item-image" />
        <div class="cart-item-main">
          <p class="cart-item-title">${escapeHtml(p.title)}</p>
          <p class="cart-item-meta">${item.size ? `Размер: ${escapeHtml(item.size)}` : 'Размер не выбран'}</p>
          <div class="cart-item-row">
            <button class="qty-btn" data-qty="-1" data-id="${item.productId}" data-size="${escapeHtml(
        item.size || ''
      )}">-</button>
            <span>${item.qty}</span>
            <button class="qty-btn" data-qty="1" data-id="${item.productId}" data-size="${escapeHtml(
        item.size || ''
      )}">+</button>
            <button class="remove-btn" data-remove-id="${item.productId}" data-size="${escapeHtml(
        item.size || ''
      )}">Удалить</button>
          </div>
        </div>
        <p class="cart-item-price">${formatPrice(p.price * item.qty)}</p>
      </div>`;
    })
    .join('');

  byId('cart-total').textContent = formatPrice(cartTotal(state.products));

  wrap.querySelectorAll('button[data-remove-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      removeFromCart(Number(btn.dataset.removeId), btn.dataset.size || '');
      byId('cart-count').textContent = cartCount();
      renderCart();
    });
  });

  wrap.querySelectorAll('button[data-qty]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const productId = Number(btn.dataset.id);
      const size = btn.dataset.size || '';
      const delta = Number(btn.dataset.qty);
      const current = getCart().find((i) => i.productId === productId && (i.size || '') === size);
      const nextQty = (current?.qty || 1) + delta;
      updateQty(productId, size, nextQty);
      byId('cart-count').textContent = cartCount();
      renderCart();
    });
  });
}

function setupCheckout() {
  const form = byId('checkout-form');
  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const cart = getCart();
    if (!cart.length) {
      alert('Корзина пуста.');
      return;
    }

    const order = {
      number: buildOrderNumber(),
      createdAt: new Date().toISOString(),
      customer: {
        name: byId('checkout-name').value.trim(),
        phone: byId('checkout-phone').value.trim(),
        email: byId('checkout-email').value.trim(),
        comment: byId('checkout-comment').value.trim()
      },
      total: cartTotal(state.products),
      items: cart
    };

    saveOrder(order);
    saveCart([]);
    form.reset();
    byId('cart-count').textContent = 0;
    renderCart();

    const email = state.site.about.email || '';
    byId('checkout-result').innerHTML = `Заказ <strong>${order.number}</strong> сохранён. ${
      email ? `Напишите нам: <a href="mailto:${email}">${email}</a>` : ''
    }`;
  });
}

function setupSearch() {
  byId('search-input').addEventListener('input', (event) => {
    state.search = event.target.value;
    renderProducts();
  });
}

function setupCartToggle() {
  const panel = byId('cart-panel');
  byId('open-cart').addEventListener('click', () => panel.classList.add('open'));
  byId('close-cart').addEventListener('click', () => panel.classList.remove('open'));
}

function normalizeAboutText(text) {
  return text.replace(/\s+/g, ' ').trim();
}

function splitAboutPoints(text) {
  const cleaned = normalizeAboutText(text);
  const parts = cleaned
    .split(/[-–•]/)
    .map((item) => item.trim())
    .filter((item) => item.length > 24);
  return parts.slice(0, 8);
}

function renderAbout() {
  const aboutText = state.site.about?.text || '';
  const cleaned = normalizeAboutText(aboutText);
  const intro = cleaned.slice(0, 320).trim();
  byId('about-lead').textContent = intro.endsWith('.') ? intro : `${intro}...`;

  const points = splitAboutPoints(cleaned);
  byId('about-points').innerHTML = points.map((point) => `<li>${escapeHtml(point)}</li>`).join('');

  const email = state.site.about.email || 'email не указан';
  byId('about-email').textContent = email;
  if (state.site.about.email) {
    byId('about-email').href = `mailto:${state.site.about.email}`;
  }
}

function setupInfoTabs() {
  const buttons = document.querySelectorAll('.tab-btn');
  const panels = {
    about: byId('tab-about'),
    why: byId('tab-why'),
    contacts: byId('tab-contacts')
  };

  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.tab;
      if (!key || !panels[key]) return;

      buttons.forEach((b) => {
        b.classList.toggle('active', b === btn);
        b.setAttribute('aria-selected', b === btn ? 'true' : 'false');
      });

      Object.entries(panels).forEach(([panelKey, panel]) => {
        const isActive = panelKey === key;
        panel.classList.toggle('active', isActive);
        panel.hidden = !isActive;
      });
    });
  });
}

function activateReveal(nodes) {
  const list = Array.from(nodes || []);
  if (!list.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.08, rootMargin: '0px 0px -6% 0px' }
  );

  list.forEach((node) => observer.observe(node));
}

async function main() {
  const data = await loadData();
  state.products = data.products;
  state.site = data.site;

  renderHeader();
  renderCategories();
  renderProducts();
  renderCart();
  renderAbout();
  setupInfoTabs();
  setupSearch();
  setupCartToggle();
  setupCheckout();

  activateReveal(document.querySelectorAll('.catalog, .info-tabs'));
}

main().catch((error) => {
  console.error(error);
  byId('products-grid').innerHTML = '<p class="empty">Не удалось загрузить каталог.</p>';
});
