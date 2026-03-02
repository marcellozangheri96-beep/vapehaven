const Checkout = (function() {
  let currentStep = 1;
  let cartItems = [];
  let cartToken = null;
  let shippingData = {};

  function init(items, token) {
    cartItems = items || window.Cart.getItems();
    cartToken = token || window.Cart.getToken();
    currentStep = 1;
    render();
  }

  function render() {
    const container = document.getElementById('checkoutContent');
    if (!container) return;

    container.innerHTML = `
      ${renderStepIndicator()}
      <div class="checkout-layout">
        <div class="checkout-main">
          ${currentStep === 1 ? renderShippingForm() : ''}
          ${currentStep === 2 ? renderPaymentForm() : ''}
          ${currentStep === 3 ? renderReviewStep() : ''}
          ${currentStep === 4 ? renderConfirmation() : ''}
        </div>
        ${currentStep < 4 ? renderOrderSummary() : ''}
      </div>
    `;

    attachEventListeners();
    if (window.injectIcons) window.injectIcons();
  }

  function renderStepIndicator() {
    // 4 steps: Shipping, Payment, Review, Confirmation
    // Show numbered circles with labels, connected by lines
    // Active step highlighted in teal, completed steps get checkmark
    const steps = ['Shipping', 'Payment', 'Review', 'Confirmation'];
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
    // Shipping info form with: email, first_name, last_name, address_line1, address_line2, city, state, postal_code, country (default AU), phone
    // Use form-group/form-input classes
    // Pre-fill from shippingData if going back
    // "Continue to Payment" button
    // "Back to Cart" link
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
          <button type="submit" class="btn btn-primary">Continue to Payment</button>
        </div>
      </form>
    </div>`;
  }

  function renderPaymentForm() {
    // Payment form: card_number, card_expiry, card_cvv
    // Show security badges (lock, shield icons)
    // Show accepted card logos
    // Note: "Payments processed securely via NMI Gateway"
    return `<div class="checkout-step-content">
      <h2>Payment Details</h2>
      <p class="checkout-step-desc">All transactions are secure and encrypted</p>
      <div class="payment-security">
        <span data-icon="shield" data-icon-size="18"></span>
        <span>Secured by NMI Gateway</span>
      </div>
      <form id="paymentForm" class="checkout-form">
        <div class="form-group">
          <label class="form-label">Card Number</label>
          <div class="card-input-wrap">
            <span class="card-input-icon" data-icon="creditCard" data-icon-size="18"></span>
            <input type="text" class="form-input card-number-input" name="card_number" placeholder="4111 1111 1111 1111" maxlength="19" required autocomplete="cc-number">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Expiry Date</label>
            <input type="text" class="form-input" name="card_expiry" placeholder="MM/YY" maxlength="5" required autocomplete="cc-exp">
          </div>
          <div class="form-group">
            <label class="form-label">CVV</label>
            <div class="card-input-wrap">
              <span class="card-input-icon" data-icon="lock" data-icon-size="16"></span>
              <input type="text" class="form-input" name="card_cvv" placeholder="123" maxlength="4" required autocomplete="cc-csc">
            </div>
          </div>
        </div>
        <div class="payment-badges">
          <div class="payment-badge"><span data-icon="lock" data-icon-size="14"></span> SSL Encrypted</div>
          <div class="payment-badge"><span data-icon="shield" data-icon-size="14"></span> PCI Compliant</div>
          <div class="payment-badge"><span data-icon="checkCircle" data-icon-size="14"></span> Secure Checkout</div>
        </div>
        <div class="checkout-nav">
          <button type="button" class="btn btn-ghost checkout-back-btn" data-step="1">Back to Shipping</button>
          <button type="submit" class="btn btn-primary">Review Order</button>
        </div>
      </form>
    </div>`;
  }

  function renderReviewStep() {
    // Show order summary, shipping address, items, totals
    // "Place Order" button
    const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    let itemsHtml = cartItems.map(item => {
      const imgSrc = item.variant === 'silver' && item.image_silver ? item.image_silver : item.image_black || item.image_silver;
      return `<div class="review-item">
        <img src="${imgSrc}" alt="${item.name}">
        <div class="review-item-info">
          <div class="review-item-name">${item.name}</div>
          <div class="review-item-variant">${item.variant} × ${item.quantity}</div>
        </div>
        <div class="review-item-price">$${(item.price * item.quantity).toFixed(2)}</div>
      </div>`;
    }).join('');

    return `<div class="checkout-step-content">
      <h2>Review Your Order</h2>
      <p class="checkout-step-desc">Please confirm everything looks good</p>

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
        <div class="review-total-row review-total-final"><span>Total</span><span>$${subtotal.toFixed(2)} AUD</span></div>
      </div>

      <div class="checkout-nav">
        <button type="button" class="btn btn-ghost checkout-back-btn" data-step="2">Back to Payment</button>
        <button type="button" class="btn btn-primary" id="placeOrderBtn">
          <span data-icon="lock" data-icon-size="16"></span> Place Order — $${subtotal.toFixed(2)}
        </button>
      </div>
    </div>`;
  }

  function renderConfirmation() {
    // This gets replaced with actual order data after API call
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
    // Sticky sidebar summary shown during steps 1-3
    const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

    return `<div class="checkout-summary">
      <h3>Order Summary</h3>
      <div class="checkout-summary-items">
        ${cartItems.map(item => {
          const imgSrc = item.variant === 'silver' && item.image_silver ? item.image_silver : item.image_black || item.image_silver;
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
        <div class="summary-total-row summary-total-final"><span>Total</span><span>$${subtotal.toFixed(2)} AUD</span></div>
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

  function validatePaymentForm(data) {
    const errors = [];

    const cardNumber = data.card_number.replace(/\s/g, '');
    if (!cardNumber || !/^\d{13,19}$/.test(cardNumber)) {
      errors.push('Please enter a valid card number');
    }
    if (!data.card_expiry || !/^\d{2}\/\d{2}$/.test(data.card_expiry)) {
      errors.push('Please enter expiry date in MM/YY format');
    } else {
      const [month, year] = data.card_expiry.split('/');
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear() % 100;
      const currentMonth = currentDate.getMonth() + 1;

      const expYear = parseInt(year);
      const expMonth = parseInt(month);

      if (expYear < currentYear || (expYear === currentYear && expMonth < currentMonth)) {
        errors.push('Card has expired');
      }
    }
    if (!data.card_cvv || !/^\d{3,4}$/.test(data.card_cvv)) {
      errors.push('Please enter a valid CVV');
    }

    return errors;
  }

  // ===== Card Number Formatting =====
  function formatCardNumber(value) {
    let v = value.replace(/\D/g, '').substring(0, 16);
    return v.replace(/(.{4})/g, '$1 ').trim();
  }

  // ===== Expiry Formatting =====
  function formatExpiry(value) {
    let v = value.replace(/\D/g, '').substring(0, 4);
    if (v.length >= 2) v = v.substring(0, 2) + '/' + v.substring(2);
    return v;
  }

  // ===== Form Handling =====
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

    // Payment form submit
    const paymentForm = document.getElementById('paymentForm');
    if (paymentForm) {
      paymentForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(paymentForm);
        const data = Object.fromEntries(formData);

        const errors = validatePaymentForm(data);
        if (errors.length > 0) {
          window.VH.showToast(errors[0], 'error');
          return;
        }

        shippingData = { ...shippingData, ...data };
        currentStep = 3;
        render();
      });

      // Card number formatting
      const cardInput = paymentForm.querySelector('[name="card_number"]');
      if (cardInput) {
        cardInput.addEventListener('input', (e) => {
          e.target.value = formatCardNumber(e.target.value);
        });
      }

      // Expiry formatting
      const expiryInput = paymentForm.querySelector('[name="card_expiry"]');
      if (expiryInput) {
        expiryInput.addEventListener('input', (e) => {
          e.target.value = formatExpiry(e.target.value);
        });
      }

      // CVV - only digits
      const cvvInput = paymentForm.querySelector('[name="card_cvv"]');
      if (cvvInput) {
        cvvInput.addEventListener('input', (e) => {
          e.target.value = e.target.value.replace(/\D/g, '').substring(0, 4);
        });
      }
    }

    // Place order button
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

  async function placeOrder() {
    const btn = document.getElementById('placeOrderBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="btn-spinner"></span> Processing...';
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
        card_number: shippingData.card_number.replace(/\s/g, ''),
        card_expiry: shippingData.card_expiry,
        card_cvv: shippingData.card_cvv
      };

      const result = await window.VH.api('/payments/checkout', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (result.success) {
        // Clear cart
        localStorage.removeItem('vh_cart_token');

        // Show confirmation
        currentStep = 4;
        render();

        // Fill in order details
        const details = document.getElementById('confirmationDetails');
        if (details) {
          details.innerHTML = `
            <div class="confirmation-order-number">
              <span class="conf-label">Order Number</span>
              <span class="conf-value">${result.order.order_number}</span>
            </div>
            <div class="confirmation-row">
              <span>Total Charged</span>
              <span>$${result.order.total.toFixed(2)} AUD</span>
            </div>
            <div class="confirmation-row">
              <span>Confirmation sent to</span>
              <span>${shippingData.email}</span>
            </div>
            <div class="confirmation-row">
              <span>Shipping to</span>
              <span>${shippingData.city}, ${shippingData.state} ${shippingData.postal_code}</span>
            </div>
            <p class="confirmation-note">You will receive an email confirmation shortly with your order details and tracking information.</p>
          `;
        }

        window.VH.showToast('Order placed successfully!', 'success');
      } else {
        throw new Error(result.error || 'Payment failed');
      }
    } catch (error) {
      window.VH.showToast(error.message || 'Payment failed. Please try again.', 'error');
      btn.disabled = false;
      btn.innerHTML = '<span data-icon="lock" data-icon-size="16"></span> Place Order';
      btn.classList.remove('btn-loading');
      if (window.injectIcons) window.injectIcons();
    }
  }

  return { init, render };
})();

window.Checkout = Checkout;
