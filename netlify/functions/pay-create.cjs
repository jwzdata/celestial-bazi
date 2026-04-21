const { adapt } = require('./_adapter.cjs');
const handler = require('../../api/pay/create');
exports.handler = adapt(handler);
