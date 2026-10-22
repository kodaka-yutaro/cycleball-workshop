import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parts, lessons } from '../dist/data.js';
import { blockReason, requiredDirection, applyPart, validLocations, turnProgress } from '../dist/mechanics.js';
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
  assert.ok(blockReason(['frontNuts'], 'frontWheel', true));
  assert.equal(blockReason(['frontNuts','frontNutLeft'], 'frontWheel', true), '');
  assert.equal(blockReason(['rearNuts','rearNutLeft','rearSlide','chain'], 'rearWheel', true), '');
});
test('chain needs slack and an open connecting link; tension cannot be restored early', () => {
  let removed=[];
  for(const id of ['rearNuts','rearNutLeft','adjustRight','adjustLeft','rearSlide','chainClip','chainLink']) {
    assert.ok(blockReason(removed,'chain',true));
    assert.equal(blockReason(removed,id,true),'');
    removed=applyPart(removed,id,true);
  }
  assert.equal(blockReason(removed,'chain',true),'');
  removed=applyPart(removed,'chain',true);
  assert.ok(blockReason(removed,'rearSlide',false));
  assert.ok(blockReason(removed,'chainClip',false));
  for(const id of ['chain','chainLink','chainClip','rearSlide','adjustLeft','adjustRight','rearNutLeft','rearNuts']) {
    assert.equal(blockReason(removed,id,false),'');
    removed=applyPart(removed,id,false);
  }
  assert.deepEqual(removed,[]);
});
test('manual rotations only advance in the required direction, from either side', () => {
  assert.equal(turnProgress('leftPedal',true,0,-Math.PI),0);
  assert.equal(turnProgress('leftPedal',true,0,Math.PI),.125);
  assert.equal(turnProgress('rightPedal',true,0,Math.PI),0);
  assert.equal(turnProgress('rightPedal',true,0,-Math.PI),.125);
  assert.equal(requiredDirection('frontNutLeft',true),'ccw');
  assert.equal(requiredDirection('rearNutLeft',true),'ccw');
  assert.equal(turnProgress('rightPedal',false,.99,Math.PI),1);
  assert.equal(turnProgress('chainClip',true,0,Math.PI),0);
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
