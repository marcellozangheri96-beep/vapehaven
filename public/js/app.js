// ===== Vaperoo Main Application =====
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
    const res = await fetch('/data/products.json');
    if (!res.ok) throw new Error(`Failed to load products: ${res.status}`);
    PRODUCTS = await res.json();
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
    const defaultImg = product.image;
    const isTopSeller = TOP_SELLER_SLUGS.includes(product.slug) || product.is_top_seller;

    // Price display — crossed-out original price for ALL products that have one
    let priceHTML;
    let discountBadge = '';
    if (product.original_price && product.original_price > product.price) {
      const pctOff = Math.round((1 - product.price / product.original_price) * 100);
      discountBadge = `<span class="card-discount-badge">${pctOff}% OFF</span>`;
      priceHTML = `<span class="card-price-original">$${Number(product.original_price).toFixed(2)}</span>
        <span class="card-price card-price-sale">$${Number(product.price).toFixed(2)}</span>`;
    } else {
      priceHTML = `<span class="card-price">$${Number(product.price).toFixed(2)}</span>`;
    }

    html += `
      <div class="product-card ${isTopSeller ? 'product-card-top-seller' : ''}" style="animation-delay:${i * 50}ms" data-slug="${product.slug}">
        ${discountBadge}
        <div class="card-glow" style="background:radial-gradient(circle,${color}22 0%,transparent 70%)"></div>
        <div class="card-img-wrap">
          <img src="${defaultImg}" alt="${product.name}" class="card-img" loading="lazy">
          ${isTopSeller ? '<div class="top-seller-badge"><span class="top-seller-star">&#9733;</span> Top Seller</div>' : ''}
        </div>
        <div class="card-info">
          <span class="card-category" style="color:${color}">${categoryLabels[product.category] || product.category}</span>
          <h3 class="card-name">${product.name}</h3>
          <div class="card-price-wrap">${priceHTML}</div>
          <span class="card-shipping">Free shipping</span>
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

  renderDetail();
  showPage('detailPage');
}

function renderDetail() {
  const container = document.getElementById('detailContent');
  if (!container || !currentProduct) return;

  const p = currentProduct;
  const color = categoryColors[p.category] || '#4D96FF';
  const catLabel = categoryLabels[p.category] || p.category;
  const img = p.image;
  const isTopSeller = TOP_SELLER_SLUGS.includes(p.slug) || p.is_top_seller;

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
    detailPriceHTML = `<span class="price-original">$${Number(p.original_price).toFixed(2)}</span>
      <span class="price price-sale">$${Number(p.price).toFixed(2)}</span>`;
  } else {
    detailPriceHTML = `<span class="price">$${Number(p.price).toFixed(2)}</span>`;
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
            <span class="free-shipping">Free Shipping Australia</span>
          </div>
          ${specsHTML}
          <button class="btn btn-primary btn-add-to-cart" id="addToCartBtn">
            <span data-icon="bag" data-icon-size="18"></span> Add to Cart
          </button>
        </div>
      </div>
      <div class="product-faq">
        <h3 class="faq-title">Frequently Asked Questions</h3>
        <div class="faq-accordion">
          <div class="faq-item">
            <button class="faq-question" aria-expanded="false">
              <span>How long does the ${p.name} last?</span>
              <span class="faq-chevron" data-icon="chevronDown" data-icon-size="16"></span>
            </button>
            <div class="faq-answer">
              <p>The SWIX Mate ${p.name} delivers up to ${p.puffs || '9000'} puffs. For an average user, this is equivalent to roughly 7–10 days of regular use. The built-in LED display shows your remaining e-liquid level so you always know where you stand.</p>
            </div>
          </div>
          <div class="faq-item">
            <button class="faq-question" aria-expanded="false">
              <span>What type of coil does it use?</span>
              <span class="faq-chevron" data-icon="chevronDown" data-icon-size="16"></span>
            </button>
            <div class="faq-answer">
              <p>The SWIX Mate uses a ${p.coil || 'mesh coil'} which provides smoother, more consistent flavor from the first puff to the last. Mesh coils heat e-liquid more evenly than traditional coils, resulting in richer taste and denser clouds.</p>
            </div>
          </div>
          <div class="faq-item">
            <button class="faq-question" aria-expanded="false">
              <span>Is shipping really free?</span>
              <span class="faq-chevron" data-icon="chevronDown" data-icon-size="16"></span>
            </button>
            <div class="faq-answer">
              <p>Yes! We offer free shipping across Australia on all orders. Standard delivery typically takes 3–7 business days depending on your location. All orders are shipped in discreet, unbranded packaging.</p>
            </div>
          </div>
          <div class="faq-item">
            <button class="faq-question" aria-expanded="false">
              <span>What's included in the box?</span>
              <span class="faq-chevron" data-icon="chevronDown" data-icon-size="16"></span>
            </button>
            <div class="faq-answer">
              <p>Each SWIX Mate comes pre-filled and fully charged, ready to use straight out of the box. The package includes 1x SWIX Mate 9000 device in your chosen flavour. No charging, filling, or setup required — simply inhale to activate.</p>
            </div>
          </div>
          <div class="faq-item">
            <button class="faq-question" aria-expanded="false">
              <span>Can I save money with bundle packs?</span>
              <span class="faq-chevron" data-icon="chevronDown" data-icon-size="16"></span>
            </button>
            <div class="faq-answer">
              <p>Absolutely! Our themed bundles of 5 devices save you up to 42% compared to buying individually. The Mystery Box (10 devices) saves up to 45%. Check out our <a href="#bundles" class="faq-link" onclick="goHome();setTimeout(()=>document.getElementById('bundleSection')?.scrollIntoView({behavior:'smooth'}),300)">Bundle Packs</a> section for all available options.</p>
            </div>
          </div>
        </div>
      </div>
    </div>`;

  // Event listeners
  document.getElementById('backBtn').addEventListener('click', goHome);

  document.getElementById('addToCartBtn').addEventListener('click', () => {
    if (window.Cart) {
      window.Cart.addItem(currentProduct.id, 'default', 1);
    }
  });

  // FAQ accordion toggle
  container.querySelectorAll('.faq-question').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.parentElement;
      const isOpen = item.classList.contains('faq-open');
      // Close all
      container.querySelectorAll('.faq-item').forEach(i => i.classList.remove('faq-open'));
      container.querySelectorAll('.faq-question').forEach(b => b.setAttribute('aria-expanded', 'false'));
      // Toggle current
      if (!isOpen) {
        item.classList.add('faq-open');
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });

  if (window.injectIcons) window.injectIcons();

  // Inject JSON-LD Product structured data for SEO
  injectProductSchema(p);
}

function injectProductSchema(p) {
  // Remove any previous product schema
  const existing = document.getElementById('product-jsonld');
  if (existing) existing.remove();

  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": `SWIX Mate 9000 — ${p.name}`,
    "description": p.description,
    "image": `https://vape-roo.com${p.image}`,
    "url": `https://vape-roo.com/#product/${p.slug}`,
    "brand": { "@type": "Brand", "name": "SWIX Mate" },
    "sku": p.slug,
    "category": "Disposable Vape",
    "offers": {
      "@type": "Offer",
      "url": `https://vape-roo.com/#product/${p.slug}`,
      "priceCurrency": "AUD",
      "price": p.price.toFixed(2),
      "availability": "https://schema.org/InStock",
      "seller": { "@type": "Organization", "name": "Vaperoo" },
      "shippingDetails": {
        "@type": "OfferShippingDetails",
        "shippingRate": { "@type": "MonetaryAmount", "value": "0", "currency": "AUD" },
        "shippingDestination": { "@type": "DefinedRegion", "addressCountry": "AU", "name": "Australia" }
      }
    }
  };

  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.id = 'product-jsonld';
  script.textContent = JSON.stringify(schema);
  document.head.appendChild(script);
}

function switchVariant(variant) {
  // Deprecated — kept for compatibility.
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
    const text = 'FREE SHIPPING AUSTRALIA \u2022 PREMIUM QUALITY \u2022 9000 PUFFS \u2022';
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
    img: '/images/catalog/tropical-paradise.webp'
  },
  berry: {
    name: 'Berry Blast',
    slug: 'berry-blast',
    flavors: ['Blueberry Blast', 'Blueberry Bubblegum', 'Black Cherry Pomegranate', 'Strawberry Watermelon', 'Cherry Pomegranate'],
    price: 200, originalPrice: 345, count: 5,
    img: '/images/catalog/berry-blast.webp'
  },
  sweet: {
    name: 'Sweet Classics',
    slug: 'sweet-classics',
    flavors: ['Skittles', 'Chupa Chups Grape', 'Strawberry Candy', 'Banana Smoothie', 'Lemon Cola'],
    price: 200, originalPrice: 345, count: 5,
    img: '/images/catalog/sweet-classics.webp'
  },
  mystery: {
    name: 'Mystery Box',
    slug: 'mystery-box',
    flavors: ['10 randomly selected flavors from our full range of 19'],
    price: 380, originalPrice: 690, count: 10,
    img: '/images/catalog/mystery-box.webp'
  }
};

function initBundles() {
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
      addBundleToCart(bundleKey);
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
          <span class="price-original">$${b.originalPrice.toFixed(2)}</span>
          <span class="price price-sale">$${b.price.toFixed(2)}</span>
          <span class="card-discount-badge" style="position:static;display:inline-block;transform:none;border-radius:6px;margin-left:8px;padding:4px 10px">${pctOff}% OFF</span>
        </div>
        <div class="detail-desc">
          <p><strong>Included flavors:</strong></p>
          <p>${b.flavors.join(' &middot; ')}</p>
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
          <div class="spec-row"><span class="spec-label">Shipping</span><span class="spec-val">Free Australia-wide</span></div>
        </div>
      </div>
    </div>`;

  const addBtn = document.getElementById('bundleDetailAddBtn');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      addBundleToCart(key);
    });
  }

  showPage('detailPage');
  if (window.injectIcons) window.injectIcons();
}

function addBundleToCart(bundleKey) {
  const b = BUNDLES[bundleKey];
  if (!b) return;

  // Add to cart via the Cart module directly (client-side)
  if (window.Cart) {
    window.Cart.addBundleItem(bundleKey, 'default', b);
  }
  showToast(`${b.name} added to cart!`);
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
  bundles: () => BUNDLES
};
