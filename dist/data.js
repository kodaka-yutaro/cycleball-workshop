const icon=(body)=>`<svg viewBox="0 0 80 55" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
const icons={hand:icon('<path d="M28 42L18 30Q14 23 20 22L29 29V12Q29 5 34 9V25V7Q39 1 42 8V25V10Q48 5 50 12V27V18Q56 13 58 21V35Q57 49 45 49H38Q32 48 28 42Z"/>'),wrench:icon('<path d="M28 18L14 8Q8 23 21 29L49 48Q60 54 65 44Q68 37 60 32L33 19Q37 7 24 3L28 18Z" fill="#b6bdb5"/><circle cx="58" cy="41" r="3"/>'),hex:icon('<path d="M19 10H30V38H65V47H19Z" fill="#a8b3ad"/>'),pedal:icon('<path d="M30 15L19 7Q8 21 23 29L58 48L64 38L35 21L39 9Z" fill="#a8b3ad"/><path d="M42 32L59 43" stroke="#e55e38" stroke-width="7"/>'),wheel:icon('<circle cx="40" cy="27" r="24"/><circle cx="40" cy="27" r="20" stroke-width="1"/><path d="M40 3V51M16 27H64M23 10L57 44M23 44L57 10" stroke-width="1"/><circle cx="40" cy="27" r="4" fill="#e55e38"/>'),nut:icon('<path d="M27 8H52L65 28L52 47H27L15 28Z" fill="#bec4bb"/><circle cx="40" cy="28" r="10"/>'),bar:icon('<path d="M12 10V29Q12 40 24 40H56Q68 40 68 29V10" stroke-width="6"/><path d="M12 4V19M68 4V19" stroke="#555f54" stroke-width="8"/>'),seat:icon('<path d="M11 16Q25 5 46 15L68 24Q76 32 65 33H18Q6 33 11 16Z" fill="#515b51"/><path d="M42 34L24 49"/>'),chain:icon('<path d="M20 12H59Q75 14 72 28Q70 42 57 43H21Q6 40 8 26Q9 14 20 12Z" stroke-dasharray="3 4" stroke-width="6"/>'),pedalpart:icon('<path d="M17 17H64V40H17Z" fill="#667164"/><path d="M23 23H58V34H23ZM5 28H17"/><path d="M24 14V19M35 14V19M47 14V19M58 14V19M24 38V43M35 38V43M47 38V43M58 38V43"/>')};
icons.pliers=icon('<path d="M25 5L31 23L19 46M49 5L43 23L57 46M31 23L43 23" stroke-width="7"/><circle cx="37" cy="25" r="6"/>');
const toolDefs=[['hand','手で操作'],['wrench','スパナ'],['hex','六角レンチ'],['pedal','ペダルレンチ'],['pliers','ラジオペンチ']];
const parts=[
{id:'frontNuts',name:'前輪・右ナット',tool:'wrench',icon:'nut',side:1,turns:3,offset:[.15,-.1,.5],desc:'右側の車軸ナット。ナットの外側から見て反時計回りで外します。',tip:'車輪を支え、左右のナットを別々に操作します。'},
{id:'frontNutLeft',name:'前輪・左ナット',tool:'wrench',icon:'nut',side:-1,turns:3,offset:[.15,-.1,-.5],desc:'左側も通常の右ねじ。左ペダルとは異なり、外側から反時計回りで緩みます。',tip:'左側だから逆ねじ、とは限りません。'},
{id:'frontWheel',name:'フロントホイール',tool:'hand',icon:'wheel',offset:[.85,-.05,0],deps:['frontNuts','frontNutLeft'],desc:'左右のナットを外してから車軸を抜きます。',tip:'車軸を左右の受けに収め、センターと回転を確認します。'},
{id:'rearNuts',name:'後輪・右ナット',tool:'wrench',icon:'nut',side:1,turns:3,offset:[-.15,-.1,.5],desc:'チェーン側の車軸ナット。後輪を支えながら反時計回りで外します。',tip:'反対側のナットと張り調整ねじも解除してから後輪を動かします。'},
{id:'rearNutLeft',name:'後輪・左ナット',tool:'wrench',icon:'nut',side:-1,turns:3,offset:[-.15,-.1,-.5],desc:'後輪左側の車軸ナット。外側から反時計回りで外します。',tip:'組み付け時は左右の車軸位置と車輪の中心を確認します。'},
{id:'adjustRight',name:'右の張り調整ねじ',tool:'wrench',icon:'nut',kind:'adjust',side:1,turns:2,offset:[0,0,0],deps:['rearNuts','rearNutLeft'],desc:'後輪位置を保持する調整ねじの概念モデル。緩めて移動の余裕を作ります。',tip:'このモデルでは左右を解除した後、後輪を手で前へ動かします。'},
{id:'adjustLeft',name:'左の張り調整ねじ',tool:'wrench',icon:'nut',kind:'adjust',side:-1,turns:2,offset:[0,0,0],deps:['rearNuts','rearNutLeft'],desc:'左側の張り調整ねじ。右側と同じく、頭側から反時計回りで緩めます。',tip:'左右の調整量を揃えて後輪の向きを保ちます。'},
{id:'rearSlide',name:'後輪位置・チェーンの張り',tool:'hand',icon:'wheel',kind:'slide',offset:[.065,0,0],deps:['adjustRight','adjustLeft'],desc:'後輪を前へ寄せるとチェーンがたるみます。戻す操作では後方へ引き、張りを戻します。',tip:'張りの数値や適正判定は模擬です。実車では全周を回して確認します。'},
{id:'chainClip',name:'チェーン接続クリップ',tool:'pliers',icon:'chain',kind:'clip',offset:[0,.15,.38],deps:['rearSlide'],desc:'クリップ式マスターリンクを採用した学習モデル。ラジオペンチでクリップを横へ滑らせます。',tip:'回す部品ではありません。接続方式は実車のチェーンで確認してください。'},
{id:'chainLink',name:'接続プレート・ピン',tool:'hand',icon:'chain',offset:[0,-.1,.42],deps:['chainClip'],desc:'クリップを外し、外プレートと2本のピンを抜いてチェーンを開きます。',tip:'このモデルではプレートとピンを1ユニットとして扱います。'},
{id:'chain',name:'チェーン',tool:'hand',icon:'chain',offset:[.1,-.2,.65],deps:['chainLink'],desc:'開いたチェーンを前後の歯から順に離して取り出します。',tip:'組み立てはチェーンを掛け、プレート・ピン、クリップの順に接続します。'},
{id:'rearWheel',name:'リアホイール',tool:'hand',icon:'wheel',offset:[-.85,-.05,0],deps:['rearNuts','rearNutLeft','chain','rearSlide'],desc:'接続を開いてチェーンを取り出した後、後輪をフレームから抜きます。',tip:'車軸位置と中心、チェーンラインを確認します。'},
{id:'rightPedal',name:'右ペダル',tool:'pedal',icon:'pedalpart',side:1,turns:4,offset:[.1,0,.65],desc:'チェーン側。右ねじなので、外側から見て反時計回りで外します。',tip:'最初は手でまっすぐねじ込み、最後に工具で締めます。'},
{id:'leftPedal',name:'左ペダル',tool:'pedal',icon:'pedalpart',side:-1,turns:4,offset:[-.1,0,-.65],desc:'チェーンと反対側。逆ねじなので、外側から見て時計回りで外します。',tip:'左の車軸ナットは通常ねじ。左ペダルだけ逆ねじです。'},
{id:'barBolts',name:'ハンドル固定部',tool:'hex',icon:'nut',turns:3,offset:[.3,.35,.35],desc:'着脱式クランプの概念モデル。六角レンチで固定ボルトを操作します。',tip:'実車の固定方式・締付順序・トルクに従います。'},
{id:'handlebar',name:'ハンドル',tool:'hand',icon:'bar',offset:[.35,.75,0],deps:['barBolts'],desc:'前上方へ曲がるサイクルサッカーのハンドル。',tip:'元の角度と中心位置を記録します。'},
{id:'seatBolt',name:'シート固定部',tool:'hex',icon:'nut',turns:3,offset:[-.3,.25,.35],desc:'水平支持部を固定する六角ボルトの概念モデル。',tip:'最小挿入量・指定トルクは実車の資料を確認します。'},
{id:'saddle',name:'サドル・シートポスト',tool:'hand',icon:'seat',offset:[-.55,0,0],deps:['seatBolt'],desc:'水平な支持部を後方へ引き抜きます。サドルとポストは一体で扱います。',tip:'傷や変形、挿入量を確認します。'}];
const byId=Object.fromEntries(parts.map(p=>[p.id,p]));
const step=(part,act,title,text)=>({part,act,title,text});
const lessons=[{id:'front',name:'01  前輪の脱着',steps:[step('frontNuts','check','前輪を支える','自転車を安定させ、前輪が落ちないよう支えます。ナットとワッシャーの位置を確認しましょう。'),step('frontNuts','remove','右ナットを外す','右側から見て反時計回り。ダイヤルを回すか、回転ボタンを長押しします。'),step('frontNutLeft','remove','左ナットを外す','左側へ移動します。こちらもナットの外側から見て反時計回りです。'),step('frontWheel','remove','前輪を取り外す','「手で操作」に切り替え、前輪をフォークから取り外します。'),step('frontWheel','check','接触部を確認する','車軸、受け、タイヤに傷や異物がないかを観察する工程です。このモデルは状態を自動診断しません。'),step('frontWheel','install','前輪を取り付ける','左右の車軸をフォークの受けに収め、タイヤが中央に来ることを確認します。'),step('frontNutLeft','install','左ナットを締める','左側から見て時計回りで締めます。'),step('frontNuts','install','右ナットを締める','スパナを選んで時計回り。実車の指定トルクで締め付ける工程を再現します。'),step('frontWheel','check','最後の点検','車輪の固定、左右のガタ、スムーズな回転を確認して完了です。')]},
{id:'pedals',name:'02  左右ペダルの交換',steps:[step('rightPedal','check','左右を見分ける','右はチェーン側。左右は乗車した姿勢を基準にします。回す向きはペダル外側から見た向きです。'),step('rightPedal','remove','右ペダルを外す','ペダルレンチを選択し、反時計回りに回して外します。'),step('leftPedal','remove','左ペダルを外す','左は逆ねじです。ペダルレンチを選び、時計回りに回します。'),step('leftPedal','check','ねじ山を確認する','L・R表示とねじ山の傷を確認。実車の指示に従い清掃・潤滑します。'),step('leftPedal','install','左ペダルを取り付ける','左は反時計回り。実車では最初に手でねじ込み、最後に工具で指定トルクに締めます。'),step('rightPedal','install','右ペダルを取り付ける','右は時計回り。ねじが斜めに入っていないか確認して締めます。'),step('rightPedal','check','回転と固定を確認する','左右の回転・ガタ・固定を確認して完了です。')]},
{id:'rear',name:'03  チェーンと後輪の分解',steps:[
step('rearNuts','check','接続方式と位置を確認','このレッスンはクリップ式チェーンの学習モデルです。後輪位置・チェーンラインを記録し、車体を支えます。'),
step('rearNuts','remove','後輪・右ナットを外す','スパナで右のナットを反時計回り。後輪を支えたまま作業します。'),
step('rearNutLeft','remove','後輪・左ナットを外す','対象の近くへ移動し、左側から見て反時計回りに回します。'),
step('adjustRight','remove','右の調整ねじを緩める','頭側から見て反時計回り。ねじを戻して後輪を前へ動かす余裕を作ります。'),
step('adjustLeft','remove','左の調整ねじを緩める','左側も反時計回り。左右とも緩めてから後輪を動かします。'),
step('rearSlide','remove','後輪を前へ寄せる','手に持ち替えて操作。車軸が前へ動き、チェーンにたるみが生まれます。'),
step('chainClip','remove','接続クリップを外す','ラジオペンチを持ち、クリップを横へ滑らせます。ねじのようには回しません。'),
step('chainLink','remove','プレートとピンを抜く','手で外プレートとピンを引き抜きます。チェーンの接続が開きます。'),
step('chain','remove','チェーンを取り出す','開いたチェーンを歯から離します。チェーンがたわみ、前後の歯から外れていく様子を確認します。'),
step('rearWheel','remove','後輪を取り外す','チェーンが外れたことを確認し、後輪を支えて抜きます。'),
step('chain','check','リンクと歯を点検','ローラー・プレート・ピン・歯の汚れや摩耗を点検する工程です。数値診断は行いません。'),
step('rearWheel','install','後輪を戻す','左右の車軸を受けに戻します。まだ前寄りの位置で、張りを掛けません。'),
step('chain','install','歯にチェーンを掛ける','開いたチェーンを前後の歯へ掛けます。接続端はまだ開いた状態です。'),
step('chainLink','install','ピンとプレートを戻す','接続する端を合わせ、2本のピンとプレートを取り付けます。'),
step('chainClip','install','クリップをはめる','ラジオペンチで溝へ装着します。クリップの向き・確実なはまりは製品の指定を確認します。'),
step('rearSlide','install','後輪を引いて張りを戻す','手で後輪を後方へ移動。左右の位置を揃え、たるみを減らします。'),
step('adjustLeft','install','左の調整ねじを戻す','頭側から時計回り。ここでは記録した位置へ戻す操作を再現します。'),
step('adjustRight','install','右の調整ねじを戻す','頭側から時計回り。左右の後輪位置を揃えます。'),
step('chain','check','張りとチェーンラインを確認','クランクをゆっくり1周させ、最も張る位置でも適切な遊びがあるか確認する工程です。実車の規定に従います。'),
step('rearNutLeft','install','左ナットを固定','時計回りで固定します。画面の進捗は模擬値で、締付トルクではありません。'),
step('rearNuts','install','右ナットを固定','時計回りで固定。実車では指定トルクで締めます。'),
step('rearWheel','check','最後の点検','後輪の中心・左右の固定・接続部・全周の張りを確認して完了です。') ]},
{id:'bar',name:'04  ハンドルの脱着',steps:[step('handlebar','check','位置と方式を確認する','角度を記録し、固定方式を確認します。このレッスンは着脱式クランプの概念モデルです。'),step('barBolts','remove','固定部を外す','ハンドルを支えて六角レンチを選択。固定ボルトを反時計回りに緩める操作です。'),step('handlebar','remove','ハンドルを取り外す','手で支えながらハンドルを取り外します。'),step('handlebar','check','固定面を確認する','クランプとハンドルの接触面の傷・変形を確認する工程です。'),step('handlebar','install','ハンドルを戻す','記録した位置に戻し、左右の位置と角度を合わせます。'),step('barBolts','install','固定部を締める','実車の指定の順序・トルクに従い均等に締める工程を再現します。'),step('handlebar','check','固定を点検する','ハンドルがずれず、確実に固定されていることを確認します。')]},
{id:'seat',name:'05  サドル周りの脱着',steps:[step('saddle','check','サドル位置を記録する','サドルの前後位置、向き、水平支持部の挿入量を記録します。'),step('seatBolt','remove','固定を緩める','六角レンチを選び、反時計回りでシート固定部を緩めます。'),step('saddle','remove','ポストを抜く','水平に伸びるサドル支持部を後方へ引き抜きます。モデルではサドルと支持部を一体で扱います。'),step('saddle','check','ポストと内部を確認する','傷、変形、汚れを確認。材質に適した清掃・組付け処理を実車の指示に従って行います。'),step('saddle','install','ポストを戻す','最小挿入量を守り、記録した位置と向きに合わせます。'),step('seatBolt','install','固定部を締める','時計回りに締める工程です。実車の指定トルクを確認してください。'),step('saddle','check','固定を確認する','サドルとポストが動かず、確実に固定されていることを確認して完了です。')]}];

export { icons, toolDefs, parts, byId, lessons };
