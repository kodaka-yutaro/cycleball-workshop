import { parts, byId } from './data.js';
export function blockReason(removed, id, remove) {
  const p = byId[id];
  if (!p) return 'この部品は操作できません。';
  if (remove) {
    const dependency = (p.deps || []).find(x => !removed.includes(x));
    if (dependency) return `先に「${byId[dependency].name}」を外してください。`;
  } else {
    const dependent = parts.find(x => (x.deps || []).includes(id) && removed.includes(x.id));
    if (dependent) return `先に「${dependent.name}」を取り付けてください。`;
  }
  return '';
}
export function requiredDirection(id, remove) {
  return id === 'leftPedal' ? (remove ? 'cw' : 'ccw') : (remove ? 'ccw' : 'cw');
}
export function applyPart(removed, id, remove) {
  if (blockReason(removed, id, remove)) return removed;
  return remove ? [...new Set([...removed, id])] : removed.filter(x => x !== id);
}
export function validLocations(locations) {
  if (!locations || typeof locations !== 'object') return {};
  return Object.fromEntries(Object.entries(locations).filter(([id, v]) => byId[id] && Array.isArray(v) && v.length === 3 && v.every(n => Number.isFinite(n) && Math.abs(n) < 10)));
}
