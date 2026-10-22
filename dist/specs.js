import { parts, byId, toolDefs } from './data.js';

export const sources = {
  star: { name: 'STAR BICYCLE 公式部品・工具カタログ', url: 'https://www.starbicycle.com/shop' },
  pedal: { name: 'Park Tool — ペダル脱着（一般構造）', url: 'https://www.parktool.com/en-us/blog/repair-help/pedal-installation-and-removal' },
  chain: { name: 'Park Tool — 単速チェーン交換（一般構造）', url: 'https://www.parktool.com/en-us/blog/repair-help/chain-replacement-single-speed-bikes' }
};
export const toolSizes = { wrench: [8, 9, 10, 12, 13, 14, 15, 17, 19], hex: [3, 4, 5, 6, 8, 10], pedal: [15] };
export const defaultSizes = { wrench: 15, hex: 6, pedal: 15 };
const practiceSizes = { frontNuts: 15, frontNutLeft: 15, rearNuts: 15, rearNutLeft: 15, adjustRight: 10, adjustLeft: 10, rightPedal: 15, leftPedal: 15, barBolts: 6, seatBolt: 6 };
export function validSizes(value) {
  return Object.fromEntries(Object.entries(defaultSizes).map(([tool, fallback]) => [tool, toolSizes[tool].includes(value?.[tool]) ? value[tool] : fallback]));
}
export function validOverrides(value) {
  return Object.fromEntries(Object.entries(value || {}).filter(([id, size]) => byId[id] && toolSizes[byId[id].tool]?.includes(size)));
}
export function partSpec(id, overrides = {}) {
  const p = byId[id];
  const custom = Object.hasOwn(overrides, id) && toolSizes[p.tool]?.includes(overrides[id]);
  return { size: custom ? overrides[id] : practiceSizes[id] || null, basis: custom ? '自分の設定' : practiceSizes[id] ? '練習用の仮設定' : '一般構造のモデル', custom };
}
export function toolLabel(tool, sizes = defaultSizes) {
  const name = toolDefs.find(t => t[0] === tool)?.[1] || '';
  return `${name}${toolSizes[tool] ? ` ${validSizes(sizes)[tool]} mm` : ''}`;
}
export function fitReason(id, tool, sizes, overrides = {}) {
  const p = byId[id], spec = partSpec(id, overrides);
  const expected = `${toolDefs.find(t => t[0] === p.tool)[1]}${spec.size ? ` ${spec.size} mm` : ''}`;
  if (tool !== p.tool) return `${expected}が必要です。`;
  if (spec.size && validSizes(sizes)[tool] !== spec.size) return `${validSizes(sizes)[tool] < spec.size ? '工具が小さく入りません' : '工具が大きく、がたつきます'}。${expected}を選んでください（${spec.basis}）。`;
  return '';
}
export const catalog = [
  { name: 'ヘッドのナット', tool: '32 / 36 mm ヘッドスパナ', code: '13-005', fact: '1インチ用ナットは32、1⅛インチ用は36の表記。', pending: '装着ヘッドの方式とナットを確認。現行の3Dでは脱着未対応。' },
  { name: 'クランク', tool: '四角軸 / ISIS 対応クランク抜き', code: '13-010', fact: '四角軸とISISのクランク・工具を掲載。', pending: '軸規格と工具先端の適合を確認。3Dのクランクは固定。' },
  { name: 'ボトムブラケット（BB）', tool: '四角軸用 / ISIS用 BB工具', code: '13-007 / 13-009', fact: 'BB用とクランク用は別工具として掲載。', pending: 'BB型番・工具の嵌合・ねじ規格を確認。回転方向は未確定。3D脱着未対応。' },
  { name: 'チェーンの切断', tool: 'Radball / Kunstrad用チェーン切り', code: '13-011', fact: '専用チェーン切りとRadball用接続リンクを掲載。', pending: 'チェーン型番と接続方式を確認。今の練習はクリップ式で、ピン圧出操作は未対応。' },
  { name: 'スポーク', tool: 'スポークレンチ', code: '13-012', fact: 'Park Tool製の工具を掲載。', pending: 'ニップルの二面幅を確認。サイズ・張力・振れ取り操作は未対応。' },
  { name: '清掃・潤滑', tool: 'グリス / チェーンオイル', code: '13-013 / 13-015', fact: 'MOTOREXのグリスとチェーンオイルを掲載。', pending: '対象部位・材質に応じた使用条件を確認。塗布モーションは未対応。' }
];
export const mapPoints = {
  frontNuts: [513, 253, 553, 248], frontNutLeft: [513, 253, 584, 298], frontWheel: [513, 300, 523, 369],
  rearNuts: [139, 253, 88, 241], rearNutLeft: [139, 253, 52, 296],
  adjustRight: [166, 253, 195, 191], adjustLeft: [166, 253, 206, 245], rearSlide: [139, 253, 101, 165],
  chainClip: [231, 271, 208, 320], chainLink: [243, 274, 265, 335], chain: [275, 284, 326, 356], rearWheel: [139, 315, 129, 369],
  rightPedal: [360, 318, 396, 351], leftPedal: [275, 244, 287, 201],
  barBolts: [449, 145, 493, 121], handlebar: [494, 75, 546, 61], seatBolt: [217, 145, 271, 116], saddle: [115, 144, 123, 93]
};
export function inspectionItems(id, final = false) {
  if (['chain', 'chainClip', 'chainLink', 'rearSlide', 'rearWheel'].includes(id)) return final
    ? ['後輪の中心と左右の固定を確認', '接続部の装着とリンクの動きを確認', 'クランク全周で張り・チェーンラインを確認']
    : ['車体と後輪を支え、位置を記録', '接続方式を確認（この練習はクリップ式）', 'リンク・歯の摩耗や傷を確認'];
  if (id.includes('Pedal')) return final
    ? ['左右の固定を確認', '回転とガタを確認', '実車では製品指定の締付条件を確認']
    : ['L / Rの刻印とねじ山を確認', 'ねじ山の清掃・潤滑を確認', '組付けは手でねじを掛けてから工具を使う'];
  const p = byId[id];
  return final ? [`${p.name}の固定を確認`, 'ガタ・ずれ・干渉を確認', '実車では製品指定の締付条件を確認'] : ['車体と取り外す部品を支える', '元の位置・向きと固定方式を記録', '接触面の傷・汚れ・変形を確認'];
}
export function mapText(overrides = {}) {
  return parts.map((p, i) => {
    const s = partSpec(p.id, overrides);
    return `${String(i + 1).padStart(2, '0')} ${p.name}：${toolDefs.find(t => t[0] === p.tool)[1]}${s.size ? ` ${s.size} mm` : ''}（${s.basis}）`;
  }).join('\n');
}
