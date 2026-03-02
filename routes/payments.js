const express = require('express');
const router = express.Router();
const { queryAll, queryOne, runSql, dbReady } = require('../database/init');
const { validateCheckout, handleValidationErrors } = require('../middleware/validation');
const nmiGateway = require('../services/nmiGateway');

/**
 * Generate unique order number
 */
function generateOrderNumber() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substr(2, 5).toUpperCase();
  return `VH-${timestamp}-${random}`;
}

/**
 * POST /checkout - Main checkout endpoint
 */
router.post('/checkout', validateCheckout, handleValidationErrors, async (req, res) => {
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
      card_number,
      card_expiry,
      card_cvv
    } = req.body;

    // Step 1: Validate cart exists and has items
    const cart = queryOne('SELECT id FROM cart_sessions WHERE session_token = ?', [cart_token]);

    if (!cart) {
      return res.status(404).json({
        success: false,
        error: 'Cart not found'
      });
    }

    const cartItems = queryAll(`
      SELECT ci.id, ci.product_id, ci.variant, ci.quantity, p.price
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      WHERE ci.session_id = ?
    `, [cart.id]);

    if (cartItems.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Cart is empty'
      });
    }

    // Step 2: Calculate totals from cart items
    let subtotal = 0;
    cartItems.forEach(item => {
      subtotal += item.price * item.quantity;
    });

    const tax = subtotal * 0.1; // 10% tax
    const shipping = 0; // Free shipping
    const total = subtotal + tax + shipping;

    // Step 3: Call NMI Gateway service to process payment
    const orderNumber = generateOrderNumber();

    const paymentResult = await nmiGateway.processPayment({
      cardNumber: card_number,
      cardExp: card_expiry,
      cardCvv: card_cvv,
      amount: total,
      email: email,
      firstName: first_name,
      lastName: last_name,
      address1: address_line1,
      address2: address_line2,
      city: city,
      state: state,
      postalCode: postal_code,
      country: country,
      phone: phone,
      orderId: orderNumber,
      productCategory: 'vape',
      customerIp: req.ip || req.connection.remoteAddress
    });

    // Step 4a: If payment succeeds - create order, order items, clear cart
    if (paymentResult.success) {
      // Create order record
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
        parseFloat(tax.toFixed(2)),
        shipping,
        parseFloat(total.toFixed(2)),
        paymentResult.processor,
        paymentResult.transactionId,
        'completed'
      ]);

      const orderId = orderResult.lastId;

      // Create order items
      cartItems.forEach(item => {
        runSql(`
          INSERT INTO order_items (order_id, product_id, variant, quantity, unit_price)
          VALUES (?, ?, ?, ?, ?)
        `, [
          orderId,
          item.product_id,
          item.variant,
          item.quantity,
          item.price
        ]);
      });

      // Clear cart
      runSql('DELETE FROM cart_items WHERE session_id = ?', [cart.id]);

      res.status(201).json({
        success: true,
        order: {
          order_number: orderNumber,
          total: parseFloat(total.toFixed(2)),
          status: 'confirmed'
        },
        transaction: {
          id: paymentResult.transactionId,
          processor: paymentResult.processorName
        }
      });
    } else {
      // Step 4b: If payment fails - return error
      res.status(402).json({
        success: false,
        error: 'Payment processing failed',
        details: paymentResult.error
      });
    }
  } catch (error) {
    console.error('Error processing checkout:', error);
    res.status(500).json({
      success: false,
      error: 'Checkout failed due to server error'
    });
  }
});

module.exports = router;
