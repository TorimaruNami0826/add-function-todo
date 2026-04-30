// jsdom が要求する TextEncoder / TextDecoder を Node.js の util から注入する
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
