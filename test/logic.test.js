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
  uint8ArrayToBase64,
  generateMigrationUrl,
  decodeMigrationUrl
} = require('../src/renderer.js');

test('validateSecret tests', () => {
  // Valid Base32 secrets (case-insensitive, can contain spaces)
  assert.strictEqual(validateSecret('JBSWY3DPEHPK3PXP'), true);
  assert.strictEqual(validateSecret('jbsw y3dp ehpk 3pxp'), true);
  assert.strictEqual(validateSecret('A'), true); 

  // Invalid Base32 secrets containing disallowed special characters
  assert.strictEqual(validateSecret('invalid!#%'), false);
  assert.strictEqual(validateSecret('JBSWY3DPEHPK3PX?'), false);
});

test('base32 roundtrip conversion', () => {
  const originalSecret = 'JBSWY3DPEHPK3PXP';
  const bytes = base32ToUint8Array(originalSecret);
  const result = uint8ArrayToBase32(bytes);
  assert.strictEqual(result, originalSecret);
});

test('base32 padding and spaces handling', () => {
  const originalSecret = 'jbsw y3dp ehpk 3pxp';
  const bytes = base32ToUint8Array(originalSecret);
  const result = uint8ArrayToBase32(bytes);
  // Re-encoded will be uppercase, stripped of spaces
  assert.strictEqual(result, 'JBSWY3DPEHPK3PXP');
});

test('uint8ArrayToBase64 helper roundtrip', () => {
  const data = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
  const b64 = uint8ArrayToBase64(data);
  assert.strictEqual(b64, 'SGVsbG8=');
});

test('Google Authenticator migration URL roundtrip - multiple items', () => {
  const originalAccounts = [
    { issuer: 'Google', name: 'user@gmail.com', secret: 'JBSWY3DPEHPK3PXP' },
    { issuer: 'GitHub', name: 'dev', secret: 'KVKVEKSK' },
    { issuer: 'Amazon AWS', name: 'root', secret: 'MZXW6YTBOI' },
    { issuer: 'Discord', name: 'gamer', secret: 'NBSWY3DPEHPK3PXP' }
  ];

  // Encode
  const migrationUrl = generateMigrationUrl(originalAccounts);
  assert.ok(migrationUrl.startsWith('otpauth-migration://offline?data='));

  // Decode
  const decodedAccounts = decodeMigrationUrl(migrationUrl);
  
  assert.strictEqual(decodedAccounts.length, originalAccounts.length);
  for (let i = 0; i < originalAccounts.length; i++) {
    assert.strictEqual(decodedAccounts[i].issuer, originalAccounts[i].issuer);
    assert.strictEqual(decodedAccounts[i].name, originalAccounts[i].name);
    assert.strictEqual(decodedAccounts[i].secret, originalAccounts[i].secret);
  }
});

test('decodeMigrationUrl - parses single otpauth:// format', () => {
  const standardTotpUrl = 'otpauth://totp/GitHub:dev?secret=KVKVEKSK&issuer=GitHub';
  const decoded = decodeMigrationUrl(standardTotpUrl);
  
  assert.ok(decoded);
  assert.strictEqual(decoded.length, 1);
  assert.strictEqual(decoded[0].issuer, 'GitHub');
  assert.strictEqual(decoded[0].name, 'dev');
  assert.strictEqual(decoded[0].secret, 'KVKVEKSK');
});

test('decodeMigrationUrl - handles invalid url inputs', () => {
  assert.strictEqual(decodeMigrationUrl('http://google.com'), null);
  assert.strictEqual(decodeMigrationUrl('otpauth-migration://offline?data=invalidbase64format!!!'), null);
});
