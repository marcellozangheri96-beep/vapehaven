/**
 * Email Notification Service
 * Sends order notifications to the shop owner when a payment is captured.
 * Uses Resend API (free tier: 3,000 emails/month).
 *
 * Required env vars:
 *   RESEND_API_KEY     — API key from resend.com/api-keys
 *   NOTIFICATION_EMAIL — Where to send order alerts (e.g. support@vape-roo.com)
 */

const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY || '');
const NOTIFICATION_EMAIL = process.env.NOTIFICATION_EMAIL || 'support@vape-roo.com';
const FROM_EMAIL = 'orders@vape-roo.com'; // Will use Resend's verified domain until custom domain is set

/**
 * Send order notification to shop owner
 * @param {object} order — { order_number, email, first_name, last_name, address_line1, address_line2, city, state, postal_code, country, phone, total }
 * @param {Array} items — [{ name, quantity, price }]
 */
async function sendOrderNotification(order, items) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[EmailNotifier] RESEND_API_KEY not set — skipping notification');
    return false;
  }

  const itemRows = items.map(item =>
    `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;">${item.name}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">$${(item.price * item.quantity).toFixed(2)}</td>
    </tr>`
  ).join('');

  const address = [
    order.address_line1,
    order.address_line2,
    `${order.city}, ${order.state} ${order.postal_code}`,
    order.country || 'AU'
  ].filter(Boolean).join('<br>');

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333;">
  <div style="background:#f47b20;color:#fff;padding:16px 24px;border-radius:8px 8px 0 0;">
    <h1 style="margin:0;font-size:20px;">New Order: ${order.order_number}</h1>
  </div>
  <div style="background:#fff;border:1px solid #e5e5e5;border-top:none;padding:24px;border-radius:0 0 8px 8px;">

    <h2 style="font-size:16px;color:#555;margin-top:0;">Customer Details</h2>
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
      <tr><td style="padding:4px 0;color:#888;width:120px;">Name</td><td><strong>${order.first_name} ${order.last_name}</strong></td></tr>
      <tr><td style="padding:4px 0;color:#888;">Email</td><td><a href="mailto:${order.email}">${order.email}</a></td></tr>
      ${order.phone ? `<tr><td style="padding:4px 0;color:#888;">Phone</td><td>${order.phone}</td></tr>` : ''}
    </table>

    <h2 style="font-size:16px;color:#555;">Shipping Address</h2>
    <p style="background:#f9f9f9;padding:12px 16px;border-radius:6px;line-height:1.6;">
      <strong>${order.first_name} ${order.last_name}</strong><br>
      ${address}
    </p>

    <h2 style="font-size:16px;color:#555;">Order Items</h2>
    <table style="width:100%;border-collapse:collapse;">
      <thead>
        <tr style="background:#f5f5f5;">
          <th style="padding:8px 12px;text-align:left;font-weight:600;">Product</th>
          <th style="padding:8px 12px;text-align:center;font-weight:600;">Qty</th>
          <th style="padding:8px 12px;text-align:right;font-weight:600;">Subtotal</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="2" style="padding:12px;text-align:right;font-weight:700;font-size:16px;">Total</td>
          <td style="padding:12px;text-align:right;font-weight:700;font-size:16px;color:#f47b20;">$${order.total.toFixed(2)} AUD</td>
        </tr>
      </tfoot>
    </table>

    <hr style="border:none;border-top:1px solid #eee;margin:20px 0;">
    <p style="font-size:12px;color:#999;text-align:center;">
      This is an automated notification from Vaperoo (vape-roo.com).<br>
      Please process and ship this order promptly.
    </p>
  </div>
</body>
</html>`;

  try {
    const result = await resend.emails.send({
      from: `Vaperoo Orders <${FROM_EMAIL}>`,
      to: [NOTIFICATION_EMAIL],
      subject: `[New Order] ${order.order_number} — $${order.total.toFixed(2)} — ${order.first_name} ${order.last_name}`,
      html
    });

    console.log(`[EmailNotifier] Order notification sent for ${order.order_number}:`, result.id || result);
    return true;
  } catch (error) {
    console.error(`[EmailNotifier] Failed to send notification for ${order.order_number}:`, error.message);
    return false;
  }
}

/**
 * Send order confirmation to the customer
 * @param {object} order — same as above
 * @param {Array} items — same as above
 */
async function sendCustomerConfirmation(order, items) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[EmailNotifier] RESEND_API_KEY not set — skipping customer email');
    return false;
  }

  const itemList = items.map(item =>
    `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;">${item.name}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">$${(item.price * item.quantity).toFixed(2)}</td>
    </tr>`
  ).join('');

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333;">
  <div style="background:#0b0e17;color:#fff;padding:24px;border-radius:8px 8px 0 0;text-align:center;">
    <img src="https://vape-roo.com/images/logo-large.png" alt="Vaperoo" style="height:36px;margin-bottom:8px;">
    <h1 style="margin:0;font-size:20px;color:#f47b20;">Order Confirmed!</h1>
  </div>
  <div style="background:#fff;border:1px solid #e5e5e5;border-top:none;padding:24px;border-radius:0 0 8px 8px;">
    <p>Hi ${order.first_name},</p>
    <p>Thanks for your order! We've received your payment and your order is being prepared for shipping.</p>

    <div style="background:#f9f9f9;padding:12px 16px;border-radius:6px;margin:16px 0;">
      <strong>Order Number:</strong> ${order.order_number}<br>
      <strong>Total:</strong> $${order.total.toFixed(2)} AUD
    </div>

    <h2 style="font-size:16px;color:#555;">Your Items</h2>
    <table style="width:100%;border-collapse:collapse;">
      <thead>
        <tr style="background:#f5f5f5;">
          <th style="padding:8px 12px;text-align:left;">Product</th>
          <th style="padding:8px 12px;text-align:center;">Qty</th>
          <th style="padding:8px 12px;text-align:right;">Subtotal</th>
        </tr>
      </thead>
      <tbody>${itemList}</tbody>
    </table>

    <p style="margin-top:20px;">Your order will be shipped with free Australia-wide delivery. Estimated delivery: 3–7 business days.</p>

    <p>If you have any questions, reply to this email or contact us at support@vape-roo.com.</p>

    <p style="color:#888;">— The Vaperoo Team</p>

    <hr style="border:none;border-top:1px solid #eee;margin:20px 0;">
    <p style="font-size:11px;color:#bbb;text-align:center;">
      Vaperoo | vape-roo.com<br>
      You're receiving this because you placed an order on our site.
    </p>
  </div>
</body>
</html>`;

  try {
    const result = await resend.emails.send({
      from: `Vaperoo <${FROM_EMAIL}>`,
      to: [order.email],
      subject: `Order Confirmed — ${order.order_number} | Vaperoo`,
      html
    });

    console.log(`[EmailNotifier] Customer confirmation sent to ${order.email}:`, result.id || result);
    return true;
  } catch (error) {
    console.error(`[EmailNotifier] Failed to send customer email:`, error.message);
    return false;
  }
}

module.exports = {
  sendOrderNotification,
  sendCustomerConfirmation
};
