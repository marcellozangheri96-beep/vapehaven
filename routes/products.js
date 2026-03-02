const express = require('express');
const router = express.Router();
const { queryAll, queryOne, dbReady } = require('../database/init');

/**
 * GET / - List all products with optional category filter
 */
router.get('/', async (req, res) => {
  try {
    await dbReady;
    const category = req.query.category;

    let query = 'SELECT * FROM products';
    const params = [];

    if (category) {
      query += ' WHERE category = ?';
      params.push(category);
    }

    const products = queryAll(query, params);

    res.json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch products'
    });
  }
});

/**
 * GET /:slug - Get single product by slug
 */
router.get('/:slug', async (req, res) => {
  try {
    await dbReady;
    const { slug } = req.params;

    const product = queryOne('SELECT * FROM products WHERE slug = ?', [slug]);

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch product'
    });
  }
});

module.exports = router;
