const { body, validationResult } = require('express-validator');

/**
 * Validation chain for cart items
 */
const validateCartItem = [
  body('product_id')
    .isInt({ min: 1 })
    .withMessage('Product ID must be a positive integer'),
  body('variant')
    .isIn(['black', 'silver'])
    .withMessage('Variant must be either "black" or "silver"'),
  body('quantity')
    .isInt({ min: 1, max: 20 })
    .withMessage('Quantity must be between 1 and 20')
];

/**
 * Validation chain for checkout
 */
const validateCheckout = [
  body('cart_token')
    .trim()
    .notEmpty()
    .withMessage('Cart token is required'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('first_name')
    .trim()
    .notEmpty()
    .withMessage('First name is required'),
  body('last_name')
    .trim()
    .notEmpty()
    .withMessage('Last name is required'),
  body('address_line1')
    .trim()
    .notEmpty()
    .withMessage('Address is required'),
  body('address_line2')
    .trim()
    .optional(),
  body('city')
    .trim()
    .notEmpty()
    .withMessage('City is required'),
  body('state')
    .trim()
    .notEmpty()
    .withMessage('State is required'),
  body('postal_code')
    .trim()
    .notEmpty()
    .withMessage('Postal code is required'),
  body('phone')
    .trim()
    .optional(),
  body('card_number')
    .isCreditCard()
    .withMessage('Valid credit card number is required'),
  body('card_expiry')
    .matches(/^\d{2}\/\d{2}$/)
    .withMessage('Card expiry must be in MM/YY format'),
  body('card_cvv')
    .isLength({ min: 3, max: 4 })
    .isNumeric()
    .withMessage('CVV must be 3 or 4 numeric digits')
];

/**
 * Middleware to handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map(err => ({
        field: err.param,
        message: err.msg
      }))
    });
  }
  
  next();
};

module.exports = {
  validateCartItem,
  validateCheckout,
  handleValidationErrors
};
