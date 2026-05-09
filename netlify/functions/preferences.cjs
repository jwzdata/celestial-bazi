const { adapt } = require('./_adapter.cjs');
const handler = require('../../api/preferences');
exports.handler = adapt(handler);
