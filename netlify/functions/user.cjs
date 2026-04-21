const { adapt } = require('./_adapter.cjs');
const handler = require('../../api/user');
exports.handler = adapt(handler);
