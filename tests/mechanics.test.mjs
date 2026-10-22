import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parts, lessons } from '../dist/data.js';
import { blockReason, requiredDirection, applyPart, validLocations } from '../dist/mechanics.js';
test('every lesson removes and reinstalls in valid dependency order', () => {
  for (const lesson of lessons) {
    let removed = [];
    for (const step of lesson.steps) {
      if (step.act === 'check') continue;
      const remove = step.act === 'remove';
      assert.equal(blockReason(removed, step.part, remove), '', `${lesson.id}: ${step.title}`);
      removed = applyPart(removed, step.part, remove);
    }
    assert.deepEqual(removed, [], lesson.id);
  }
});
test('fasteners cannot be installed while their retained units are missing', () => {
  assert.ok(blockReason([], 'frontWheel', true));
  assert.ok(blockReason(['frontNuts','frontWheel'], 'frontNuts', false));
  assert.ok(blockReason(['rearNuts'], 'rearWheel', true));
  assert.equal(blockReason(['rearNuts','chain'], 'rearWheel', true), '');
});
test('left pedal uses the opposite turn direction', () => {
  assert.equal(requiredDirection('leftPedal', true), 'cw');
  assert.equal(requiredDirection('leftPedal', false), 'ccw');
  assert.equal(requiredDirection('rightPedal', true), 'ccw');
  assert.equal(requiredDirection('rightPedal', false), 'cw');
});
test('all units can be removed then reinstalled', () => {
  let removed = [];
  for (const p of parts) { assert.equal(blockReason(removed,p.id,true),''); removed=applyPart(removed,p.id,true); }
  assert.equal(removed.length,parts.length);
  for (const p of [...parts].reverse()) { assert.equal(blockReason(removed,p.id,false),''); removed=applyPart(removed,p.id,false); }
  assert.deepEqual(removed,[]);
});
test('untrusted saved positions cannot corrupt the scene', () => {
  assert.deepEqual(validLocations({frontWheel:[.5,0,1],rearWheel:[NaN,0,0],invalid:[0,0,0],chain:[1000,1,0]}),{frontWheel:[.5,0,1]});
});
