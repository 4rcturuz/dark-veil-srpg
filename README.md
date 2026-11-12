# Dark Veil — 月影の還り人（ブラウザ版 α0.34.1）

このフォルダーはゲームの公開用ルートです。HTML・CSS・JavaScriptと画像、CSV、マップ・仕様書を含みます。ビルドは不要です。

## GitHub Pages で公開

1. このZIPを展開します。
2. GitHubに新しいリポジトリを作成し、展開フォルダーの中身をそのままアップロードしてコミットします。index.html がリポジトリの最上位に見えることを確認してください。
3. Settings → Pages → Build and deployment で Deploy from a branch を選び、main と / (root) を指定して保存します。
4. 公開が完了したら同じ画面からサイトを開けます。

## 今回の更新（α0.34.1）

おりおんのフェイスアイコンを公開先に補完する画像ファイルと、星詠みのキャラクター紹介文の更新を収録しています。街道・狂獣薬・エレナを含むα0.34が導入済みの環境用です。

### おりおんの画像が表示されない原因

2026-11-12に公開版を調査し、face-icons.js の参照は存在する一方、assets/orion-portrait.png がHTTP 404となることを確認しました。GitHub mainのassets直下にも画像がありません。前回のα0.34配布ZIPには画像が入っているため、公開先の指定パスへの配置が欠落しています。

この更新ZIPに提供原本の assets/orion-portrait.png と既存の face-icons.js を再収録しています。ファイル名の大文字・小文字と配置先をそのまま維持してください。

### 星詠みの紹介

紹介文はチュートリアル①幕間・②の台詞と採用済みスキルに基づき拡充。代表台詞には「いつもどおり、わたしが前衛やります？」を原文のまま採用しました。変更の正本は database/characters.csv です。

## 公開済みGitHub Pagesの更新手順

1. DarkVeil-alpha0.34.1-update.zip をダウンロードして展開します。
2. https://github.com/4rcturuz/dark-veil-srpg の main の最上位から Add file → Upload files を開きます。
3. ZIPの中身を同じ階層で上書きします。ZIP自体や外側のフォルダーは入れず、assetsフォルダーごと追加してください。既存のassetsは削除しません。
4. コミット後、ActionsでPagesのデプロイ成功を確認します。
5. https://4rcturuz.github.io/dark-veil-srpg/assets/orion-portrait.png を開き、画像単体が表示されることを確認します。
6. ゲームを Ctrl+Shift+R で再読み込みし、タイトルのα 0.34.1、拠点・キャラクター詳細のおりおんの顔、星詠みの紹介文を確認します。

公開URLとセーブ形式は変わりません。GitHubへの反映は上記アップロード時に行われます。

## データを編集する場所

- database/characters.csv、enemies.csv、items.csv、weapons.csv：味方・敵・アイテム・武器の定義。列の説明は database/README.txt。
- specs/maps/ash-cemetery.txt：灰の墓地の地形・高度・配置。
- specs/game-system.txt：ゲーム仕様書 ver3.15.1。
- assets/：顔アイコン・キャラクターチップ・背景。

## ローカル試遊

フォルダーをターミナルで開き、Python 3 があれば python -m http.server 8000 （Windowsでは py -m http.server 8000 でも可）を実行し、ブラウザーで http://localhost:8000/ を開いてください。

GitHubのブラウザーアップロードは一度に100ファイルまで、1ファイル25MiBまでです。差分ZIPは一度のアップロードに収まる構成です。ZIP自体をリポジトリへ置かず、展開した中身を追加してください。
公式手順：https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository
