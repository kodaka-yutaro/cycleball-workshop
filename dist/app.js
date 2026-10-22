import { Workshop } from './engine.js';
import { icons, toolDefs, parts, byId, lessons } from './data.js';
import { blockReason, requiredDirection, applyPart, validLocations, isRotary, actionName, turnProgress } from './mechanics.js';
const $ = id => document.getElementById(id);
let state = { removed: [], locations: {}, tool: 'hand', mode: 'free', lesson: 0, step: 0, completed: [] };
try {
  const s = JSON.parse(localStorage.getItem('cw-state-v3'));
  if (s && Array.isArray(s.removed) && s.removed.every(i => byId[i]) && toolDefs.some(t => t[0] === s.tool) && ['free','guide'].includes(s.mode) && Number.isInteger(s.lesson) && lessons[s.lesson] && Number.isInteger(s.step) && s.step >= 0 && s.step <= lessons[s.lesson].steps.length) {
    state = { ...state, ...s, locations: validLocations(s.locations), completed: Array.isArray(s.completed) ? s.completed.filter(i => lessons.some(l => l.id === i)) : [] };
  }
} catch {}
let studio, work = null, held = false, direction = 'ccw', history = [], lastAimKey = '';
function save() { try { localStorage.setItem('cw-state-v3', JSON.stringify(state)); } catch { $('saveStatus').textContent = '保存できません'; } }
function toast(text) { $('toast').textContent = text; $('toast').classList.add('show'); clearTimeout(toast.timer); toast.timer = setTimeout(() => $('toast').classList.remove('show'), 3600); }
function snapshot() { history.push(JSON.stringify(state)); if (history.length > 40) history.shift(); }
function step() { return lessons[state.lesson].steps[state.step]; }
function isBusy() { return !!work || !!studio?.carry; }
function showModal(html) { studio?.unlock(); held = false; $('modalBody').innerHTML = html; $('modal').showModal(); }
function advance() {
  state.step++;
  if (!step() && !state.completed.includes(lessons[state.lesson].id)) state.completed.push(lessons[state.lesson].id);
}
function dismissEntry() { $('entryHint').hidden = true; }
function toolName(id) { return toolDefs.find(t => t[0] === id)?.[1] || ''; }
function selectedTool(index) {
  if (isBusy()) { toast('作業を終了してから工具を持ち替えます。'); return; }
  state.tool = toolDefs[index][0];
  render();
}
function aimStatus(aim) {
  if (work || studio?.carry) return;
  const id = aim?.id;
  const p = id && byId[id];
  let name = '作業したい部品を狙う', hint = 'WASDで近づく · Eで工具を合わせる', ready = false;
  if (studio?.mode === 'orbit') { name = '観察モード'; hint = 'ドラッグで回転 · パーツをクリックして近づく'; }
  else if (p) {
    const remove = !state.removed.includes(id), st = step();
    name = p.name;
    if (aim.distance > 1.85) hint = 'もう少し近づいてください';
    else if (state.mode === 'guide' && st && st.part !== id) hint = `今回の対象は「${byId[st.part].name}」です`;
    else if (state.mode === 'guide' && st?.act === 'check') { ready = true; hint = 'E 解説を確認して次へ'; }
    else if (state.mode === 'guide' && !st) hint = 'レッスン完了。自由に整備するにはフリーモードへ';
    else if (state.tool !== p.tool) hint = `${toolName(p.tool)}が必要${!remove && !['adjust','slide'].includes(p.kind) ? ' · 手で G を押すと運べます' : ''}`;
    else {
      const reason = blockReason(state.removed, id, remove);
      if (reason) hint = reason;
      else { ready = true; hint = `E ${state.tool === 'hand' ? '手を掛ける' : '工具を合わせる'} · ${actionName(id,remove)}`; }
    }
  } else if (state.mode === 'guide' && step()) hint = `対象：${byId[step().part].name} · 「対象の近くへ移動」も使えます`;
  const key = [name, hint, ready, id].join('|');
  if (key === lastAimKey) return;
  lastAimKey = key;
  $('aimName').textContent = name;
  $('aimName').dataset.part = id || '';
  $('aimDetail').textContent = hint;
  $('aimHint').classList.toggle('ready', ready);
  $('crosshair').classList.toggle('ready', ready);
  $('interact').disabled = !ready;
  $('grab').disabled = !id || !state.removed.includes(id) || state.tool !== 'hand' || ['adjust','slide'].includes(byId[id]?.kind);
}
function render() {
  const guide = state.mode === 'guide', st = step();
  $('freeMode').classList.toggle('active', !guide);
  $('guideMode').classList.toggle('active', guide);
  $('freeMode').setAttribute('aria-selected', String(!guide));
  $('guideMode').setAttribute('aria-selected', String(guide));
  $('guidePanel').hidden = !guide;
  $('tools').innerHTML = toolDefs.map(([id, name], i) => `<button class="tool ${state.tool === id ? 'active' : ''}" data-tool="${id}" aria-pressed="${state.tool === id}"><span class="tool-key">${i + 1}</span>${icons[id]}<span>${name}</span></button>`).join('');
  $('toolName').textContent = toolName(state.tool);
  $('partList').innerHTML = parts.map((p, i) => `<button class="part-row ${state.removed.includes(p.id) ? 'detached' : ''}" data-part="${p.id}"><span class="number">${String(i + 1).padStart(2, '0')}</span><span class="dot"></span>${p.name}<span class="arrow">↗</span></button>`).join('');
  const detached=state.removed.filter(id=>!['adjust','slide'].includes(byId[id].kind));
  $('partCount').textContent=parts.length;
  $('assemblyText').textContent=state.removed.length ? `${detached.length}部品を取り外し · ${state.removed.includes('rearSlide')?'チェーン：緩め':'チェーン：張りあり'}` : 'すべて装着済み';
  $('chainStatus').textContent=state.removed.includes('chain')?'チェーン：取り外し済み':state.removed.includes('chainLink')?'チェーン：接続が開いています':state.removed.includes('rearSlide')?'チェーン：張りを抜いた状態':'チェーン：接続・張りあり';
  $('undo').disabled = !history.length || isBusy();
  if (guide) {
    $('lesson').value = state.lesson;
    $('lessonProgress').textContent = st ? `STEP ${state.step + 1}` : '✓ レッスン完了';
    $('lessonTotal').textContent = `/ ${lessons[state.lesson].steps.length}`;
    $('lessonBar').style.width = `${state.step / lessons[state.lesson].steps.length * 100}%`;
    $('stepTitle').textContent = st?.title || '組み立てまで、完了。';
    $('stepText').textContent = st ? st.text : 'おつかれさまでした。別の部位を選んで練習するか、フリーモードで自由に触ってみよう。';
    $('guideCheck').hidden = !!st && st.act !== 'check';
    $('guideCheck').textContent = st ? '確認して次へ →' : 'もう一度練習する ↺';
    $('guideFocus').hidden = !st;
  }
  studio?.sync(state);
  lastAimKey = '';
  aimStatus(studio?.aim);
  save();
}
function startGuide(index) {
  if (isBusy()) { toast('いまの作業を終了してください。'); return; }
  snapshot();
  state.mode = 'guide'; state.lesson = index; state.step = 0; state.removed = []; state.locations = {};
  dismissEntry();
  studio?.setMode('fps');
  render();
  studio?.focus(step().part);
  $('guidePanel').classList.remove('expanded');
  toast('組み立て状態から整備を始めます。');
}
function checkStep() {
  if (isBusy()) return;
  if (!step()) { startGuide(state.lesson); return; }
  if (step().act !== 'check') return;
  snapshot(); advance(); render(); if(step())studio.focus(step().part);
}
function interact() {
  if (work) return;
  if (studio.carry) { dropPart(); return; }
  const aim = studio.aim;
  if (studio.mode !== 'fps') { toast('一人称モードに切り替えて作業してください。'); return; }
  if (!aim) { toast('視点中央を作業したい部品に合わせてください。'); return; }
  if (aim.distance > 1.85) { toast('自転車にもう少し近づいてください。'); return; }
  const p = byId[aim.id], remove = !state.removed.includes(p.id), st = step();
  if (state.mode === 'guide') {
    if (!st) { toast('レッスンは完了しています。'); return; }
    if (st.part !== p.id) { toast(`今回の対象は「${byId[st.part].name}」です。`); return; }
    if (st.act === 'check') { checkStep(); return; }
  }
  if (state.tool !== p.tool) { toast(`「${toolName(p.tool)}」を持つと操作できます。`); return; }
  const reason = blockReason(state.removed, p.id, remove);
  if (reason) { toast(reason); return; }
  dismissEntry(); $('partsPanel').hidden = true;
  work = { id: p.id, remove, progress: 0, duration: isRotary(p.id) ? (p.turns||3)*1.2 : 2.5, direction };
  studio.unlock();
  held = false;
  studio.engage(p.id);
  $('workshop').classList.add('operating');
  $('crosshair').classList.add('engaged');
  $('workOverlay').hidden = false;
  $('operationTag').textContent = p.tool === 'hand' ? 'HANDS ON' : 'TOOL ENGAGED';
  $('operationName').textContent = `${p.name}を${actionName(p.id,remove)}`;
  const rotary=isRotary(p.id);
  $('operationInstruction').textContent=rotary ? `${p.id==='leftPedal'?'左ペダルは逆ねじ。':'通常の右ねじ。'}工具を当てる側から見た向きです。ダイヤルをなぞるか、回転ボタンを長押し。` : p.desc;
  $('holdAction').textContent=p.kind==='slide'?(remove?'長押しで後輪を前へ':'長押しで後輪を後ろへ'):p.kind==='clip'?(remove?'長押しでクリップを滑らせる':'長押しでクリップをはめる'):'長押しでゆっくり動かす';
  $('holdAction').hidden=rotary;
  $('turnControls').hidden=!rotary;
  $('reverseDirection').hidden=!rotary;
  $('operationTip').textContent=p.tip;
  $('threadGuide').textContent=rotary?`必要な方向：${requiredDirection(p.id,remove)==='cw'?'↷ 時計回り':'↶ 反時計回り'} · ${p.kind==='adjust'?'調整ねじの頭':p.side===-1?'左側':p.side===1?'右側':'ボルト頭'}から見た向き`:'回転ではなく、部品の移動を操作します';
  updateOperation();
  render();
}
function updateOperation() {
  if (!work) return;
  $('workProgress').style.width = `${work.progress * 100}%`;
  $('workAmount').textContent = `${Math.round(work.progress * 100)}%`;
  $('workDirection').textContent = !isRotary(work.id) ? (work.remove ? '引き抜く' : '差し込む') : work.direction === 'ccw' ? '↶ 反時計回り' : '↷ 時計回り';
  $('holdAction').classList.toggle('working', held);
  $('turnControls').classList.toggle('working',held);
  const angle=work.progress*(byId[work.id].turns||3)*360*(work.direction==='cw'?1:-1);
  $('dialArm').style.transform=`rotate(${angle}deg)`;
  $('workPhase').textContent=isRotary(work.id)?`${work.progress<.18?(work.remove?'固定を緩める':'ねじ山を合わせる'):work.progress<.85?'ねじを送る':work.remove?'ねじが抜ける':'座面に近づく'} · ${(work.progress*(byId[work.id].turns||3)).toFixed(1)}回転（模擬）`:byId[work.id].kind==='slide'?'後輪位置とチェーンのたるみが変化します':work.id==='chain'?'リンクがたわみ、歯から離れます':'位置を確認しながら動かします';
}
function hold(value) {
  if (!work) return;
  if (!value && held) { tick(0); if (!work) return; }
  if (value && isRotary(work.id) && work.direction !== requiredDirection(work.id, work.remove)) {
    toast(work.id === 'leftPedal' ? '左ペダルは逆ねじです。必要な方向のボタンを長押ししてください。' : '回す向きが逆です。必要な方向のボタンを長押ししてください。');
    held = false;
  } else { if (value && !held) work.lastHeld = performance.now(); held = value; }
  updateOperation();
}
function tick(dt) {
  if (!work) return;
  if (held) { const now = performance.now(); const elapsed = Math.max(0, now - (work.lastHeld || now)) / 1000; work.lastHeld = now; work.progress = Math.min(1, work.progress + elapsed / work.duration); }
  studio?.setWork(work.progress, held, work.direction);
  if (held) updateOperation();
  if (work.progress < 1) return;
  const finished = work;
  snapshot();
  state.removed = applyPart(state.removed, work.id, work.remove);
  delete state.locations[work.id];
  if (state.mode === 'guide') advance();
  cancelWork(false);
  render();
  toast(`${byId[finished.id].name}：${actionName(finished.id,finished.remove)} 完了`);
  if(state.mode==='guide'&&step()) studio.focus(step().part);
}
function cancelWork(showMessage = true) {
  if (!work) return;
  const hadProgress = work.progress > 0;
  work = null; held = false;
  studio.disengage();
  $('workOverlay').hidden = true;
  $('workshop').classList.remove('operating');
  $('crosshair').classList.remove('engaged');
  render();
  if (showMessage && hadProgress) toast('作業を中断しました。部品は作業前の状態です。');
}
function reverse() {
  if (!work || !isRotary(work.id)) return;
  held = false;
  work.direction = work.direction === 'ccw' ? 'cw' : 'ccw';
  direction = work.direction;
  updateOperation();
}
function grabPart() {
  if (work) return;
  if (studio.carry) { dropPart(); return; }
  const aim = studio.aim;
  if (!aim || aim.distance > 1.85 || !state.removed.includes(aim.id) || ['adjust','slide'].includes(byId[aim.id].kind)) { toast('取り外した部品に近づいてください。'); return; }
  if (state.mode === 'guide') { toast('部品を自由に運ぶ操作はフリーモードで使えます。'); return; }
  if (state.tool !== 'hand') { toast('1キーで「手で操作」に持ち替えてください。'); return; }
  snapshot();
  studio.grab(aim.id);
  dismissEntry();
  $('carryNotice').hidden = false;
  $('carryName').textContent = `${byId[aim.id].name}を持っています`;
  $('aimName').textContent = '部品を運ぶ';
  $('aimDetail').textContent = 'Gで床に置く · 下のボタンでも操作できます';
  render();
}
function dropPart() {
  const item = studio.drop();
  if (!item) return;
  state.locations[item.id] = item.offset;
  $('carryNotice').hidden = true;
  render();
  toast('部品を床に置きました。');
}
function crouch() {
  if (work) return;
  const value = studio.crouch();
  studio.crouchMoving = true;
  $('crouch').setAttribute('aria-pressed', String(value));
  $('crouch').textContent = value ? 'C 立つ' : 'C しゃがむ';
}
$('closeModal').onclick = () => $('modal').close();
$('modal').onclick = e => { if (e.target === $('modal')) $('modal').close(); };
$('tools').onclick = e => { const b = e.target.closest('[data-tool]'); if (b) selectedTool(toolDefs.findIndex(t => t[0] === b.dataset.tool)); };
$('freeMode').onclick = () => { if (isBusy()) { toast('いまの作業を終了してください。'); return; } state.mode = 'free'; render(); };
$('guideMode').onclick = () => { if (state.mode !== 'guide') startGuide(state.lesson); };
$('lesson').innerHTML = lessons.map((l,i) => `<option value="${i}">${l.name}</option>`).join('');
$('lesson').onchange = e => { if (isBusy()) { $('lesson').value = state.lesson; return; } startGuide(Number(e.target.value)); };
$('guideCheck').onclick = checkStep;
$('guideFocus').onclick = () => { if (!isBusy() && step()) { studio.setMode('fps'); studio.focus(step().part); } };
$('interact').onclick = interact;
$('grab').onclick = grabPart;
$('crouch').onclick = crouch;
$('placePart').onclick = dropPart;
$('returnPart').onclick = () => {
  const item = studio.drop();
  if (!item) return;
  delete state.locations[item.id];
  $('carryNotice').hidden = true;
  render();
  studio.focus(item.id);
  toast('取り外した直後の作業位置に戻しました。');
};
$('holdAction').addEventListener('pointerdown', e => { e.preventDefault(); e.target.setPointerCapture(e.pointerId); hold(true); });
$('holdAction').addEventListener('pointerup', () => hold(false));
$('holdAction').addEventListener('pointercancel', () => hold(false));
$('holdAction').addEventListener('lostpointercapture', () => hold(false));
$('reverseDirection').onclick = reverse;
$('cancelWork').onclick = () => cancelWork();
$('startFps').onclick = () => { dismissEntry(); studio.lock(); };
$('dismissEntry').onclick = () => { dismissEntry(); $('viewport').focus({ preventScroll: true }); };
$('fpsMode').onclick = () => { studio.setMode('fps'); };
$('orbitMode').onclick = () => { dismissEntry(); studio.setMode('orbit'); };
$('resetView').onclick = () => { if (!isBusy()) studio.home(); };
$('fullscreen').onclick = async () => {
  try { if (document.fullscreenElement) await document.exitFullscreen(); else await $('workshop').requestFullscreen(); }
  catch { toast('この環境では全画面表示を利用できません。'); }
};
$('toggleParts').onclick = () => { if (isBusy()) return; studio.unlock(); $('partsPanel').hidden = !$('partsPanel').hidden; };
$('closeParts').onclick = () => { $('partsPanel').hidden = true; };
$('partList').onclick = e => {
  const b = e.target.closest('[data-part]');
  if (!b || isBusy()) return;
  studio.setMode('fps'); studio.focus(b.dataset.part);
  $('partsPanel').hidden = true; dismissEntry();
};
$('undo').onclick = () => {
  if (!history.length || isBusy()) return;
  state = JSON.parse(history.pop());
  render(); toast('ひとつ前の状態に戻しました。');
};
$('reset').onclick = () => {
  if (isBusy()) return;
  showModal('<span class="eyebrow">RESET WORKSHOP</span><h2>自転車を組み直しますか？</h2><p>取り外した部品と置いた位置を元に戻し、整備ガイドを最初の手順に戻します。「戻す」で取り消せます。</p><button id="confirmReset" class="accent">組み立て状態に戻す ↺</button>');
  $('confirmReset').onclick = () => { snapshot(); state.removed = []; state.locations = {}; state.step = 0; $('modal').close(); render(); };
};
$('guideToggle').onclick=()=>{
  const expanded=$('guidePanel').classList.toggle('expanded');
  $('guideToggle').setAttribute('aria-expanded',String(expanded));
  $('guideToggle').textContent=expanded?'解説を閉じる −':'解説を読む ＋';
};
for(const button of document.querySelectorAll('[data-turn]')) {
  button.addEventListener('pointerdown',e=>{
    e.preventDefault(); if(!work)return;
    button.setPointerCapture(e.pointerId); hold(false);
    if(!work)return;
    work.direction=button.dataset.turn; direction=work.direction; hold(true);
  });
  for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,()=>hold(false));
  button.addEventListener('keydown',e=>{if(e.code==='Enter'||e.code==='Space'){e.preventDefault();if(work){work.direction=button.dataset.turn;hold(true);}}});
  button.addEventListener('keyup',e=>{if(e.code==='Enter'||e.code==='Space')hold(false);});
}
let dialPointer=null;
const dial=$('turnDial');
const dialAngle=e=>{const r=dial.getBoundingClientRect();return Math.atan2(e.clientY-r.top-r.height/2,e.clientX-r.left-r.width/2);};
dial.addEventListener('pointerdown',e=>{
  if(!work||!isRotary(work.id)||dialPointer)return;
  e.preventDefault();hold(false);if(!work)return;
  dial.setPointerCapture(e.pointerId);dialPointer={id:e.pointerId,angle:dialAngle(e)};
});
dial.addEventListener('pointermove',e=>{
  if(!work||dialPointer?.id!==e.pointerId)return;
  const a=dialAngle(e),delta=Math.atan2(Math.sin(a-dialPointer.angle),Math.cos(a-dialPointer.angle));
  dialPointer.angle=a;
  if(Math.abs(delta)>.7)return;
  const d=delta>0?'cw':'ccw';
  if(Math.abs(delta)<.01)return;
  if(d!==requiredDirection(work.id,work.remove)) {
    dial.classList.add('wrong');
    $('workPhase').textContent='逆方向です。矢印の方向へ回してください。';return;
  }
  dial.classList.remove('wrong'); work.direction=d;direction=d;
  work.progress=turnProgress(work.id,work.remove,work.progress,delta);
  updateOperation();tick(0);
});
for(const event of ['pointerup','pointercancel','lostpointercapture'])dial.addEventListener(event,()=>{dialPointer=null;dial.classList.remove('wrong');});
const stick=$('moveStick'),knob=$('stickKnob'); let stickId=null;
function moveStick(e) {
  const r=stick.getBoundingClientRect(),x=(e.clientX-r.left-r.width/2)/(r.width*.34),y=(e.clientY-r.top-r.height/2)/(r.height*.34),length=Math.max(1,Math.hypot(x,y));
  studio.moveAxis={x:x/length,y:y/length};knob.style.transform=`translate(${x/length*28}px,${y/length*28}px)`;
}
stick.addEventListener('pointerdown',e=>{if(work||studio.mode!=='fps'||stickId!==null)return;e.preventDefault();stickId=e.pointerId;stick.setPointerCapture(e.pointerId);dismissEntry();moveStick(e);});
stick.addEventListener('pointermove',e=>{if(e.pointerId===stickId)moveStick(e);});
for(const event of ['pointerup','pointercancel','lostpointercapture'])stick.addEventListener(event,()=>{stickId=null;studio.moveAxis={x:0,y:0};knob.style.transform='';});
$('help').onclick = () => showModal(`<span class="eyebrow">FIRST PERSON WORKSHOP</span><h2>持つ。近づく。手を動かす。</h2><table><tr><td>WASD / 矢印</td><td>自転車の周りを移動</td></tr><tr><td>ドラッグ / マウス</td><td>視点を動かす。最初のボタンでマウス視点を有効化</td></tr><tr><td>C</td><td>しゃがむ / 立つ</td></tr><tr><td>1〜5</td><td>手・スパナ・六角レンチ・ペダルレンチ・ラジオペンチ</td></tr><tr><td>E</td><td>狙った部品に工具を合わせる</td></tr><tr><td>左ボタン長押し / Space</td><td>工具を動かす。離すと一時停止</td></tr><tr><td>R</td><td>時計回り / 反時計回り。ねじ頭側から見た方向</td></tr><tr><td>G</td><td>外した部品を持つ / 床に置く（手・フリーモード）</td></tr><tr><td>Esc</td><td>作業を中断 / マウス視点を解除</td></tr></table><p>パーツ一覧から近くへ移動することもできます。取り付けは外した部品を狙い、同じ工具で逆方向に操作します。</p><p>観察モードではドラッグで車体を回して確認できます。スマートフォンでは左下のスティックで移動、3D画面を別の指でスワイプして視点操作。部品を選ぶと近づけます。作業中はダイヤルをなぞるか、方向別ボタンを長押ししてください。</p><button id="lockFromHelp" class="accent">マウスで視点操作を始める ↗</button>`);
$('modalBody').addEventListener('click', e => { if (e.target.id === 'lockFromHelp') { $('modal').close(); dismissEntry(); studio.lock(); } });
$('sources').onclick = () => showModal(`<span class="eyebrow">REFERENCE & SCOPE</span><h2>STAR BICYCLEの形を参考に。</h2><p>公式のRadball車体画像を参考に、車輪とフレームの比率、水平に後方へ伸びるサドル支持部、前上方へ曲がる細身のハンドル、ストレートな前フォークを描き直しました。メーカー提供のCADではなく、寸法は画像から近似しています。</p><p>非公式の学習用モデルです。左右別々の車軸ナットと張り調整ねじ、ローラーとプレートのあるチェーン、クリップ式の接続部を操作できます。接続方式と調整ねじは一般的な構造を採用した学習モデルで、STARの実車仕様を断定するものではありません。回転数・移動量は模擬値です。工具寸法・締付トルク・チェーンの張り量・摩耗の正確な診断は未対応です。実車の手順・規格はメーカーの資料を確認してください。</p><p><a href="https://www.starbicycle.com/bike-customizer/radball" target="_blank" rel="noopener">STAR BICYCLE — Radball（形状の参考）</a><br><a href="https://www.parktool.com/en-us/blog/repair-help/pedal-installation-and-removal" target="_blank" rel="noopener">Park Tool — ペダルの脱着</a><br><a href="https://www.parktool.com/en-us/blog/repair-help/chain-replacement-single-speed-bikes" target="_blank" rel="noopener">Park Tool — シングルスピードのチェーン交換</a><br><a href="https://www.parktool.com/en-int/blog/repair-help/wheel-removal-and-installation" target="_blank" rel="noopener">Park Tool — ホイールの脱着</a></p>`);
try {
  studio = new Workshop($('viewport'), {
    aim: aimStatus, tick, interact, hold, reverse, grab: grabPart, crouch,
    selectTool: selectedTool, cancel: cancelWork, message: toast,
    mode: mode => {
      $('workshop').classList.toggle('orbit', mode === 'orbit');
      $('fpsMode').classList.toggle('active', mode === 'fps');
      $('orbitMode').classList.toggle('active', mode === 'orbit');
      lastAimKey = ''; aimStatus(studio?.aim);
    },
    inspect: id => { studio.setMode('fps'); studio.focus(id); dismissEntry(); },
    lockChanged: locked => { $('movementStatus').textContent = locked ? 'マウスで視点 · WASDで移動 · Escで解除' : 'WASD 移動 · C しゃがむ · ドラッグで視点'; }
  });
  $('loading').hidden = true;
  $('rendererStatus').textContent = studio.software ? '軽量3D表示' : '3D WORKSPACE';
  render();
  if (state.mode === 'guide') { dismissEntry(); if (step()) studio.focus(step().part); }
} catch (e) {
  console.error(e);
  $('loading').textContent = '3D表示を開始できませんでした。ページを再読み込みしてください。';
}
