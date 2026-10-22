import { parts, byId } from './data.js';
export function blockReason(removed, id, remove) {
  const p = byId[id];
  if (!p) return 'この部品は操作できません。';
  if (remove) {
    const dependency = (p.deps || []).find(x => !removed.includes(x));
    if (dependency) return `先に「${byId[dependency].name}」を${byId[dependency].kind === 'slide' ? '操作して張りを抜いて' : byId[dependency].kind === 'adjust' ? '緩めて' : '外して'}ください。`;
  } else {
    const dependent = parts.find(x => (x.deps || []).includes(id) && removed.includes(x.id));
    if (dependent) return `先に「${dependent.name}」を取り付けてください。`;
  }
  return '';
}
export function requiredDirection(id, remove) {
  return id === 'leftPedal' ? (remove ? 'cw' : 'ccw') : (remove ? 'ccw' : 'cw');
}
export function isRotary(id) { return ['wrench', 'hex', 'pedal'].includes(byId[id]?.tool); }
export function actionName(id, remove) {
  const kind = byId[id]?.kind;
  if (kind === 'slide') return remove ? '前へ動かして張りを抜く' : '後ろへ動かして張りを戻す';
  if (kind === 'adjust') return remove ? '緩める' : '調整位置へ戻す';
  return remove ? '取り外す' : '取り付ける';
}
// Positive radians are clockwise on the screen, viewed from the tool side.
export function turnProgress(id, remove, progress, radians) {
  if (!isRotary(id) || !Number.isFinite(radians)) return progress;
  const expected = requiredDirection(id, remove) === 'cw' ? 1 : -1;
  if (radians * expected <= 0) return progress;
  return Math.min(1, progress + Math.abs(radians) / (Math.PI * 2 * (byId[id].turns || 3)));
}
export function applyPart(removed, id, remove) {
  if (blockReason(removed, id, remove)) return removed;
  return remove ? [...new Set([...removed, id])] : removed.filter(x => x !== id);
}
export function validLocations(locations) {
  if (!locations || typeof locations !== 'object') return {};
  return Object.fromEntries(Object.entries(locations).filter(([id, v]) => byId[id] && Array.isArray(v) && v.length === 3 && v.every(n => Number.isFinite(n) && Math.abs(n) < 10)));
}
