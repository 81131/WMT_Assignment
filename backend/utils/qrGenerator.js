const QRCode = require('qrcode');
const cloudinary = require('../config/cloudinary');

/**
 * Generates a QR code for the given ticketCode, uploads it to Cloudinary,
 * and returns the secure URL.
 */
const generateAndUploadQR = async (ticketCode) => {
  // Generate QR as a base64 PNG data URL
  const dataUrl = await QRCode.toDataURL(ticketCode, {
    errorCorrectionLevel: 'H',
    margin: 2,
    width: 400,
  });

  // Upload to Cloudinary under the 'tickets' folder
  const result = await cloudinary.uploader.upload(dataUrl, {
    folder: 'cinema/tickets',
    public_id: `ticket_${ticketCode}`,
    overwrite: true,
  });

  return result.secure_url;
};

module.exports = { generateAndUploadQR };
