const test = require('node:test');
const assert = require('node:assert');
const { TextDecoder, TextEncoder } = require('util');

// Mock browser globals needed by renderer.js during import
const OTPAuth = require('otpauth');
global.TextDecoder = TextDecoder;
global.TextEncoder = TextEncoder;
global.window = {
  OTPAuth,
  btoa: (str) => Buffer.from(str, 'binary').toString('base64'),
  atob: (str) => Buffer.from(str, 'base64').toString('binary')
};
global.document = {
  getElementById: () => ({
    addEventListener: () => {},
    style: {}
  })
};

// Import functions under test
const {
  validateSecret,
  base32ToUint8Array,
  uint8ArrayToBase32,
  generateMigrationUrl,
  decodeMigrationUrl
} = require('../src/renderer.js');

test('validateSecret tests', () => {
  // Valid Base32 secrets (case-insensitive, can contain spaces)
  assert.strictEqual(validateSecret('JBSWY3DPEHPK3PXP'), true);
  assert.strictEqual(validateSecret('jbsw y3dp ehpk 3pxp'), true);
});

test('base32 roundtrip conversion', () => {
  const originalSecret = 'JBSWY3DPEHPK3PXP';
  const bytes = base32ToUint8Array(originalSecret);
  const result = uint8ArrayToBase32(bytes);
  assert.strictEqual(result, originalSecret);
});

test('Google Authenticator migration URL roundtrip', () => {
  const originalAccounts = [
    { issuer: 'Google', name: 'user@gmail.com', secret: 'JBSWY3DPEHPK3PXP' },
    { issuer: 'GitHub', name: 'dev', secret: 'KVKVEKSK' }
  ];

  // Encode
  const migrationUrl = generateMigrationUrl(originalAccounts);
  assert.ok(migrationUrl.startsWith('otpauth-migration://offline?data='));

  // Decode
  const decodedAccounts = decodeMigrationUrl(migrationUrl);
  
  assert.strictEqual(decodedAccounts.length, originalAccounts.length);
  assert.strictEqual(decodedAccounts[0].issuer, originalAccounts[0].issuer);
  assert.strictEqual(decodedAccounts[0].name, originalAccounts[0].name);
  assert.strictEqual(decodedAccounts[0].secret, originalAccounts[0].secret);

  assert.strictEqual(decodedAccounts[1].issuer, originalAccounts[1].issuer);
  assert.strictEqual(decodedAccounts[1].name, originalAccounts[1].name);
  assert.strictEqual(decodedAccounts[1].secret, originalAccounts[1].secret);
});
