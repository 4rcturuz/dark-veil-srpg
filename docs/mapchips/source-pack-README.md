# DarkVeil マップ素材パック v1.0

生成済みA–E原画を加工した、GitHubリポジトリへ追加するための素材一式です。
基準確認：DarkVeil alpha0.32（Canvas 2D、8方向、固定俯瞰）。

## 内容

| 収納先 | 内容 | 画像数 |
|---|---|---:|
| assets/field/ground/ | 地表材質256×256、1枚=4×4マス | 12 |
| assets/field/faces/ | 側面材質256×256 | 5 |
| assets/field/decals/ | 地表装飾、面装飾のシート | 2 |
| assets/field/fx/ | 電弧 | 1 |
| assets/field/parts/ | 低い物体、墓石、柵、聖堂扉、墓地門 | 5 |
| assets/field/objects/ | 灌木・焼木・台座の8方向シート | 3 |
| assets/units/adarius/ | 台座を除いた本体8方向 | 1 |

**WebP画像29枚、合計 2,863,196 bytes（2.73 MiB）**。
画像は全て可逆WebP。切抜き素材はアルファ付き。128角または256角の方向シートは1列×8段です。
展開後RGBA8換算は約18.69 MiB（ブラウザ側コピー・キャッシュは別）。

## GitHubへの追加

1. ZIPを展開する。
2. 中の `assets/`、`runtime/`、`docs/`、`mapchip-preview.html`、`MAPCHIPS_README.md` を、ゲームの `index.html` と同じ階層へ追加する。
3. 既存の `assets/` はフォルダーごと置き換えて削除せず、内容を追加する。
4. GitHubへコミットする。ZIPそのものを置くだけではゲームから画像を参照できない。

このパックは既存のindex.html、render.js、character-sprites.jsを上書きしません。
**画像を追加しただけで既存マップの外観が自動変更されるものではありません。** 描画側から読み込む組込み工程が別途必要です。

## 素材確認

`mapchip-preview.html` をブラウザで開くと、29画像の読込、8方向切替、倍率、接地点、3×3反復、部品を確認できます。
ページは外部CDN・外部通信に依存せず、同梱画像を相対パスで参照します。ローカルファイルとしても閲覧できます。
GitHub Pagesでは既存ゲームのURL末尾に `mapchip-preview.html` を追加して開けます。

## データ仕様

- `assets/field/manifest.json`：実画像の寸法、ハッシュ、元ファイル、領域座標、方向シート、接地点。
- `assets/units/adarius/sprite.json`：本体だけのスプライト定義。
- `docs/mapchips/placement_recipes.json`：配置と組立の指針。地形ロジックを書き換えない。
- `docs/mapchips/source_catalog.json`：採用元原画名とハッシュ。
- `docs/mapchips/processing_log.json`：加工内容。アダリウス分離に使用した編集プロンプトも収録。
- `docs/mapchips/validation.json`：書出し・素材データと読み込み補助コードの検査結果。
- `CHECKSUMS.sha256`：配布ファイルのハッシュ。

ファイルパスはリポジトリのルートからの相対パスです。座標は左上原点、`rect=[x,y,w,h]`。
`rect` はシート上の収納領域、`contentRect` は透明余白を除いた収納画像の領域です。
部品を独立表示するときはcontentRectを使えます。面へ貼るときは元の部材の取付位置・UVを別途定義してください。
門や扉の各部品は独立した面素材であり、シート上の位置がゲーム内の組立位置を意味するものではありません。

## アダリウス

原画8方向を画像編集で本体と台座に分離し、隠れていた台座上面を補完しました。
実装サイズへの縮小・シート収納・形式変換は画像生成ではなく、プログラムで処理しました。

- 本体：`assets/units/adarius/idle-sheet.webp`、256×2048。
- 台座：`assets/field/objects/adarius_pedestal.webp`、256×2048。
- 方向順：V0正面、V1右斜め前、V2右、V3右斜め後、V4背面、V5左斜め後、V6左、V7左斜め前。
- 本体anchor=(128,224)、台座底面anchor=(128,192)。全方向で同じ接地位置に合わせています。
- 本体・台座ともdrawWidth=128（マップのパン/ズーム適用前）。台座上への取付位置はmountAnchorsを参照します。
- 実際の分離画像に合わせ、台座の取付高さを全方向32描画単位へ調整しました。前回仕様の暫定値24からの変更です。
- 休眠時は台座＋本体。覚醒後は同じ本体だけを移動。台座は元の位置に置き、通行条件を画像から追加しません。
- 敵ユニットの既存IDはcem-adarius。画像キーadariusとの対応付けが必要です。
- 静止8方向のみ。歩行・攻撃・被弾・死亡の専用コマ画像は含みません。

## 任意の読み込み補助

`runtime/field-art.js` は追加用のCanvas 2Dモジュールです。既存ゲームを自動変更しません。
WebサーバーまたはGitHub Pages上で使用してください（JSONのfetchを使用）。

```javascript
import { FieldArt, directionFrame } from './runtime/field-art.js';
const art = await FieldArt.load();

// 以下はMapViewのpan/zoomを適用したCanvasコンテキスト内で行う。
const d = directionFrame(unit.facing, mapView.yaw, battle.map.invertY);
art.drawSprite(ctx, 'adarius', d, screenFootX, screenFootY);

// 休眠像は同じ本体を台座の上へ取り付ける。
art.drawDormantAdarius(ctx, d, statueCenterX, statueCenterY);

// 地表テクスチャは世界座標に固定する変換を別途設定する。
const pattern = art.pattern(ctx, 'G01');
// pattern.setTransform(worldTextureToCanvasMatrix);
// ctx.fillStyle = pattern; 対象の地表ポリゴン内へ描画する。
```

## 現行ゲームへ組み込む際の注意

alpha0.32のheavy分岐はadarius-awake.svgを先に描きます。新しい本体スプライトを優先するよう変更してください。
既存SheetCharacterSpritesはdrawWidth=80固定なので、登録するだけでは今回想定の巨像サイズになりません。
描画キーの解決、drawWidth、台座の独立表示、霧と奥行順、面材の投影は別途接続が必要です。
論理terrain ID、占有範囲、移動コスト、通行可否、高度と画像は独立して扱ってください。

## 加工と検査の範囲

縮小にはアルファを考慮したLanczos再標本化を使用。背景を白/黒で塗り潰していません。
A/Bは低周波の境界差を調整し、外周3画素帯を整合させています。反復時の上下・左右の端画素は一致します。
石の目地などの模様まで完全に幾何学的接続を保証する処理ではありません。3×3反復はプレビューで確認できます。
灌木・焼木は系統内で共通倍率を使い、足元基準を揃えています。台座は全方向の取付高さを揃えました。
元の方向別原画は同一3Dモデルのレンダーではないため、細部・透視形状には方向差が残ります。
ゲーム全マップでの遮蔽やイベント動作は、この素材パックのブラウザ読込検査とは別に確認してください。

原画のPNGや不採用旧版は、軽量な配布パックには含めていません。原画は別に保持してください。

## 今回の実表示検証の制限

画像29枚のデコード・寸法・透過・ハッシュ・反復端・収納範囲と、Nodeによる読み込み補助コードの座標/128方向条件を検査済みです。
ブラウザの実表示は、実行環境の起動制限とfile URLアクセス制限により未検証です。
`docs/mapchips/adarius-directions.png` は書出し画像から組み立てた8方向確認図です。
