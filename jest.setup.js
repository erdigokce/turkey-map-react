require('@testing-library/jest-dom');

// React 18's browser server renderer expects these globals, which jsdom does
// not provide. Expose Node's implementations so SSR tests work in both React
// 18 and React 19 test environments.
const { TextDecoder, TextEncoder } = require('node:util');

if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
}

if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = TextDecoder;
}
