const jwt = require('jsonwebtoken');

const PLACEHOLDER_JWT_SECRET = 'bazi-secret-key-change-me-in-production';

function isProductionDeployment() {
  return process.env.VERCEL_ENV === 'production'
    || process.env.CONTEXT === 'production'
    || process.env.NODE_ENV === 'production';
}

function getJwtSecret() {
  const secret = process.env.JWT_SECRET && process.env.JWT_SECRET.trim();
  if (secret && secret !== PLACEHOLDER_JWT_SECRET) return secret;
  if (isProductionDeployment()) {
    throw new Error('JWT_SECRET is not configured');
  }
  return PLACEHOLDER_JWT_SECRET;
}

function signJwtToken(payload, options) {
  return jwt.sign(payload, getJwtSecret(), options);
}

function verifyJwtToken(token) {
  return jwt.verify(token, getJwtSecret());
}

function isLocalDevHost(hostname) {
  return ['localhost', '127.0.0.1', '::1'].includes(String(hostname || '').split(':')[0]);
}

function isMockPaymentAllowed(req) {
  if (isProductionDeployment()) return false;
  if (process.env.ALLOW_MOCK_PAYMENT === 'true') return true;
  const host = req && (req.headers.host || req.headers['x-forwarded-host']);
  return isLocalDevHost(host);
}

module.exports = {
  getJwtSecret,
  isMockPaymentAllowed,
  isProductionDeployment,
  signJwtToken,
  verifyJwtToken
};
