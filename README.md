# Cycleball Workshop

サイクルサッカーの自転車を、一人称視点で分解・組み立てする学習用ワークショップ。

## 操作

- WASD / 矢印: 自転車の周りを移動
- マウスまたはドラッグ: 視点操作
- C: しゃがむ / 立つ
- 1〜4: 手・スパナ・六角レンチ・ペダルレンチ
- E: 照準の部品に工具を合わせる（適合工具・距離・作業順を確認）
- 左ボタン / Space 長押し: 工具を回す・部品を引き抜く。離すと停止
- R: 時計回り / 反時計回り
- G: 外した部品を持つ / 床に置く（フリーモード、手）
- Esc: 作業中断・ポインターロック解除

パーツ一覧から対象の近くへ移動できます。観察モードはOrbitControlsで回転・拡大できます。スマートフォン用の移動・作業ボタンもあります。

## 形状

STAR BICYCLE公式Radballページの車体画像を参考に、水平に後方へ伸びるサドル支持部、トップチューブ・シートステーの位置、車輪間隔、小径チェーンリング、前上方へ曲がる細身のハンドル、ストレートフォークを近似した手続き型3Dモデルです。

- 参考: https://www.starbicycle.com/bike-customizer/radball
- 参照画像: https://cdn.prod.website-files.com/5bcae6d91740e33ea6b9c593/5c65d171782e386af6e0168c_sb-radball-mockup.png
- 写真ファイル・メーカーのロゴは配布物に含めていません。
- 非公式モデルです。メーカー提供CAD・実測寸法ではありません。
- 11ユニット。左右ナットはまとめて扱います。フレーム・フォーク・クランク・ベアリング内部の分解は未対応。
- 固定部の内部構造、寸法、トルク、チェーン張り・摩耗診断は厳密には再現しません。

## ローカル実行

外部パッケージのインストール・ビルドは不要です。Python 3があれば:

```bash
python -m http.server 8080 --directory dist
```

ブラウザーで http://localhost:8080 を開きます。ES Modulesのためfile://では動きません。

```bash
npm test
npm run check
```

Node.js 20以上。Three.js 0.180.0と必要な拡張をdistに同梱し、3DのCDN依存を避けています。Google Fontsは任意で、読み込めない場合はシステムフォントに戻ります。ライセンスはdist/THREE-LICENSE.txt。

## 公開

公開サイト: https://kodaka-yutaro.github.io/cycleball-workshop/

GitHub Pagesで`dist/`を配信しています。`main`へのpushで`.github/workflows/pages.yml`が構文チェックとテストを実行し、成功するとサイトを自動更新します。Actions画面から手動で再公開することもできます。

- PagesのSource: GitHub Actions
- 配信ディレクトリ: dist
- サーバー・APIキー・ビルド用パッケージのインストール: 不要
- カスタムドメイン候補: cycleball.kdking-tools.com（未接続）

独自ドメインへの切り替えにはGitHub Pages側とDNS側の設定が必要です。旧ChatGPT Sites試作用のDNSレコードは使用しません。

## 実装

- dist/engine.js: モデル、部品の当たり判定、FPS移動、工具と手の3Dモーション、部品運搬
- dist/app.js: フリー/ガイド、長押し・中断・逆回転、保存、UI
- dist/mechanics.js: 分解・組立の依存関係、ねじ方向、保存位置の検証
- dist/data.js: 部品と5種類のレッスン
- dist/index.html / dist/style.css: 画面とレスポンシブUI

作業状態はブラウザー内に保存されます。WebGLが使えない環境ではSVGRendererによる軽量3Dに切り替わります。

## 検証 (2026-10-22)

- 全5レッスンの分解/組立順、全部品の再組立、左右ペダルのねじ方向、保存位置の検証: Nodeテスト5件成功
- ブラウザー: 工具不一致、照準・工具の適合、長押しの途中停止/再開、前輪ナットと前輪の取り外し、部品の運搬/床への配置を確認
- ブラウザー: 左右ペダルの整備ガイドを再組立完了まで確認。左逆ねじへの誤方向操作を拒否
- 検証ブラウザーはWebGL非対応のため、GPU描画の見た目・ポインターロックは実機で最終確認が必要。軽量3Dとドラッグ操作で検証
