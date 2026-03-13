/**
 * Vaperoo Cart Module
 * Manages shopping cart state, backend API sync, and cart drawer UI
 */

const Cart = (function() {
  let cartToken = localStorage.getItem('vh_cart_token') || null;
  let cartItems = [];
  let isDrawerOpen = false;

  // ===== API Communication =====

  /**
   * Ensures a cart session exists, creates one if needed
   */
  async function ensureSession() {
    if (!cartToken) {
      try {
        const res = await window.VH.api('/cart', { method: 'POST' });
        cartToken = res.token;
        localStorage.setItem('vh_cart_token', cartToken);
      } catch (e) {
        console.error('Failed to create cart session:', e);
        window.VH.showToast('Error creating cart session', 'error');
        throw e;
      }
    }
    return cartToken;
  }

  /**
   * Fetches current cart contents from backend
   */
  async function fetchCart() {
    if (!cartToken) return;
    try {
      const data = await window.VH.api(`/cart/${cartToken}`);
      cartItems = data.items || [];
      updateBadge();
      if (isDrawerOpen) renderDrawerItems();
    } catch (e) {
      console.error('Failed to fetch cart:', e);
      // Cart session expired, create new one
      cartToken = null;
      localStorage.removeItem('vh_cart_token');
      cartItems = [];
      updateBadge();
    }
  }

  /**
   * Adds an item to the cart
   * @param {number} productId - Product ID
   * @param {string} variant - Variant (black/silver), default 'black'
   * @param {number} quantity - Quantity to add, default 1
   */
  async function addItem(productId, variant = 'black', quantity = 1) {
    try {
      await ensureSession();
      await window.VH.api(`/cart/${cartToken}/items`, {
        method: 'POST',
        body: JSON.stringify({ product_id: productId, variant, quantity })
      });
      await fetchCart();
      openDrawer();
      window.VH.showToast('Added to cart!', 'success');
    } catch (e) {
      console.error('Failed to add item to cart:', e);
      window.VH.showToast('Could not add item to cart', 'error');
    }
  }

  /**
   * Updates quantity of an item in cart
   * @param {number} itemId - Cart item ID
   * @param {number} quantity - New quantity
   */
  async function updateQuantity(itemId, quantity) {
    try {
      if (quantity <= 0) {
        await removeItem(itemId);
        return;
      }
      await window.VH.api(`/cart/${cartToken}/items/${itemId}`, {
        method: 'PUT',
        body: JSON.stringify({ quantity })
      });
      await fetchCart();
    } catch (e) {
      console.error('Failed to update quantity:', e);
      window.VH.showToast('Could not update quantity', 'error');
      // Revert to current state
      await fetchCart();
    }
  }

  /**
   * Removes an item from the cart
   * @param {number} itemId - Cart item ID
   */
  async function removeItem(itemId) {
    try {
      await window.VH.api(`/cart/${cartToken}/items/${itemId}`, {
        method: 'DELETE'
      });
      await fetchCart();
      window.VH.showToast('Removed from cart', 'success');
    } catch (e) {
      console.error('Failed to remove item:', e);
      window.VH.showToast('Could not remove item', 'error');
      // Revert to current state
      await fetchCart();
    }
  }

  // ===== Badge =====

  /**
   * Updates the cart badge count in navigation
   */
  function updateBadge() {
    const badge = document.querySelector('.nav-bag-count');
    const total = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    if (badge) {
      badge.textContent = total;
      badge.style.display = total > 0 ? 'flex' : 'none';
    }
  }

  // ===== Cart Drawer =====

  /**
   * Opens the cart drawer with smooth animation
   */
  function openDrawer() {
    if (isDrawerOpen) return; // Already open
    isDrawerOpen = true;
    renderDrawer();
    // Add open class after a frame for CSS animation
    requestAnimationFrame(() => {
      const drawer = document.querySelector('.cart-drawer');
      const overlay = document.querySelector('.cart-overlay');
      if (drawer) drawer.classList.add('open');
      if (overlay) overlay.classList.add('open');
      document.body.style.overflow = 'hidden';
    });
  }

  /**
   * Closes the cart drawer with smooth animation
   */
  function closeDrawer() {
    isDrawerOpen = false;
    const drawer = document.querySelector('.cart-drawer');
    const overlay = document.querySelector('.cart-overlay');
    if (drawer) drawer.classList.remove('open');
    if (overlay) overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  /**
   * Creates/renders the cart drawer UI
   */
  function renderDrawer() {
    let drawer = document.querySelector('.cart-drawer');
    let overlay = document.querySelector('.cart-overlay');

    // Create drawer if it doesn't exist
    if (!drawer) {
      // Create overlay
      overlay = document.createElement('div');
      overlay.className = 'cart-overlay';
      overlay.addEventListener('click', closeDrawer);
      document.body.appendChild(overlay);

      // Create drawer container
      drawer = document.createElement('div');
      drawer.className = 'cart-drawer';
      drawer.setAttribute('role', 'dialog');
      drawer.setAttribute('aria-label', 'Shopping cart');
      drawer.innerHTML = `
        <div class="cart-drawer-header">
          <h2>Your Cart</h2>
          <span class="cart-drawer-count">(0 items)</span>
          <button class="cart-drawer-close" data-icon="close" data-icon-size="20" aria-label="Close cart"></button>
        </div>
        <div class="cart-drawer-items"></div>
        <div class="cart-drawer-footer">
          <div class="cart-totals">
            <div class="cart-total-row">
              <span>Subtotal</span>
              <span class="cart-subtotal">$0.00</span>
            </div>
            <div class="cart-total-row">
              <span>Shipping</span>
              <span class="cart-shipping-cost">Free</span>
            </div>
            <div class="cart-total-row cart-total-final">
              <span>Total</span>
              <span class="cart-total">$0.00</span>
            </div>
          </div>
          <button class="btn btn-primary cart-checkout-btn" style="width:100%">
            Proceed to Checkout
          </button>
        </div>
      `;
      document.body.appendChild(drawer);

      // Attach header close button listener
      drawer.querySelector('.cart-drawer-close').addEventListener('click', closeDrawer);

      // Attach checkout button listener
      drawer.querySelector('.cart-checkout-btn').addEventListener('click', () => {
        closeDrawer();
        window.VH.showPage('checkoutPage');
        if (window.Checkout) {
          window.Checkout.init(cartItems, cartToken);
        }
      });

      // Inject icons if available
      if (window.injectIcons) {
        window.injectIcons();
      }
    }

    renderDrawerItems();
  }

  /**
   * Renders cart items in the drawer
   */
  function renderDrawerItems() {
    const container = document.querySelector('.cart-drawer-items');
    if (!container) return;

    // Update item count in header
    const countEl = document.querySelector('.cart-drawer-count');
    const totalItems = cartItems.reduce((sum, i) => sum + i.quantity, 0) + bundleItems.reduce((s, b) => s + b.qty, 0);
    if (countEl) {
      countEl.textContent = `(${totalItems} item${totalItems !== 1 ? 's' : ''})`;
    }

    // Handle empty cart
    if (cartItems.length === 0 && bundleItems.length === 0) {
      container.innerHTML = `
        <div class="cart-empty">
          <div class="cart-empty-icon" data-icon="bag" data-icon-size="48"></div>
          <p>Your cart is empty</p>
          <button class="btn btn-ghost cart-continue-shopping">Continue Shopping</button>
        </div>
      `;
      container.querySelector('.cart-continue-shopping')?.addEventListener('click', closeDrawer);

      // Hide footer when empty
      const footer = document.querySelector('.cart-drawer-footer');
      if (footer) footer.style.display = 'none';

      if (window.injectIcons) window.injectIcons();
      return;
    }

    // Show footer when items exist
    const footer = document.querySelector('.cart-drawer-footer');
    if (footer) footer.style.display = '';

    // Build items HTML
    let html = '';
    for (const item of cartItems) {
      // Select appropriate image based on variant
      const imgSrc = item.variant === 'silver' && item.image_silver
        ? item.image_silver
        : item.image_black || item.image_silver;

      // Format variant display (Silver/Black)
      const variantDisplay = item.variant.charAt(0).toUpperCase() + item.variant.slice(1);

      // Calculate item total price
      const itemTotal = (item.price * item.quantity).toFixed(2);

      html += `
        <div class="cart-item" data-item-id="${item.id}">
          <div class="cart-item-img">
            <img src="${imgSrc}" alt="${item.name}" loading="lazy">
          </div>
          <div class="cart-item-info">
            <div class="cart-item-name">${item.name}</div>
            <div class="cart-item-variant">${variantDisplay}</div>
            <div class="cart-item-bottom">
              <div class="qty-controls">
                <button class="qty-btn qty-minus" data-item-id="${item.id}" data-action="decrease" aria-label="Decrease quantity">
                  <span data-icon="minus" data-icon-size="14"></span>
                </button>
                <span class="qty-value">${item.quantity}</span>
                <button class="qty-btn qty-plus" data-item-id="${item.id}" data-action="increase" aria-label="Increase quantity">
                  <span data-icon="plus" data-icon-size="14"></span>
                </button>
              </div>
              <span class="cart-item-price">$${itemTotal}</span>
            </div>
          </div>
          <button class="cart-item-remove" data-item-id="${item.id}" data-action="remove" aria-label="Remove from cart">
            <span data-icon="trash" data-icon-size="16"></span>
          </button>
        </div>
      `;
    }
    // Render bundle items
    for (const b of bundleItems) {
      const bTotal = (b.price * b.qty).toFixed(2);
      const colorLabel = b.color.charAt(0).toUpperCase() + b.color.slice(1);
      html += `
        <div class="cart-item cart-item-bundle" data-bundle-key="${b.key}" data-bundle-color="${b.color}">
          <div class="cart-item-img">
            <img src="${b.img}" alt="${b.name}" loading="lazy">
          </div>
          <div class="cart-item-info">
            <div class="cart-item-name">${b.name}</div>
            <div class="cart-item-variant">${colorLabel} &middot; ${b.count} devices</div>
            <div class="cart-item-bottom">
              <span class="cart-item-qty">Qty: ${b.qty}</span>
              <span class="cart-item-price">$${bTotal}</span>
            </div>
          </div>
          <button class="cart-item-remove" data-bundle-remove="${b.key}" data-bundle-color="${b.color}" aria-label="Remove bundle">
            <span data-icon="trash" data-icon-size="16"></span>
          </button>
        </div>
      `;
    }

    container.innerHTML = html;

    // Update totals (including bundles)
    const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
      + bundleItems.reduce((sum, b) => sum + (b.price * b.qty), 0);
    const subtotalEl = document.querySelector('.cart-subtotal');
    const totalEl = document.querySelector('.cart-total');
    if (subtotalEl) subtotalEl.textContent = `$${subtotal.toFixed(2)}`;
    if (totalEl) totalEl.textContent = `$${subtotal.toFixed(2)}`;

    // Attach event listeners for quantity controls and remove button
    container.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        const itemId = parseInt(btn.dataset.itemId, 10);
        const item = cartItems.find(i => i.id === itemId);
        if (!item) return;

        const action = btn.dataset.action;

        if (action === 'increase') {
          await updateQuantity(itemId, item.quantity + 1);
        } else if (action === 'decrease') {
          await updateQuantity(itemId, item.quantity - 1);
        } else if (action === 'remove') {
          await removeItem(itemId);
        }
      });
    });

    // Bundle remove buttons
    container.querySelectorAll('[data-bundle-remove]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        removeBundleItem(btn.dataset.bundleRemove, btn.dataset.bundleColor);
      });
    });

    // Inject icons if available
    if (window.injectIcons) {
      window.injectIcons();
    }
  }

  // ===== Initialize =====

  /**
   * Initializes the cart module
   */
  function init() {
    fetchCart();
  }

  // ===== Bundle items (client-side storage) =====
  let bundleItems = JSON.parse(localStorage.getItem('vh_bundles') || '[]');

  function saveBundles() {
    localStorage.setItem('vh_bundles', JSON.stringify(bundleItems));
    updateCartCount();
    renderDrawer();
  }

  function addBundleItem(bundleKey, color, bundle) {
    const existing = bundleItems.find(b => b.key === bundleKey && b.color === color);
    if (existing) {
      existing.qty += 1;
    } else {
      bundleItems.push({
        key: bundleKey, color, qty: 1,
        name: bundle.name, price: bundle.price,
        originalPrice: bundle.originalPrice,
        count: bundle.count, img: bundle.img
      });
    }
    saveBundles();
    openDrawer();
  }

  function removeBundleItem(bundleKey, color) {
    bundleItems = bundleItems.filter(b => !(b.key === bundleKey && b.color === color));
    saveBundles();
  }

  function getBundleTotal() {
    return bundleItems.reduce((sum, b) => sum + b.price * b.qty, 0);
  }

  function getBundleCount() {
    return bundleItems.reduce((sum, b) => sum + b.qty, 0);
  }

  // Override updateCartCount to include bundles
  const _origUpdateCount = updateCartCount;
  function updateCartCountWithBundles() {
    const totalCount = cartItems.reduce((s, i) => s + i.quantity, 0) + getBundleCount();
    const badge = document.querySelector('.cart-count');
    if (badge) {
      badge.textContent = totalCount;
      badge.style.display = totalCount > 0 ? 'flex' : 'none';
    }
  }
  // Replace the original
  updateCartCount = updateCartCountWithBundles;

  // Public API
  return {
    init,
    addItem,
    addBundleItem,
    removeBundleItem,
    updateQuantity,
    removeItem,
    openDrawer,
    closeDrawer,
    fetchCart,
    getItems: () => [...cartItems],
    getBundleItems: () => [...bundleItems],
    getToken: () => cartToken,
    getTotal: () => cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0) + getBundleTotal(),
    getItemCount: () => cartItems.reduce((sum, item) => sum + item.quantity, 0) + getBundleCount()
  };
})();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    Cart.init();
  });
} else {
  // DOM already loaded
  Cart.init();
}

// Expose to global scope
window.Cart = Cart;
