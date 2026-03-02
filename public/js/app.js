// ===== VapeHaven Main Application =====
// Vanilla JS SPA – product browsing, filtering, cart & checkout

// ===== API Helper =====
const API_BASE = '/api';

async function api(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const defaultOptions = {
    headers: { 'Content-Type': 'application/json' }
  };
  try {
    const response = await fetch(url, { ...defaultOptions, ...options });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `API Error: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    showToast(error.message || 'Something went wrong', 'error');
    throw error;
  }
}

// ===== Global State =====
let PRODUCTS = [];
let currentFilter = 'all';
let currentProduct = null;
let currentVariant = 'black';

// Top seller slugs
const TOP_SELLER_SLUGS = ['tobacco', 'miami-mint', 'cumber-grape-cactus', 'strawberry-watermelon'];

const categoryLabels = {
  fruity: 'Fruity',
  sweet: 'Sweet & Candy',
  tropical: 'Tropical',
  classic: 'Classic',
  menthol: 'Menthol & Fresh',
  exotic: 'Exotic'
};

const categoryColors = {
  fruity: '#FF6B6B',
  sweet: '#FFD93D',
  tropical: '#6BCB77',
  classic: '#4D96FF',
  menthol: '#95E1D3',
  exotic: '#C780FA'
};

// ===== Page Navigation =====

let currentPageId = null;

function hideAllPages() {
  document.querySelectorAll('.page').forEach(p => {
    p.classList.remove('active');
    p.style.display = 'none';
  });
}

function showPage(pageId) {
  // Skip if already on this page
  if (currentPageId === pageId) return;

  hideAllPages();
  // Force scroll to top synchronously before any rendering
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;

  const page = document.getElementById(pageId);
  if (page) {
    page.style.display = 'block';
    // Force layout recalc before adding active class (prevents animation stutter)
    void page.offsetHeight;
    page.classList.add('active');
    currentPageId = pageId;
  }
}

function goHome() {
  showPage('homePage');
}

// ===== Product Loading =====

async function loadProducts() {
  try {
    const res = await api('/products');
    PRODUCTS = res.data || res;
    renderFilterBar();
    renderGrid();
    initMarquee();
  } catch (error) {
    console.error('Failed to load products:', error);
  }
}

// ===== Filter Bar =====

function renderFilterBar() {
  const bar = document.getElementById('filterBar');
  if (!bar) return;

  const categories = [...new Set(PRODUCTS.map(p => p.category))].sort();

  // Top Sellers first, then All Flavors, then categories
  let html = '<button class="filter-btn filter-btn-top active" data-filter="all">All Flavors</button>';
  html += '<button class="filter-btn filter-btn-gold" data-filter="top-sellers"><span class="top-seller-star-filter">&#9733;</span> Top Sellers</button>';
  categories.forEach(cat => {
    const label = categoryLabels[cat] || cat.charAt(0).toUpperCase() + cat.slice(1);
    html += `<button class="filter-btn" data-filter="${cat}">${label}</button>`;
  });

  bar.innerHTML = html;

  bar.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      bar.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      showAllActive = false; // Reset show all when switching categories
      renderGrid();
    });
  });
}

// ===== Product Grid =====

const MAX_VISIBLE = 8;
let showAllActive = false; // tracks whether "Show All" has been clicked for current filter

function getTopSellers() {
  return PRODUCTS.filter(p => TOP_SELLER_SLUGS.includes(p.slug) || p.is_top_seller);
}

function renderGrid() {
  const grid = document.getElementById('productGrid');
  if (!grid) return;

  let filtered;
  if (currentFilter === 'top-sellers') {
    filtered = getTopSellers();
  } else if (currentFilter === 'all') {
    // Top sellers first, then the rest
    const topSellers = getTopSellers();
    const topSlugs = new Set(topSellers.map(p => p.slug));
    const rest = PRODUCTS.filter(p => !topSlugs.has(p.slug));
    filtered = [...topSellers, ...rest];
  } else {
    filtered = PRODUCTS.filter(p => p.category === currentFilter);
  }

  const totalCount = filtered.length;
  const shouldLimit = !showAllActive && totalCount > MAX_VISIBLE;
  const visible = shouldLimit ? filtered.slice(0, MAX_VISIBLE) : filtered;

  let html = '';
  visible.forEach((product, i) => {
    const color = categoryColors[product.category] || '#4D96FF';
    const defaultImg = product.image_black || product.image_silver;
    const isTopSeller = TOP_SELLER_SLUGS.includes(product.slug) || product.is_top_seller;

    let dots = '';
    if (product.image_silver && product.image_black) {
      dots = `<div class="card-variant-dots">
        <span class="dot silver" title="Silver"></span>
        <span class="dot black" title="Black"></span>
      </div>`;
    }

    // Price display — crossed-out original price for ALL products that have one
    let priceHTML;
    let discountBadge = '';
    if (product.original_price && product.original_price > product.price) {
      const pctOff = Math.round((1 - product.price / product.original_price) * 100);
      discountBadge = `<span class="card-discount-badge">${pctOff}% OFF</span>`;
      priceHTML = `<span class="card-price-original">AUD $${Number(product.original_price).toFixed(2)}</span>
        <span class="card-price card-price-sale">AUD $${Number(product.price).toFixed(2)}</span>`;
    } else {
      priceHTML = `<span class="card-price">AUD $${Number(product.price).toFixed(2)}</span>`;
    }

    html += `
      <div class="product-card ${isTopSeller ? 'product-card-top-seller' : ''}" style="animation-delay:${i * 50}ms" data-slug="${product.slug}">
        ${isTopSeller ? '<div class="top-seller-badge"><span class="top-seller-star">&#9733;</span> Top Seller</div>' : ''}
        ${discountBadge}
        <div class="card-glow" style="background:radial-gradient(circle,${color}22 0%,transparent 70%)"></div>
        <div class="card-img-wrap">
          <img src="${defaultImg}" alt="${product.name}" class="card-img" loading="lazy">
        </div>
        <div class="card-info">
          <span class="card-category" style="color:${color}">${categoryLabels[product.category] || product.category}</span>
          <h3 class="card-name">${product.name}</h3>
          <div class="card-price-wrap">${priceHTML}</div>
          <span class="card-shipping">Free shipping</span>
          ${dots}
        </div>
      </div>`;
  });

  // "Show All" button when items are truncated
  if (shouldLimit) {
    const remaining = totalCount - MAX_VISIBLE;
    html += `<div class="show-all-wrap">
      <button class="btn-show-all" id="showAllBtn">Show All (${remaining} more)</button>
    </div>`;
  }

  grid.innerHTML = html || '<p style="grid-column:1/-1;text-align:center;padding:40px;color:#7a8599">No products found</p>';

  grid.querySelectorAll('.product-card').forEach(card => {
    card.addEventListener('click', () => goToProduct(card.dataset.slug));
  });

  // Show All button handler
  const showAllBtn = document.getElementById('showAllBtn');
  if (showAllBtn) {
    showAllBtn.addEventListener('click', () => {
      showAllActive = true;
      renderGrid();
    });
  }
}

// ===== Product Detail =====

function goToProduct(slug) {
  currentProduct = PRODUCTS.find(p => p.slug === slug);
  if (!currentProduct) { showToast('Product not found', 'error'); return; }

  if (currentProduct.image_silver && !currentProduct.image_black) currentVariant = 'silver';
  else currentVariant = 'black';

  renderDetail();
  showPage('detailPage');
}

function renderDetail() {
  const container = document.getElementById('detailContent');
  if (!container || !currentProduct) return;

  const p = currentProduct;
  const color = categoryColors[p.category] || '#4D96FF';
  const catLabel = categoryLabels[p.category] || p.category;
  const img = currentVariant === 'silver' ? p.image_silver : p.image_black;
  const isTopSeller = TOP_SELLER_SLUGS.includes(p.slug) || p.is_top_seller;

  let variantHTML = '';
  if (p.image_black || p.image_silver) {
    variantHTML = '<div class="variant-selector"><p class="variant-label">Color:</p><div class="variant-options">';
    if (p.image_silver) {
      variantHTML += `<button class="variant-btn ${currentVariant === 'silver' ? 'active' : ''}" data-variant="silver"><span class="dot silver"></span> Silver</button>`;
    }
    if (p.image_black) {
      variantHTML += `<button class="variant-btn ${currentVariant === 'black' ? 'active' : ''}" data-variant="black"><span class="dot black"></span> Black</button>`;
    }
    variantHTML += '</div></div>';
  }

  const specs = [
    { label: 'Puffs', value: p.puffs, icon: 'puffs' },
    { label: 'E-Liquid', value: p.capacity, icon: 'capacity' },
    { label: 'Coil', value: p.coil, icon: 'coil' },
    { label: 'Battery', value: p.battery, icon: 'battery' },
    { label: 'Display', value: p.display_type, icon: 'display' },
    { label: 'Size', value: p.size_dims, icon: 'dimensions' }
  ];

  let specsHTML = '<div class="specs-grid">';
  specs.forEach(s => {
    specsHTML += `<div class="spec-item">
      <div class="spec-icon" data-icon="${s.icon}" data-icon-size="22"></div>
      <div class="spec-label">${s.label}</div>
      <div class="spec-value">${s.value}</div>
    </div>`;
  });
  specsHTML += '</div>';

  // Price in detail view — crossed-out original price for ALL products
  let detailPriceHTML;
  if (p.original_price && p.original_price > p.price) {
    detailPriceHTML = `<span class="price-original">AUD $${Number(p.original_price).toFixed(2)}</span>
      <span class="price price-sale">AUD $${Number(p.price).toFixed(2)}</span>`;
  } else {
    detailPriceHTML = `<span class="price">AUD $${Number(p.price).toFixed(2)}</span>`;
  }

  container.innerHTML = `
    <div class="detail-container">
      <button class="back-btn" id="backBtn">
        <span data-icon="arrowLeft" data-icon-size="16"></span> Back to Collection
      </button>
      <div class="detail-grid">
        <div class="detail-image-area" style="background:radial-gradient(circle at 30% 30%,${color}15 0%,transparent 70%)">
          ${isTopSeller ? '<div class="detail-top-seller-badge"><span class="top-seller-star">&#9733;</span> Top Seller</div>' : ''}
          <img id="detailImage" src="${img}" alt="${p.name}" class="detail-image">
        </div>
        <div class="detail-info">
          <div class="category-badge"><span class="badge-dot" style="background:${color}"></span>${catLabel}</div>
          <h1 class="detail-name">${p.name}</h1>
          <p class="detail-description">${p.description}</p>
          <div class="detail-price">
            ${detailPriceHTML}
            <span class="free-shipping">Free Shipping AU-Wide</span>
          </div>
          ${variantHTML}
          ${specsHTML}
          <button class="btn btn-primary btn-add-to-cart" id="addToCartBtn">
            <span data-icon="bag" data-icon-size="18"></span> Add to Cart
          </button>
        </div>
      </div>
    </div>`;

  // Event listeners
  document.getElementById('backBtn').addEventListener('click', goHome);

  container.querySelectorAll('.variant-btn').forEach(btn => {
    btn.addEventListener('click', () => switchVariant(btn.dataset.variant));
  });

  document.getElementById('addToCartBtn').addEventListener('click', () => {
    if (window.Cart) {
      window.Cart.addItem(currentProduct.id, currentVariant, 1);
    }
  });

  if (window.injectIcons) window.injectIcons();
}

function switchVariant(variant) {
  const newImg = variant === 'silver' ? currentProduct.image_silver : currentProduct.image_black;
  if (!newImg) return;

  const el = document.getElementById('detailImage');
  if (el) {
    el.style.opacity = '0';
    setTimeout(() => {
      el.src = newImg;
      currentVariant = variant;
      el.style.opacity = '1';
    }, 150);
  }

  document.querySelectorAll('.variant-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.variant === variant);
  });
}

// ===== Marquees =====

function initMarquee() {
  const marquee = document.getElementById('marquee');
  if (marquee && PRODUCTS.length > 0) {
    const names = PRODUCTS.map(p => p.name).join(' \u2022 ');
    marquee.innerHTML = `<div class="marquee-content"><span>${names} \u2022 </span><span>${names} \u2022 </span></div>`;
  }

  const shipMarquee = document.getElementById('shipMarquee');
  if (shipMarquee) {
    const text = 'FREE SHIPPING ACROSS AUSTRALIA \u2022 PREMIUM QUALITY \u2022 9000 PUFFS \u2022 ';
    shipMarquee.innerHTML = `<div class="shipping-marquee-content"><span>${text}</span><span>${text}</span><span>${text}</span></div>`;
  }
}

// ===== Toast =====

function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.className = '';
  toast.classList.add('toast', `toast-${type}`);
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => { toast.classList.remove('show'); }, 3000);
}

// ===== Age Gate =====

function initAgeGate() {
  const gate = document.getElementById('ageGate');
  const yes = document.getElementById('ageYes');
  const no = document.getElementById('ageNo');
  const popup = document.getElementById('exitPopup');
  const popupClose = document.getElementById('exitPopupClose');

  if (!gate) return;

  if (sessionStorage.getItem('ageDismissed')) {
    gate.style.display = 'none';
    return;
  }

  yes?.addEventListener('click', () => {
    sessionStorage.setItem('ageDismissed', 'true');
    gate.style.opacity = '0';
    setTimeout(() => { gate.style.display = 'none'; }, 400);
  });

  no?.addEventListener('click', () => {
    if (popup) popup.style.display = 'flex';
  });

  popupClose?.addEventListener('click', () => {
    if (popup) popup.style.display = 'none';
  });

  popup?.addEventListener('click', (e) => {
    if (e.target === popup) popup.style.display = 'none';
  });
}

// ===== Navigation =====

function initNavigation() {
  const logo = document.getElementById('headerLogoBtn');
  if (logo) logo.addEventListener('click', (e) => { e.preventDefault(); goHome(); });

  const navCollection = document.getElementById('navCollection');
  const navAbout = document.getElementById('navAbout');
  const navContact = document.getElementById('navContact');
  const navBag = document.getElementById('navBag');

  navCollection?.addEventListener('click', (e) => {
    e.preventDefault();
    goHome();
    setTimeout(() => {
      document.getElementById('collection')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  });
  navAbout?.addEventListener('click', (e) => { e.preventDefault(); showPage('aboutPage'); });
  navContact?.addEventListener('click', (e) => { e.preventDefault(); showPage('contactPage'); });
  navBag?.addEventListener('click', (e) => {
    e.preventDefault();
    if (window.Cart) window.Cart.openDrawer();
  });

  const heroExplore = document.getElementById('heroExplore');
  const heroLearn = document.getElementById('heroLearn');
  heroExplore?.addEventListener('click', () => {
    document.getElementById('collection')?.scrollIntoView({ behavior: 'smooth' });
  });
  heroLearn?.addEventListener('click', () => {
    document.getElementById('featuresStrip')?.scrollIntoView({ behavior: 'smooth' });
  });

  document.getElementById('aboutContactBtn')?.addEventListener('click', () => showPage('contactPage'));
  document.getElementById('privacyBack')?.addEventListener('click', goHome);
  document.getElementById('termsBack')?.addEventListener('click', goHome);
  document.getElementById('checkoutLogo')?.addEventListener('click', (e) => { e.preventDefault(); goHome(); });

  document.querySelectorAll('.go-privacy').forEach(a => {
    a.addEventListener('click', (e) => { e.preventDefault(); showPage('privacyPage'); });
  });
  document.querySelectorAll('.go-terms').forEach(a => {
    a.addEventListener('click', (e) => { e.preventDefault(); showPage('termsPage'); });
  });
  document.querySelectorAll('.go-contact').forEach(a => {
    a.addEventListener('click', (e) => { e.preventDefault(); showPage('contactPage'); });
  });

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        const header = document.getElementById('siteHeader');
        if (header) header.classList.toggle('scrolled', window.scrollY > 50);
        ticking = false;
      });
      ticking = true;
    }
  });

  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const mobileMenu = document.getElementById('mobileMenu');
  const mobileMenuClose = document.getElementById('mobileMenuClose');

  mobileMenuBtn?.addEventListener('click', () => mobileMenu?.classList.add('open'));
  mobileMenuClose?.addEventListener('click', () => mobileMenu?.classList.remove('open'));

  mobileMenu?.querySelectorAll('.mobile-nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      mobileMenu.classList.remove('open');
      const page = link.dataset.page;
      if (page === 'home') goHome();
      else if (page === 'about') showPage('aboutPage');
      else if (page === 'contact') showPage('contactPage');
    });
  });
}

// ===== BUNDLES =====

const BUNDLES = {
  tropical: {
    name: 'Tropical Paradise',
    slug: 'tropical-paradise',
    flavors: ['Mango Lime', 'Mango Peach Watermelon', 'Watermelon Coconut', 'Kiwi Mulberry', 'Apple Pear Watermelon'],
    price: 200, originalPrice: 345, count: 5,
    img: '/images/catalog/hero-devices.jpg'
  },
  berry: {
    name: 'Berry Blast',
    slug: 'berry-blast',
    flavors: ['Blueberry Blast', 'Blueberry Bubblegum', 'Black Cherry Pomegranate', 'Strawberry Watermelon', 'Cherry Pomegranate'],
    price: 200, originalPrice: 345, count: 5,
    img: '/images/catalog/special-edition-device.jpg'
  },
  sweet: {
    name: 'Sweet Classics',
    slug: 'sweet-classics',
    flavors: ['Skittles', 'Chupa Chups Grape', 'Strawberry Candy', 'Banana Smoothie', 'Lemon Cola'],
    price: 200, originalPrice: 345, count: 5,
    img: '/images/catalog/three-devices.jpg'
  },
  mystery: {
    name: 'Mystery Box',
    slug: 'mystery-box',
    flavors: ['10 randomly selected flavors from our full range of 19'],
    price: 380, originalPrice: 690, count: 10,
    img: '/images/catalog/global-edition.jpg'
  }
};

function initBundles() {
  // Color picker
  document.querySelectorAll('.bundle-color').forEach(dot => {
    dot.addEventListener('click', (e) => {
      e.stopPropagation();
      const picker = dot.closest('.bundle-color-picker');
      picker.querySelectorAll('.bundle-color').forEach(d => d.classList.remove('bundle-color-active'));
      dot.classList.add('bundle-color-active');
    });
  });

  // Bundle card click → detail page
  document.querySelectorAll('.bundle-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.bundle-cta') || e.target.closest('.bundle-color')) return;
      const slug = card.dataset.bundleSlug;
      if (slug) showBundleDetail(slug);
    });
  });

  // Add to cart buttons
  document.querySelectorAll('.bundle-cta').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const bundleKey = btn.dataset.bundle;
      const bundle = BUNDLES[bundleKey];
      if (!bundle) return;
      const card = btn.closest('.bundle-card');
      const colorDot = card.querySelector('.bundle-color-active');
      const color = colorDot ? colorDot.dataset.color : 'silver';
      addBundleToCart(bundleKey, color);
    });
  });
}

function showBundleDetail(slug) {
  const key = Object.keys(BUNDLES).find(k => BUNDLES[k].slug === slug);
  if (!key) return;
  const b = BUNDLES[key];
  const pctOff = Math.round((1 - b.price / b.originalPrice) * 100);

  const detail = document.getElementById('detailContent');
  detail.innerHTML = `
    <div class="detail-grid">
      <div class="detail-image-area">
        <div class="main-image-wrap">
          <img src="${b.img}" alt="${b.name}" class="main-product-image" id="mainImage">
        </div>
      </div>
      <div class="detail-info">
        <div class="detail-category" style="color:var(--teal)">Bundle Pack &mdash; ${b.count} Devices</div>
        <h1 class="detail-name">${b.name}</h1>
        <div class="detail-price-wrap">
          <span class="price-original">AUD $${b.originalPrice.toFixed(2)}</span>
          <span class="price price-sale">AUD $${b.price.toFixed(2)}</span>
          <span class="card-discount-badge" style="position:static;display:inline-block;transform:none;border-radius:6px;margin-left:8px;padding:4px 10px">${pctOff}% OFF</span>
        </div>
        <div class="detail-desc">
          <p><strong>Included flavors:</strong></p>
          <p>${b.flavors.join(' &middot; ')}</p>
        </div>
        <div class="detail-variants" style="margin:20px 0">
          <label class="variant-label">Device Color</label>
          <div class="variant-options" id="bundleColorOptions">
            <button class="variant-btn variant-btn-active" data-color="silver">Silver</button>
            <button class="variant-btn" data-color="black">Black</button>
          </div>
        </div>
        <div class="detail-actions">
          <button class="btn btn-primary btn-add-to-cart" id="bundleDetailAddBtn" data-bundle="${key}">
            Add Bundle to Cart
          </button>
        </div>
        <div class="detail-specs">
          <div class="spec-row"><span class="spec-label">Devices</span><span class="spec-val">${b.count}</span></div>
          <div class="spec-row"><span class="spec-label">Puffs (per device)</span><span class="spec-val">Up to 9,000</span></div>
          <div class="spec-row"><span class="spec-label">Battery</span><span class="spec-val">2550mAh (Non-rechargeable)</span></div>
          <div class="spec-row"><span class="spec-label">Display</span><span class="spec-val">Eliquid & Battery Level</span></div>
          <div class="spec-row"><span class="spec-label">Shipping</span><span class="spec-val">Free AU-Wide</span></div>
        </div>
      </div>
    </div>`;

  // Color variant buttons
  detail.querySelectorAll('.variant-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      detail.querySelectorAll('.variant-btn').forEach(b => b.classList.remove('variant-btn-active'));
      btn.classList.add('variant-btn-active');
    });
  });

  // Add to cart
  const addBtn = document.getElementById('bundleDetailAddBtn');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      const activeColor = detail.querySelector('.variant-btn-active');
      const color = activeColor ? activeColor.dataset.color : 'silver';
      addBundleToCart(key, color);
    });
  }

  showPage('detailPage');
  if (window.injectIcons) window.injectIcons();
}

async function addBundleToCart(bundleKey, color) {
  const b = BUNDLES[bundleKey];
  if (!b) return;

  // Use the cart API — add as a special bundle item
  try {
    const sessionId = localStorage.getItem('vh_session');
    const res = await api('/api/cart/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-session-id': sessionId },
      body: JSON.stringify({
        product_id: 9000 + Object.keys(BUNDLES).indexOf(bundleKey),
        variant_id: color === 'black' ? 2 : 1,
        quantity: 1,
        is_bundle: true,
        bundle_key: bundleKey,
        bundle_name: b.name,
        bundle_price: b.price
      })
    });
  } catch (e) {
    // Fallback — just add to cart via the Cart module directly
  }

  // Use cart module to show toast and update count
  if (window.Cart) {
    window.Cart.addBundleItem(bundleKey, color, b);
  }
  showToast(`${b.name} (${color}) added to cart!`);
}

// ===== Initialize =====

document.addEventListener('DOMContentLoaded', async () => {
  initAgeGate();
  initNavigation();
  await loadProducts();
  initBundles();
  if (window.injectIcons) window.injectIcons();
  showPage('homePage');
});

// ===== Public API =====
window.VH = {
  showPage,
  goHome,
  goToProduct,
  showBundleDetail,
  showToast,
  api,
  products: () => PRODUCTS,
  currentProduct: () => currentProduct,
  currentVariant: () => currentVariant,
  bundles: () => BUNDLES
};
