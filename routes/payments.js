const express = require('express');
const router = express.Router();
const { queryAll, queryOne, runSql, dbReady } = require('../database/init');
const plazpay = require('../services/plazpayGateway');

/**
 * Generate unique order number
 */
function generateOrderNumber() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substr(2, 5).toUpperCase();
  return `VR-${timestamp}-${random}`;
}

/**
 * GET /payment-info - Get PlazPay payment channels (SDK URLs)
 * Frontend needs the sdkUrl to redirect customers to PayPal
 */
router.get('/payment-info', async (req, res) => {
  try {
    const channels = await plazpay.getPaymentInfo();
    if (!channels || channels.length === 0) {
      return res.status(503).json({
        success: false,
        error: 'No payment channels available'
      });
    }

    // Return the first available channel's checkout URLs
    const channel = channels[0];
    res.json({
      success: true,
      payment: {
        accountVoucher: channel.accountVoucher,
        clientId: channel.clientId,
        sdkUrl: channel.sdkUrl,
        quickSdkUrl: channel.quickSdkUrl
      }
    });
  } catch (error) {
    console.error('Error fetching payment info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load payment options'
    });
  }
});

/**
 * POST /create-order - Create a PlazPay order and return redirect info
 * Called when customer clicks "Pay with PayPal" on the review step
 */
router.post('/create-order', async (req, res) => {
  try {
    await dbReady;

    const {
      cart_token,
      email,
      first_name,
      last_name,
      address_line1,
      address_line2,
      city,
      state,
      postal_code,
      country = 'AU',
      phone,
      account_voucher
    } = req.body;

    // Validate required fields
    if (!cart_token || !email || !first_name || !last_name || !address_line1 || !city || !state || !postal_code) {
      return res.status(422).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    // Step 1: Validate cart exists and has items
    const cart = queryOne('SELECT id FROM cart_sessions WHERE session_token = ?', [cart_token]);
    if (!cart) {
      return res.status(404).json({ success: false, error: 'Cart not found' });
    }

    const cartItems = queryAll(`
      SELECT ci.id, ci.product_id, ci.variant, ci.quantity, p.price, p.name
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      WHERE ci.session_id = ?
    `, [cart.id]);

    if (cartItems.length === 0) {
      return res.status(400).json({ success: false, error: 'Cart is empty' });
    }

    // Step 2: Calculate totals
    let subtotal = 0;
    cartItems.forEach(item => {
      subtotal += item.price * item.quantity;
    });
    const shipping = 0;
    const total = subtotal + shipping;

    // Step 3: Generate our order number and create PlazPay order
    const orderNumber = generateOrderNumber();

    // Get payment channel if not provided
    let voucher = account_voucher;
    if (!voucher) {
      const channels = await plazpay.getPaymentInfo();
      if (channels && channels.length > 0) {
        voucher = channels[0].accountVoucher;
      } else {
        return res.status(503).json({ success: false, error: 'No payment channels available' });
      }
    }

    // Map cart items for PlazPay — use generic product descriptions
    const plazpayItems = cartItems.map(item => ({
      name: item.name,
      quantity: item.quantity,
      unitAmount: {
        currencyCode: 'USD',
        value: item.price
      }
    }));

    // Map address for PlazPay
    const plazpayAddress = {
      addressLine1: address_line1,
      adminArea1: state,
      adminArea2: city,
      postalCode: postal_code,
      countryCode: country
    };

    const plazpayOrder = await plazpay.createOrder({
      requestId: orderNumber,
      accountVoucher: voucher,
      items: plazpayItems,
      address: plazpayAddress
    });

    // Step 4: Store pending order in database
    const orderResult = runSql(`
      INSERT INTO orders (
        order_number, email, first_name, last_name,
        address_line1, address_line2, city, state, postal_code, country, phone,
        subtotal, tax, shipping, total,
        processor_used, nmi_transaction_id, payment_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      orderNumber,
      email,
      first_name,
      last_name,
      address_line1,
      address_line2 || null,
      city,
      state,
      postal_code,
      country,
      phone || null,
      parseFloat(subtotal.toFixed(2)),
      0, // no tax for now
      shipping,
      parseFloat(total.toFixed(2)),
      'plazpay',
      plazpayOrder.orderId, // Store PlazPay order ID as transaction reference
      'pending'
    ]);

    const orderId = orderResult.lastId;

    // Create order items
    cartItems.forEach(item => {
      runSql(`
        INSERT INTO order_items (order_id, product_id, variant, quantity, unit_price)
        VALUES (?, ?, ?, ?, ?)
      `, [orderId, item.product_id, item.variant, item.quantity, item.price]);
    });

    // Return PlazPay order info — frontend will redirect to PayPal
    res.status(201).json({
      success: true,
      order: {
        order_number: orderNumber,
        total: parseFloat(total.toFixed(2)),
        status: 'pending'
      },
      plazpay: {
        orderId: plazpayOrder.orderId,
        channelOrderId: plazpayOrder.channelOrderId
      }
    });

  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create order'
    });
  }
});

/**
 * POST /capture-order - Capture (finalize) a PlazPay order after PayPal payment
 * Called after customer completes PayPal payment and returns to site
 */
router.post('/capture-order', async (req, res) => {
  try {
    await dbReady;

    const { plazpay_order_id, order_number } = req.body;

    if (!plazpay_order_id || !order_number) {
      return res.status(422).json({
        success: false,
        error: 'Missing order identifiers'
      });
    }

    // Capture the payment on PlazPay
    const captured = await plazpay.captureOrder(plazpay_order_id);

    if (captured) {
      // Update order status in our database
      runSql(`
        UPDATE orders SET payment_status = 'completed'
        WHERE order_number = ? AND nmi_transaction_id = ?
      `, [order_number, plazpay_order_id]);

      // Clear the cart
      const order = queryOne('SELECT id, email, total FROM orders WHERE order_number = ?', [order_number]);

      // Find and clear the cart by looking at the most recent cart session
      // (In production you'd associate cart_token with the order)

      res.json({
        success: true,
        order: {
          order_number: order_number,
          total: order ? order.total : 0,
          status: 'confirmed'
        }
      });
    } else {
      res.status(402).json({
        success: false,
        error: 'Payment capture failed'
      });
    }

  } catch (error) {
    console.error('Error capturing order:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to capture payment'
    });
  }
});

/**
 * POST /order-status - Check PlazPay order status
 */
router.post('/order-status', async (req, res) => {
  try {
    const { plazpay_order_id } = req.body;

    if (!plazpay_order_id) {
      return res.status(422).json({ success: false, error: 'Missing order ID' });
    }

    const detail = await plazpay.queryOrderDetail(plazpay_order_id);

    res.json({
      success: true,
      order: detail
    });

  } catch (error) {
    console.error('Error querying order status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to query order status'
    });
  }
});

module.exports = router;
