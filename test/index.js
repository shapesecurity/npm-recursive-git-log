let test = require('ava');
let npmrgl = require('../');

test('non-existent package name', async t => {
  await t.throws(npmrgl.default('nonexistentpackagenamepleasedontregisterthisname', '0.0.0', '0.0.1'));
});

test('invalid package name', async t => {
  await t.throws(npmrgl.default('!@#$%^&*()_+-=', '0.0.0', '0.0.1'));
});

test('malicious package name', async t => {
  await t.throws(npmrgl.default('; sleep 100; exit 1; npm', '0.0.0', '0.0.1'));
});

test('invalid versions', async t => {
  await t.throws(npmrgl.default('npm', '0.0.0', 'not a version'));
  await t.throws(npmrgl.default('npm', 'not a version', '0.0.0'));
});
