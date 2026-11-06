# Dark Veil — 月影の還り人（ブラウザ版 α0.29）

このフォルダーはゲームの公開用ルートです。HTML・CSS・JavaScriptと画像、CSV、マップ・仕様書を含みます。ビルドは不要です。

## GitHub Pages で公開

1. このZIPを展開します。
2. GitHubに新しいリポジトリを作成し、展開フォルダーの中身をそのままアップロードしてコミットします。index.html がリポジトリの最上位に見えることを確認してください。
3. Settings → Pages → Build and deployment で Deploy from a branch を選び、main と / (root) を指定して保存します。
4. 公開が完了したら同じ画面からサイトを開けます。

## データを編集する場所

- database/characters.csv、enemies.csv、items.csv、weapons.csv：味方・敵・アイテム・武器の定義。列の説明は database/README.txt。
- specs/maps/ash-cemetery.txt：灰の墓地の地形・高度・配置。
- specs/game-system.txt：ゲーム仕様書 ver3.10。
- assets/：顔アイコン・キャラクターチップ・背景。

## ローカル試遊

フォルダーをターミナルで開き、Python 3 があれば python -m http.server 8000 （Windowsでは py -m http.server 8000 でも可）を実行し、ブラウザーで http://localhost:8000/ を開いてください。
