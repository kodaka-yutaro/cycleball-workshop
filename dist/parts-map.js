import { parts, byId, toolDefs } from './data.js';
import { requiredDirection, isRotary, blockReason } from './mechanics.js';
import { sources, toolSizes, partSpec, catalog, mapPoints, mapText } from './specs.js';

export function openPartsMap({ state, showModal, focus, save, initial }) {
  let selected = byId[initial] ? initial : parts[0].id;
  const number = id => String(parts.findIndex(p => p.id === id) + 1).padStart(2, '0');
  showModal(`<div class="spec-heading"><span class="eyebrow">PARTS & TOOLS / 18 POINTS</span><h2>どこに、どの工具を使う？</h2><p>番号を選んで工具・方向・作業順を確認。寸法は実車未確認のため、練習用の値から始まります。</p></div>
    <div class="spec-layout"><section class="map-overview" aria-label="部品を選択">
    <div class="bike-map-scroll"><div class="bike-map"><svg viewBox="0 0 640 420" aria-label="右側から見た自転車の模式図。左側部品は引き出し線で表示" role="img">
    <g fill="none" stroke="#536651" stroke-width="7"><circle cx="139" cy="253" r="92"/><circle cx="513" cy="253" r="92"/></g>
    <g fill="none" stroke="#b8c3ac" stroke-width="1"><path d="M139 161V345M47 253H231M74 188L204 318M74 318L204 188M513 161V345M421 253H605M448 188L578 318M448 318L578 188"/></g>
    <g fill="none" stroke="#e07146" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"><path d="M139 253L217 145L447 145L320 280L217 145M139 253L320 280M447 145L513 253M115 144H217"/></g>
    <path d="M447 145L454 105L494 75V42" fill="none" stroke="#536651" stroke-width="8" stroke-linecap="round"/><path d="M85 134H153" stroke="#253329" stroke-width="15" stroke-linecap="round"/>
    <path d="M139 240L320 265Q345 280 320 296L139 266Z" fill="none" stroke="#6e7e68" stroke-width="4" stroke-dasharray="4 3"/><circle cx="320" cy="280" r="20" fill="#eeeee5" stroke="#536651" stroke-width="5"/><path d="M275 244L320 280L360 318" stroke="#536651" stroke-width="6"/>
    <g stroke="#99a48f" stroke-width="1.5">${parts.map(p => { const [x,y,cx,cy] = mapPoints[p.id]; return `<path d="M${x} ${y}L${cx} ${cy}"/>`; }).join('')}</g>
    <text x="320" y="405" text-anchor="middle" fill="#6e7e68" font-size="12">模式図 · 左右は乗車姿勢が基準 · 寸法は縮尺なし</text></svg>
    ${parts.map(p => `<button class="map-pin" data-map-part="${p.id}" style="left:${mapPoints[p.id][2]/640*100}%;top:${mapPoints[p.id][3]/420*100}%" aria-label="${number(p.id)} ${p.name}">${number(p.id)}</button>`).join('')}</div></div>
    <label class="map-select-label" for="mapSelect">部品名から選ぶ</label><select id="mapSelect">${parts.map(p => `<option value="${p.id}">${number(p.id)} ${p.name}</option>`).join('')}</select>
    <p class="map-key">橙：選択中　／　番号はパーツ一覧と共通</p></section><section id="specDetail" class="spec-detail" aria-live="polite"></section></div>
    <details class="catalog"><summary>Star公式で確認できた工具・規格を見る</summary><p>掲載商品の情報です。今の3Dモデルへの適合や、手元の車体の仕様を保証する表ではありません。</p><div class="catalog-grid">${catalog.map(c => `<article><span class="spec-badge official">公式掲載あり</span><h3>${c.name}</h3><strong>${c.tool}</strong><small>品番 ${c.code}</small><p>${c.fact}</p><p class="pending">${c.pending}</p></article>`).join('')}</div><a href="${sources.star.url}" target="_blank" rel="noopener">公式カタログを開く ↗</a></details>
    <details class="catalog"><summary>工具の対応表をテキストで見る・コピーする</summary><p>この番号を使って「01は17 mm」のように工具サイズを指定できます。「自分の設定」はこのブラウザーに保存されます。</p><textarea id="mapCopyText" readonly aria-label="工具対応表" rows="10"></textarea></details>`);
  document.getElementById('modal').classList.add('parts-map-modal');
  const detail = document.getElementById('specDetail');
  function draw() {
    const p = byId[selected], spec = partSpec(selected, state.specOverrides);
    document.getElementById('mapSelect').value = selected;
    document.querySelectorAll('[data-map-part]').forEach(b => { b.classList.toggle('active', b.dataset.mapPart === selected); b.setAttribute('aria-pressed', String(b.dataset.mapPart === selected)); });
    const removed = state.removed.includes(selected), reason = blockReason(state.removed, selected, !removed);
    const direction = isRotary(selected) ? `${requiredDirection(selected, true) === 'cw' ? '↷ 時計回り' : '↶ 反時計回り'}で緩める` : p.kind === 'clip' ? 'クリップを横へ滑らせる' : '回さず、手で動かす';
    const source = selected.includes('Pedal') ? sources.pedal : ['chain','chainClip','chainLink','rearSlide'].includes(selected) ? sources.chain : null;
    detail.innerHTML = `<span class="eyebrow">PART ${number(selected)} / ${removed ? '取り外し・解除済み' : '装着済み'}</span><h3>${p.name}</h3><span class="spec-badge">${spec.basis}</span>
      <dl><dt>使う工具</dt><dd>${toolDefs.find(t => t[0] === p.tool)[1]}${spec.size ? ` <b>${spec.size} mm</b>` : ''}</dd><dt>動かす方向</dt><dd>${direction}${isRotary(selected) ? '<small>工具を当てる外側・頭側から見た向き</small>' : ''}</dd><dt>先に外す・解除するもの</dt><dd>${p.deps?.length ? p.deps.map(id => `${number(id)} ${byId[id].name}`).join('<br>') : 'なし。車体と対象部品を支えて開始'}</dd><dt>作業のポイント</dt><dd>${p.tip}</dd>${spec.size ? '<dt>締め付けトルク</dt><dd>未確認。画面の100%は締付保証ではありません。</dd>' : ''}</dl>
      ${reason ? `<p class="spec-block">現在：${reason}</p>` : '<p class="spec-ready">現在の分解順で、この部品を操作できます。</p>'}
      <button class="accent" id="mapFocus">この部品の近くへ移動 ↗</button>
      ${spec.size ? `<details class="spec-edit"><summary>この部品の工具サイズを設定</summary><p>実測・型番確認後の値を選べます。変更はこの部品だけに適用し、公式確認済みにはしません。</p><label for="partSize">必要な工具のサイズ</label><select id="partSize"><option value="">練習用に戻す</option>${toolSizes[p.tool].map(size => `<option value="${size}" ${spec.custom && size === spec.size ? 'selected' : ''}>${size} mm</option>`).join('')}</select><button id="applySpec" class="outline">この部品に保存</button></details>` : ''}
      ${source ? `<a class="detail-source" href="${source.url}" target="_blank" rel="noopener">${source.name} ↗</a>` : '<p class="detail-source">工具寸法・固定方式はStar実車で未確認です。</p>'}`;
    document.getElementById('mapCopyText').value = mapText(state.specOverrides);
    document.getElementById('mapFocus').onclick = () => focus(selected);
    const apply = document.getElementById('applySpec');
    if (apply) apply.onclick = () => {
      const size = Number(document.getElementById('partSize').value);
      state.specOverrides ||= {};
      if (size) state.specOverrides[selected] = size; else delete state.specOverrides[selected];
      save(); draw();
      detail.querySelector('h3').setAttribute('tabindex', '-1'); detail.querySelector('h3').focus();
    };
  }
  document.querySelectorAll('[data-map-part]').forEach(b => b.onclick = () => { selected = b.dataset.mapPart; draw(); });
  document.getElementById('mapSelect').onchange = e => { selected = e.target.value; draw(); };
  draw();
}
