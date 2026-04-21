const { adapt } = require('./_adapter.cjs');
const handler = require('../../api/pay/mock-success');
exports.handler = adapt(handler);
