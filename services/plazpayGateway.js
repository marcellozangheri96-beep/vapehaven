/**
 * PlazPay Gateway Service
 * Handles communication with PlazPay API for PayPal payment processing
 * API Docs: https://www.plazpay.com/docs/plazpay-openapi
 */

const PLAZPAY_BASE_URL = process.env.PLAZPAY_API_URL || 'https://api.plazpay.com/v1';
const PLAZPAY_API_KEY = process.env.PLAZPAY_API_KEY || '';

/**
 * Make authenticated request to PlazPay API
 */
async function plazpayRequest(endpoint, body = null) {
  const options = {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PLAZPAY_API_KEY}`,
      'Content-Type': 'application/json'
    }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${PLAZPAY_BASE_URL}${endpoint}`, options);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error = new Error(errorData.message || `PlazPay API error: ${response.status}`);
    error.code = errorData.code || response.status;
    throw error;
  }

  return response.json();
}

/**
 * Get available payment channels and SDK URLs
 * Returns: [{ accountVoucher, name, clientId, sdkUrl, quickSdkUrl }]
 */
async function getPaymentInfo() {
  const data = await plazpayRequest('/getQuickPaymentInfo');
  // Response is a direct array, not wrapped in Result<T>
  return Array.isArray(data) ? data : (data.data || []);
}

/**
 * Create a PlazPay order
 * @param {object} params
 * @param {string} params.requestId - Unique idempotent request ID
 * @param {string} params.accountVoucher - From getPaymentInfo
 * @param {Array} params.items - [{ name, quantity, unitAmount: { currencyCode, value } }]
 * @param {object} params.address - { addressLine1, adminArea1, adminArea2, postalCode, countryCode }
 * @returns {{ orderId, channelOrderId }}
 */
async function createOrder({ requestId, accountVoucher, items, address }) {
  const body = {
    requestId,
    accountVoucher,
    purchaseUnits: {
      items: items.map(item => ({
        name: item.name,
        quantity: String(item.quantity),
        unitAmount: {
          currencyCode: item.unitAmount.currencyCode || 'USD',
          value: item.unitAmount.value
        }
      })),
      address: {
        addressLine1: address.addressLine1,
        adminArea1: address.adminArea1,
        adminArea2: address.adminArea2,
        postalCode: address.postalCode,
        countryCode: address.countryCode
      }
    }
  };

  const result = await plazpayRequest('/createOrder', body);
  return result.data || result;
}

/**
 * Capture (complete) a PlazPay order after PayPal payment
 * @param {string} orderId - PlazPay order ID
 * @returns {boolean}
 */
async function captureOrder(orderId) {
  const result = await plazpayRequest('/captureOrder', { orderId });
  return result.data !== undefined ? result.data : result;
}

/**
 * Query order details
 * @param {string} orderId - PlazPay order ID
 * @returns {{ orderId, channelOrderId, status, totalAmount, currencyCode, createdAt }}
 */
async function queryOrderDetail(orderId) {
  const result = await plazpayRequest('/queryOrderDetail', { orderId });
  return result.data || result;
}

module.exports = {
  getPaymentInfo,
  createOrder,
  captureOrder,
  queryOrderDetail
};
