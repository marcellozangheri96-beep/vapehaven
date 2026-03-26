const Checkout = (function() {
  let currentStep = 1;
  let cartItems = [];
  let cartToken = null;
  let shippingData = {};
  let paymentInfo = null; // PlazPay payment channel info
  let pendingOrder = null; // Stores order data after creation, before PayPal redirect

  function init(items, token) {
    cartItems = items || window.Cart.getItems();
    cartToken = token || window.Cart.getToken();
    currentStep = 1;
    pendingOrder = null;

    // Check if returning from PayPal payment
    const params = new URLSearchParams(window.location.search);
    if (params.get('plazpay_return') === 'true') {
      handlePayPalReturn(params);
      return;
    }

    // Preload PlazPay payment info
    loadPaymentInfo();
    render();
  }

  async function loadPaymentInfo() {
    try {
      const result = await window.VH.api('/payments/payment-info');
      if (result.success) {
        paymentInfo = result.payment;
      }
    } catch (error) {
      console.error('Failed to load payment info:', error);
    }
  }

  function render() {
    const container = document.getElementById('checkoutContent');
    if (!container) return;

    container.innerHTML = `
      ${renderStepIndicator()}
      <div class="checkout-layout">
        <div class="checkout-main">
          ${currentStep === 1 ? renderShippingForm() : ''}
          ${currentStep === 2 ? renderReviewStep() : ''}
          ${currentStep === 3 ? renderConfirmation() : ''}
        </div>
        ${currentStep < 3 ? renderOrderSummary() : ''}
      </div>
    `;

    attachEventListeners();
    if (window.injectIcons) window.injectIcons();
  }

  function renderStepIndicator() {
    const steps = ['Shipping', 'Review & Pay', 'Confirmation'];
    return `<div class="checkout-steps">
      ${steps.map((s, i) => `
        <div class="checkout-step ${i + 1 < currentStep ? 'completed' : ''} ${i + 1 === currentStep ? 'active' : ''}">
          <div class="step-circle">${i + 1 < currentStep ? '<span data-icon="checkCircle" data-icon-size="16"></span>' : i + 1}</div>
          <div class="step-label">${s}</div>
        </div>
        ${i < steps.length - 1 ? '<div class="step-line ' + (i + 1 < currentStep ? 'completed' : '') + '"></div>' : ''}
      `).join('')}
    </div>`;
  }

  function renderShippingForm() {
    return `<div class="checkout-step-content">
      <h2>Shipping Information</h2>
      <p class="checkout-step-desc">Where should we send your order?</p>
      <form id="shippingForm" class="checkout-form">
        <div class="form-group">
          <label class="form-label">Email Address</label>
          <input type="email" class="form-input" name="email" placeholder="you@example.com" value="${shippingData.email || ''}" required>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">First Name</label>
            <input type="text" class="form-input" name="first_name" placeholder="John" value="${shippingData.first_name || ''}" required>
          </div>
          <div class="form-group">
            <label class="form-label">Last Name</label>
            <input type="text" class="form-input" name="last_name" placeholder="Doe" value="${shippingData.last_name || ''}" required>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Address</label>
          <input type="text" class="form-input" name="address_line1" placeholder="123 Street Name" value="${shippingData.address_line1 || ''}" required>
        </div>
        <div class="form-group">
          <label class="form-label">Apartment, suite, etc. (optional)</label>
          <input type="text" class="form-input" name="address_line2" placeholder="Apt 4B" value="${shippingData.address_line2 || ''}">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">City</label>
            <input type="text" class="form-input" name="city" placeholder="Sydney" value="${shippingData.city || ''}" required>
          </div>
          <div class="form-group">
            <label class="form-label">State</label>
            <select class="form-input" name="state" required>
              <option value="">Select...</option>
              <option value="NSW" ${shippingData.state === 'NSW' ? 'selected' : ''}>NSW</option>
              <option value="VIC" ${shippingData.state === 'VIC' ? 'selected' : ''}>VIC</option>
              <option value="QLD" ${shippingData.state === 'QLD' ? 'selected' : ''}>QLD</option>
              <option value="WA" ${shippingData.state === 'WA' ? 'selected' : ''}>WA</option>
              <option value="SA" ${shippingData.state === 'SA' ? 'selected' : ''}>SA</option>
              <option value="TAS" ${shippingData.state === 'TAS' ? 'selected' : ''}>TAS</option>
              <option value="ACT" ${shippingData.state === 'ACT' ? 'selected' : ''}>ACT</option>
              <option value="NT" ${shippingData.state === 'NT' ? 'selected' : ''}>NT</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Postal Code</label>
            <input type="text" class="form-input" name="postal_code" placeholder="2000" value="${shippingData.postal_code || ''}" required>
          </div>
          <div class="form-group">
            <label class="form-label">Phone (optional)</label>
            <input type="tel" class="form-input" name="phone" placeholder="+61 400 000 000" value="${shippingData.phone || ''}">
          </div>
        </div>
        <input type="hidden" name="country" value="AU">
        <div class="checkout-nav">
          <button type="button" class="btn btn-ghost checkout-back-btn" onclick="window.Cart.openDrawer(); window.VH.goHome();">Back to Cart</button>
          <button type="submit" class="btn btn-primary">Continue to Review</button>
        </div>
      </form>
    </div>`;
  }

  function renderReviewStep() {
    const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    let itemsHtml = cartItems.map(item => {
      const imgSrc = item.image;
      return `<div class="review-item">
        <img src="${imgSrc}" alt="${item.name}">
        <div class="review-item-info">
          <div class="review-item-name">${item.name}</div>
          <div class="review-item-variant">× ${item.quantity}</div>
        </div>
        <div class="review-item-price">$${(item.price * item.quantity).toFixed(2)}</div>
      </div>`;
    }).join('');

    return `<div class="checkout-step-content">
      <h2>Review Your Order</h2>
      <p class="checkout-step-desc">Please confirm everything looks good, then pay with PayPal</p>

      <div class="review-section">
        <div class="review-section-header">
          <h3>Shipping Address</h3>
          <button type="button" class="review-edit-btn" data-step="1">Edit</button>
        </div>
        <p>${shippingData.first_name} ${shippingData.last_name}<br>
        ${shippingData.address_line1}${shippingData.address_line2 ? ', ' + shippingData.address_line2 : ''}<br>
        ${shippingData.city}, ${shippingData.state} ${shippingData.postal_code}<br>
        ${shippingData.email}</p>
      </div>

      <div class="review-section">
        <div class="review-section-header">
          <h3>Items (${cartItems.reduce((s,i)=>s+i.quantity,0)})</h3>
        </div>
        <div class="review-items">${itemsHtml}</div>
      </div>

      <div class="review-totals">
        <div class="review-total-row"><span>Subtotal</span><span>$${subtotal.toFixed(2)}</span></div>
        <div class="review-total-row"><span>Shipping</span><span>Free</span></div>
        <div class="review-total-row review-total-final"><span>Total</span><span>$${subtotal.toFixed(2)}</span></div>
      </div>

      <div class="payment-section">
        <div class="payment-security">
          <span data-icon="shield" data-icon-size="18"></span>
          <span>Secure payment via PayPal</span>
        </div>
        <div class="payment-badges">
          <div class="payment-badge"><span data-icon="lock" data-icon-size="14"></span> SSL Encrypted</div>
          <div class="payment-badge"><span data-icon="shield" data-icon-size="14"></span> Buyer Protection</div>
          <div class="payment-badge"><span data-icon="checkCircle" data-icon-size="14"></span> Secure Checkout</div>
        </div>
      </div>

      <div class="checkout-nav">
        <button type="button" class="btn btn-ghost checkout-back-btn" data-step="1">Back to Shipping</button>
        <button type="button" class="btn btn-primary btn-paypal" id="placeOrderBtn">
          <svg class="paypal-icon" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c1.652 4.142-1.024 7.26-5.882 7.26h-2.19c-1.049 0-1.937.764-2.1 1.8l-1.12 7.106a.641.641 0 0 0 .633.74h3.472c.524 0 .968-.382 1.05-.9l.86-5.452c.082-.518.526-.9 1.05-.9h.663c4.298 0 7.664-1.747 8.647-6.797.364-1.87.144-3.397-.476-4.316z"/>
          </svg>
          Pay with PayPal — $${subtotal.toFixed(2)}
        </button>
      </div>
    </div>`;
  }

  function renderConfirmation() {
    return `<div class="checkout-step-content checkout-confirmation">
      <div class="confirmation-icon">
        <span data-icon="checkCircle" data-icon-size="64"></span>
      </div>
      <h2>Order Confirmed!</h2>
      <p class="checkout-step-desc">Thank you for your purchase</p>
      <div class="confirmation-details" id="confirmationDetails">
        <!-- Filled after successful order -->
      </div>
      <button type="button" class="btn btn-primary" onclick="window.VH.goHome()">Continue Shopping</button>
    </div>`;
  }

  function renderOrderSummary() {
    const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

    return `<div class="checkout-summary">
      <h3>Order Summary</h3>
      <div class="checkout-summary-items">
        ${cartItems.map(item => {
          const imgSrc = item.image;
          return `<div class="summary-item">
            <div class="summary-item-img"><img src="${imgSrc}" alt="${item.name}"><span class="summary-item-qty">${item.quantity}</span></div>
            <div class="summary-item-name">${item.name}<br><small>${item.variant}</small></div>
            <div class="summary-item-price">$${(item.price * item.quantity).toFixed(2)}</div>
          </div>`;
        }).join('')}
      </div>
      <div class="checkout-summary-totals">
        <div class="summary-total-row"><span>Subtotal (${itemCount} items)</span><span>$${subtotal.toFixed(2)}</span></div>
        <div class="summary-total-row"><span>Shipping</span><span>Free</span></div>
        <div class="summary-total-row summary-total-final"><span>Total</span><span>$${subtotal.toFixed(2)}</span></div>
      </div>
    </div>`;
  }

  // ===== Form Validation =====
  function validateShippingForm(data) {
    const errors = [];
    if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.push('Please enter a valid email address');
    }
    if (!data.first_name || data.first_name.trim().length === 0) {
      errors.push('First name is required');
    }
    if (!data.last_name || data.last_name.trim().length === 0) {
      errors.push('Last name is required');
    }
    if (!data.address_line1 || data.address_line1.trim().length === 0) {
      errors.push('Address is required');
    }
    if (!data.city || data.city.trim().length === 0) {
      errors.push('City is required');
    }
    if (!data.state || data.state.trim().length === 0) {
      errors.push('State is required');
    }
    if (!data.postal_code || data.postal_code.trim().length === 0) {
      errors.push('Postal code is required');
    }
    if (data.postal_code && !/^\d{4}$/.test(data.postal_code)) {
      errors.push('Postal code must be 4 digits');
    }
    return errors;
  }

  // ===== Event Listeners =====
  function attachEventListeners() {
    // Shipping form submit
    const shippingForm = document.getElementById('shippingForm');
    if (shippingForm) {
      shippingForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(shippingForm);
        const data = Object.fromEntries(formData);

        const errors = validateShippingForm(data);
        if (errors.length > 0) {
          window.VH.showToast(errors[0], 'error');
          return;
        }

        shippingData = data;
        currentStep = 2;
        render();
      });
    }

    // Place order / Pay with PayPal button
    const placeOrderBtn = document.getElementById('placeOrderBtn');
    if (placeOrderBtn) {
      placeOrderBtn.addEventListener('click', placeOrder);
    }

    // Back buttons
    document.querySelectorAll('.checkout-back-btn[data-step]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        currentStep = parseInt(btn.dataset.step);
        render();
      });
    });

    // Edit buttons on review
    document.querySelectorAll('.review-edit-btn[data-step]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        currentStep = parseInt(btn.dataset.step);
        render();
      });
    });
  }

  // ===== Place Order (Create PlazPay order + redirect to PayPal) =====
  async function placeOrder() {
    const btn = document.getElementById('placeOrderBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="btn-spinner"></span> Creating order...';
    btn.classList.add('btn-loading');

    try {
      const payload = {
        cart_token: cartToken,
        email: shippingData.email,
        first_name: shippingData.first_name,
        last_name: shippingData.last_name,
        address_line1: shippingData.address_line1,
        address_line2: shippingData.address_line2 || '',
        city: shippingData.city,
        state: shippingData.state,
        postal_code: shippingData.postal_code,
        country: shippingData.country || 'AU',
        phone: shippingData.phone || '',
        account_voucher: paymentInfo ? paymentInfo.accountVoucher : null
      };

      const result = await window.VH.api('/payments/create-order', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (result.success) {
        // Store pending order info for when customer returns from PayPal
        pendingOrder = {
          orderNumber: result.order.order_number,
          total: result.order.total,
          plazpayOrderId: result.plazpay.orderId,
          channelOrderId: result.plazpay.channelOrderId
        };

        // Save to sessionStorage so we can recover after redirect
        sessionStorage.setItem('vaperoo_pending_order', JSON.stringify(pendingOrder));
        sessionStorage.setItem('vaperoo_shipping', JSON.stringify(shippingData));

        // Redirect to PlazPay's PayPal checkout
        if (paymentInfo && paymentInfo.sdkUrl) {
          // The SDK URL is the PayPal checkout page hosted by PlazPay
          // Append our order ID and return URL as query params
          const returnUrl = encodeURIComponent(window.location.origin + '/?plazpay_return=true');
          const sdkUrl = `${paymentInfo.sdkUrl}?orderId=${pendingOrder.plazpayOrderId}&returnUrl=${returnUrl}`;

          window.VH.showToast('Redirecting to PayPal...', 'info');

          setTimeout(() => {
            window.location.href = sdkUrl;
          }, 500);
        } else {
          // Fallback: if no SDK URL, try to capture immediately (for testing)
          await captureAndConfirm();
        }
      } else {
        throw new Error(result.error || 'Failed to create order');
      }
    } catch (error) {
      window.VH.showToast(error.message || 'Failed to process order. Please try again.', 'error');
      btn.disabled = false;
      btn.innerHTML = `<svg class="paypal-icon" viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c1.652 4.142-1.024 7.26-5.882 7.26h-2.19c-1.049 0-1.937.764-2.1 1.8l-1.12 7.106a.641.641 0 0 0 .633.74h3.472c.524 0 .968-.382 1.05-.9l.86-5.452c.082-.518.526-.9 1.05-.9h.663c4.298 0 7.664-1.747 8.647-6.797.364-1.87.144-3.397-.476-4.316z"/></svg> Pay with PayPal`;
      btn.classList.remove('btn-loading');
      if (window.injectIcons) window.injectIcons();
    }
  }

  // ===== Handle return from PayPal =====
  async function handlePayPalReturn(params) {
    // Recover pending order from sessionStorage
    const savedOrder = sessionStorage.getItem('vaperoo_pending_order');
    const savedShipping = sessionStorage.getItem('vaperoo_shipping');

    if (savedOrder) {
      pendingOrder = JSON.parse(savedOrder);
    }
    if (savedShipping) {
      shippingData = JSON.parse(savedShipping);
    }

    if (!pendingOrder) {
      window.VH.showToast('Order information not found', 'error');
      window.VH.goHome();
      return;
    }

    // Clean up URL (remove query params)
    window.history.replaceState({}, '', window.location.pathname);

    // Show a loading state
    const container = document.getElementById('checkoutContent');
    if (container) {
      container.innerHTML = `
        <div class="checkout-step-content checkout-confirmation" style="text-align:center;padding:60px 20px">
          <div class="btn-spinner" style="width:48px;height:48px;margin:0 auto 24px"></div>
          <h2>Completing your payment...</h2>
          <p class="checkout-step-desc">Please wait while we confirm your order</p>
        </div>
      `;
    }

    // Capture the order
    await captureAndConfirm();
  }

  // ===== Capture order and show confirmation =====
  async function captureAndConfirm() {
    try {
      const captureResult = await window.VH.api('/payments/capture-order', {
        method: 'POST',
        body: JSON.stringify({
          plazpay_order_id: pendingOrder.plazpayOrderId,
          order_number: pendingOrder.orderNumber
        })
      });

      if (captureResult.success) {
        // Clear cart and session data
        localStorage.removeItem('vh_cart_token');
        sessionStorage.removeItem('vaperoo_pending_order');
        sessionStorage.removeItem('vaperoo_shipping');

        // Show confirmation
        currentStep = 3;
        render();

        // Fill in order details
        const details = document.getElementById('confirmationDetails');
        if (details) {
          details.innerHTML = `
            <div class="confirmation-order-number">
              <span class="conf-label">Order Number</span>
              <span class="conf-value">${pendingOrder.orderNumber}</span>
            </div>
            <div class="confirmation-row">
              <span>Total Charged</span>
              <span>$${pendingOrder.total.toFixed(2)}</span>
            </div>
            <div class="confirmation-row">
              <span>Confirmation sent to</span>
              <span>${shippingData.email || ''}</span>
            </div>
            <div class="confirmation-row">
              <span>Shipping to</span>
              <span>${shippingData.city || ''}, ${shippingData.state || ''} ${shippingData.postal_code || ''}</span>
            </div>
            <div class="confirmation-row">
              <span>Payment Method</span>
              <span>PayPal</span>
            </div>
            <p class="confirmation-note">You will receive an email confirmation shortly with your order details and tracking information.</p>
          `;
        }

        window.VH.showToast('Order placed successfully!', 'success');
      } else {
        throw new Error(captureResult.error || 'Payment capture failed');
      }
    } catch (error) {
      window.VH.showToast(error.message || 'Payment confirmation failed. Please contact support.', 'error');

      // Show error state
      const container = document.getElementById('checkoutContent');
      if (container) {
        container.innerHTML = `
          <div class="checkout-step-content checkout-confirmation" style="text-align:center;padding:60px 20px">
            <div style="font-size:64px;margin-bottom:16px">⚠️</div>
            <h2>Payment Issue</h2>
            <p class="checkout-step-desc">There was a problem confirming your payment. Your order number is <strong>${pendingOrder ? pendingOrder.orderNumber : 'N/A'}</strong>.</p>
            <p class="confirmation-note">Please contact our support team with your order number and we'll resolve this for you.</p>
            <button type="button" class="btn btn-primary" onclick="window.VH.goHome()" style="margin-top:24px">Return Home</button>
          </div>
        `;
      }
    }
  }

  return { init, render };
})();

window.Checkout = Checkout;
