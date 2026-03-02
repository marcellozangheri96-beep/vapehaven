const express = require('express');
const router = express.Router();
const { queryAll, queryOne, dbReady } = require('../database/init');

/**
 * GET /:orderNumber - Lookup order by order number
 */
router.get('/:orderNumber', async (req, res) => {
  try {
    await dbReady;
    const { orderNumber } = req.params;

    // Get order
    const order = queryOne('SELECT * FROM orders WHERE order_number = ?', [orderNumber]);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // Get order items with product details
    const items = queryAll(`
      SELECT
        oi.id,
        oi.product_id,
        oi.variant,
        oi.quantity,
        oi.unit_price,
        p.name,
        p.slug
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
    `, [order.id]);

    res.json({
      success: true,
      data: {
        ...order,
        items: items
      }
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch order'
    });
  }
});

module.exports = router;
