const { adapt } = require('./_adapter.cjs');
const handler = require('../../api/login');
exports.handler = adapt(handler);
