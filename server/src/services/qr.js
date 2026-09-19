const jwt = require('jsonwebtoken');
const QRCode = require('qrcode');

function signQrToken(bookingId, seatId) {
  return jwt.sign(
    { bookingId: bookingId.toString(), seatId: seatId.toString() },
    process.env.QR_SECRET,
    { expiresIn: '30d' }
  );
}

function verifyQrToken(token) {
  return jwt.verify(token, process.env.QR_SECRET);
}

function generateQrImage(token) {
  return QRCode.toDataURL(token);
}

module.exports = { signQrToken, verifyQrToken, generateQrImage };
