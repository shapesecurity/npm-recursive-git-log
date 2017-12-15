let test = require('ava');
let npmrgl = require('../');

let SNAPSHOTS = [
  { pkg: 'npm', from: '5.4.0', to: '5.5.0' },
  { pkg: 'npm', from: '5.5.0', to: '5.5.0' },
  { pkg: 'moment', from: '2.19.3', to: '2.19.4' },
  { pkg: 'express', from: '4.16.0', to: '4.16.2' },
  { pkg: 'underscore', from: '1.8.2', to: '1.8.3' },
];

SNAPSHOTS.forEach(({ pkg, from, to }) => {
  test(`${pkg}: ${from} -> ${to}`, async t => {
    let changelog = await npmrgl.default(pkg, from, to);
    t.snapshot(changelog);
  });
});

