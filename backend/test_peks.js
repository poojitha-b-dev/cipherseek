/**
 * test_peks.js – standalone test for PEKS primitives
 * Run: node test_peks.js
 * No database, no server needed.
 */

'use strict';

const peks = require('./peks');

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  ✅ PASS: ${label}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${label}`);
    failed++;
  }
}

console.log('\n=== PEKS Unit Tests ===\n');

// ── 1. KeyGen ──────────────────────────────────────────────────────────────
console.log('1. KeyGen()');
const { publicKey, privateKey } = peks.KeyGen();
assert(typeof publicKey  === 'string' && publicKey.length  > 0, 'publicKey is non-empty string');
assert(typeof privateKey === 'string' && privateKey.length > 0, 'privateKey is non-empty string');
assert(publicKey !== privateKey, 'publicKey !== privateKey');

// ── 2. PEKS ───────────────────────────────────────────────────────────────
console.log('\n2. PEKS(publicKey, keyword)');
const ct1 = peks.PEKS(publicKey, 'invoice');
const ct2 = peks.PEKS(publicKey, 'invoice');
assert(ct1.A && ct1.B && ct1.tag, 'ciphertext has A, B, tag fields');
assert(ct1.A !== ct2.A, 'PEKS is randomised: two encryptions of same keyword have different A');
assert(ct1.B !== ct2.B, 'PEKS is randomised: two encryptions of same keyword have different B');

// ── 3. Trapdoor ───────────────────────────────────────────────────────────
console.log('\n3. Trapdoor(privateKey, keyword)');
const td_invoice = peks.Trapdoor(privateKey, 'invoice');
const td_contract = peks.Trapdoor(privateKey, 'contract');
assert(td_invoice.td  && td_invoice.h1w, 'trapdoor has td and h1w fields');
assert(td_invoice.td !== td_contract.td, 'different keywords → different trapdoors');

// Determinism
const td_invoice2 = peks.Trapdoor(privateKey, 'invoice');
assert(td_invoice.td === td_invoice2.td, 'Trapdoor is deterministic for same keyword+key');

// ── 4. Test – true positive ───────────────────────────────────────────────
console.log('\n4. Test() – true positive');
const ct_invoice = peks.PEKS(publicKey, 'invoice');
const match1 = peks.Test(ct_invoice, td_invoice, privateKey);
assert(match1 === true, 'Test(PEKS(pk, "invoice"), Trapdoor(sk, "invoice"), sk) == true');

// Second ciphertext of same keyword (different r) also matches
const ct_invoice_again = peks.PEKS(publicKey, 'invoice');
const match2 = peks.Test(ct_invoice_again, td_invoice, privateKey);
assert(match2 === true, 'Test works with fresh ciphertext of same keyword');

// ── 5. Test – true negative ───────────────────────────────────────────────
console.log('\n5. Test() – true negative');
const ct_contract = peks.PEKS(publicKey, 'contract');
const noMatch1 = peks.Test(ct_contract, td_invoice, privateKey);
assert(noMatch1 === false, 'Test(PEKS(pk, "contract"), Trapdoor(sk, "invoice"), sk) == false');

const noMatch2 = peks.Test(ct_invoice, td_contract, privateKey);
assert(noMatch2 === false, 'Test(PEKS(pk, "invoice"), Trapdoor(sk, "contract"), sk) == false');

// ── 6. Key isolation ─────────────────────────────────────────────────────
console.log('\n6. Key isolation (different users)');
const { publicKey: pk2, privateKey: sk2 } = peks.KeyGen();
const ct_by_user2 = peks.PEKS(pk2, 'invoice');
const noMatch3 = peks.Test(ct_by_user2, td_invoice, privateKey); // user1 sk
assert(noMatch3 === false, "User1 trapdoor can't search User2's ciphertexts");

const td_invoice_user2 = peks.Trapdoor(sk2, 'invoice');
const noMatch4 = peks.Test(ct_invoice, td_invoice_user2, sk2); // ct from user1
assert(noMatch4 === false, "User2 trapdoor can't search User1's ciphertexts");

// ── 7. deriveUserKeyPair determinism ─────────────────────────────────────
console.log('\n7. deriveUserKeyPair()');
const kp_a = peks.deriveUserKeyPair('super-secret-master-key', '42');
const kp_b = peks.deriveUserKeyPair('super-secret-master-key', '42');
const kp_c = peks.deriveUserKeyPair('super-secret-master-key', '99');
assert(kp_a.publicKey === kp_b.publicKey, 'Same userId → same publicKey');
assert(kp_a.publicKey !== kp_c.publicKey, 'Different userId → different publicKey');

// ── 8. Serialisation round-trip ───────────────────────────────────────────
console.log('\n8. Serialise / Deserialise');
const serialised   = peks.serializeCiphertext(ct_invoice);
const deserialised = peks.deserializeCiphertext(serialised);
assert(typeof serialised === 'string', 'serializeCiphertext returns string');
assert(deserialised.A === ct_invoice.A, 'A preserved after round-trip');
assert(deserialised.B === ct_invoice.B, 'B preserved after round-trip');
const matchAfterRT = peks.Test(deserialised, td_invoice, privateKey);
assert(matchAfterRT === true, 'Test passes on deserialised ciphertext');

// ── Summary ───────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(45)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed === 0) {
  console.log('🎉 All PEKS tests passed!\n');
} else {
  console.error(`⚠️  ${failed} test(s) failed.\n`);
  process.exit(1);
}
