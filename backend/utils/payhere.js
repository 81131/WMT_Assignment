const crypto = require('crypto');

/**
 * Generates the PayHere payment hash (server-side only — never expose merchant_secret to client).
 * Formula: MD5(merchant_id + order_id + amount_formatted + currency + MD5(merchant_secret).toUpperCase()).toUpperCase()
 */
const generatePayHereHash = (merchantId, orderId, amount, currency, merchantSecret) => {
  const hashedSecret = crypto
    .createHash('md5')
    .update(merchantSecret)
    .digest('hex')
    .toUpperCase();

  const hashString = `${merchantId}${orderId}${parseFloat(amount).toFixed(2)}${currency}${hashedSecret}`;

  return crypto.createHash('md5').update(hashString).digest('hex').toUpperCase();
};

/**
 * Verifies incoming PayHere webhook notification.
 * Returns true if the md5sig matches and payment_status is '2' (success).
 */
const verifyPayHereWebhook = (payload, merchantSecret) => {
  const { merchant_id, order_id, payhere_amount, payhere_currency, status_code, md5sig } = payload;
  const expectedSig = generatePayHereHash(
    merchant_id,
    order_id,
    payhere_amount,
    payhere_currency,
    merchantSecret
  );
  return expectedSig === md5sig && status_code === '2';
};

module.exports = { generatePayHereHash, verifyPayHereWebhook };
