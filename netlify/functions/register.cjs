const { adapt } = require('./_adapter.cjs');
const handler = require('../../api/register');
exports.handler = adapt(handler);
