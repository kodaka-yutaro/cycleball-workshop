import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parts } from '../dist/data.js';
import { fitReason, validSizes, validOverrides, partSpec, mapPoints, mapText } from '../dist/specs.js';

test('fitting requires both the right tool family and matching size', () => {
  assert.equal(fitReason('frontNuts', 'wrench', {wrench:15}), '');
  assert.match(fitReason('frontNuts', 'wrench', {wrench:14}), /小さく/);
  assert.match(fitReason('frontNuts', 'wrench', {wrench:17}), /大きく/);
  assert.match(fitReason('frontNuts', 'pedal', {pedal:15}), /スパナ 15 mm/);
  assert.equal(fitReason('adjustLeft', 'wrench', {wrench:10}), '');
  assert.match(fitReason('adjustLeft', 'wrench', {wrench:15}), /10 mm/);
  assert.equal(fitReason('chain', 'hand', {}), '');
  assert.match(fitReason('chainClip', 'hand', {}), /ラジオペンチ/);
});
test('individual settings affect fit, not other parts or source confidence', () => {
  const overrides = {frontNuts:17};
  assert.equal(fitReason('frontNuts', 'wrench', {wrench:17}, overrides), '');
  assert.match(fitReason('frontNutLeft', 'wrench', {wrench:17}, overrides), /15 mm/);
  assert.equal(partSpec('frontNuts', overrides).basis, '自分の設定');
  assert.equal(partSpec('frontNuts').basis, '練習用の仮設定');
  assert.match(mapText(overrides), /01 前輪・右ナット：スパナ 17 mm（自分の設定）/);
});
test('invalid old or edited browser data cannot bypass size matching', () => {
  assert.deepEqual(validSizes({wrench:-1,hex:'6',pedal:Infinity}), {wrench:15,hex:6,pedal:15});
  assert.deepEqual(validOverrides({frontNuts:17,chain:15,seatBolt:999,unknown:12}), {frontNuts:17});
  assert.equal(partSpec('frontNuts', {frontNuts:'17'}).size, 15);
  assert.match(fitReason('adjustRight','wrench',{wrench:null}), /10 mm/);
});
test('each actionable part has one numbered map position and report row', () => {
  assert.equal(Object.keys(mapPoints).length, parts.length);
  for(const p of parts) assert.ok(mapPoints[p.id]?.every(Number.isFinite),p.id);
  assert.equal(mapText().split('\n').length, parts.length);
});
