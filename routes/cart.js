const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { queryAll, queryOne, runSql, dbReady } = require('../database/init');
const { validateCartItem, handleValidationErrors } = require('../middleware/validation');

/**
 * POST / - Create new cart session
 */
router.post('/', async (req, res) => {
  try {
    await dbReady;
    const token = uuidv4();

    const result = runSql('INSERT INTO cart_sessions (session_token) VALUES (?)', [token]);

    res.status(201).json({
      success: true,
      token: token,
      cartId: result.lastId
    });
  } catch (error) {
    console.error('Error creating cart:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create cart'
    });
  }
});

/**
 * GET /:token - Get cart with items and totals
 */
router.get('/:token', async (req, res) => {
  try {
    await dbReady;
    const { token } = req.params;

    // Get cart session
    const cart = queryOne('SELECT * FROM cart_sessions WHERE session_token = ?', [token]);

    if (!cart) {
      return res.status(404).json({
        success: false,
        error: 'Cart not found'
      });
    }

    // Get cart items with product details
    const items = queryAll(`
      SELECT
        ci.id,
        ci.product_id,
        ci.variant,
        ci.quantity,
        p.name,
        p.slug,
        p.price,
        p.image
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      WHERE ci.session_id = ?
    `, [cart.id]);

    // Calculate totals
    let subtotal = 0;
    items.forEach(item => {
      subtotal += item.price * item.quantity;
    });

    const tax = subtotal * 0.1; // 10% tax
    const shipping = 0; // Free shipping
    const total = subtotal + tax + shipping;
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

    res.json({
      items: items,
      subtotal: parseFloat(subtotal.toFixed(2)),
      itemCount: itemCount,
      tax: parseFloat(tax.toFixed(2)),
      shipping: shipping,
      total: parseFloat(total.toFixed(2))
    });
  } catch (error) {
    console.error('Error fetching cart:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch cart'
    });
  }
});

/**
 * POST /:token/items - Add item to cart
 */
router.post('/:token/items', validateCartItem, handleValidationErrors, async (req, res) => {
  try {
    await dbReady;
    const { token } = req.params;
    const { product_id, variant, quantity } = req.body;

    // Verify cart exists
    const cart = queryOne('SELECT id FROM cart_sessions WHERE session_token = ?', [token]);
    if (!cart) {
      return res.status(404).json({
        success: false,
        error: 'Cart not found'
      });
    }

    // Verify product exists
    const product = queryOne('SELECT id FROM products WHERE id = ?', [product_id]);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    // Insert or update item (handle duplicates by increasing quantity)
    runSql(`
      INSERT INTO cart_items (session_id, product_id, variant, quantity)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(session_id, product_id, variant) DO UPDATE SET
        quantity = quantity + excluded.quantity
    `, [cart.id, product_id, variant, quantity]);

    // Update cart timestamp
    runSql('UPDATE cart_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [cart.id]);

    res.status(201).json({
      success: true,
      message: 'Item added to cart'
    });
  } catch (error) {
    console.error('Error adding to cart:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add item to cart'
    });
  }
});

/**
 * PUT /:token/items/:itemId - Update item quantity (0 = remove)
 */
router.put('/:token/items/:itemId', async (req, res) => {
  try {
    await dbReady;
    const { token, itemId } = req.params;
    const { quantity } = req.body;

    // Verify cart exists
    const cart = queryOne('SELECT id FROM cart_sessions WHERE session_token = ?', [token]);
    if (!cart) {
      return res.status(404).json({
        success: false,
        error: 'Cart not found'
      });
    }

    // Verify item exists in cart
    const item = queryOne('SELECT id FROM cart_items WHERE id = ? AND session_id = ?', [itemId, cart.id]);
    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'Item not found in cart'
      });
    }

    // Remove item if quantity is 0, otherwise update
    if (quantity === 0) {
      runSql('DELETE FROM cart_items WHERE id = ?', [itemId]);
    } else {
      runSql('UPDATE cart_items SET quantity = ? WHERE id = ?', [quantity, itemId]);
    }

    // Update cart timestamp
    runSql('UPDATE cart_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [cart.id]);

    res.json({
      success: true,
      message: 'Item updated'
    });
  } catch (error) {
    console.error('Error updating cart item:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update cart item'
    });
  }
});

/**
 * DELETE /:token/items/:itemId - Remove specific item
 */
router.delete('/:token/items/:itemId', async (req, res) => {
  try {
    await dbReady;
    const { token, itemId } = req.params;

    // Verify cart exists
    const cart = queryOne('SELECT id FROM cart_sessions WHERE session_token = ?', [token]);
    if (!cart) {
      return res.status(404).json({
        success: false,
        error: 'Cart not found'
      });
    }

    // Verify item exists in cart
    const item = queryOne('SELECT id FROM cart_items WHERE id = ? AND session_id = ?', [itemId, cart.id]);
    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'Item not found in cart'
      });
    }

    runSql('DELETE FROM cart_items WHERE id = ?', [itemId]);

    // Update cart timestamp
    runSql('UPDATE cart_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [cart.id]);

    res.json({
      success: true,
      message: 'Item removed from cart'
    });
  } catch (error) {
    console.error('Error removing from cart:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove item from cart'
    });
  }
});

/**
 * DELETE /:token - Clear entire cart
 */
router.delete('/:token', async (req, res) => {
  try {
    await dbReady;
    const { token } = req.params;

    // Verify cart exists
    const cart = queryOne('SELECT id FROM cart_sessions WHERE session_token = ?', [token]);
    if (!cart) {
      return res.status(404).json({
        success: false,
        error: 'Cart not found'
      });
    }

    // Delete all items in cart
    runSql('DELETE FROM cart_items WHERE session_id = ?', [cart.id]);

    // Update cart timestamp
    runSql('UPDATE cart_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [cart.id]);

    res.json({
      success: true,
      message: 'Cart cleared'
    });
  } catch (error) {
    console.error('Error clearing cart:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear cart'
    });
  }
});

module.exports = router;
