# Dark Veil — 月影の還り人（ブラウザ版 α0.30）

このフォルダーはゲームの公開用ルートです。HTML・CSS・JavaScriptと画像、CSV、マップ・仕様書を含みます。ビルドは不要です。

## GitHub Pages で公開

1. このZIPを展開します。
2. GitHubに新しいリポジトリを作成し、展開フォルダーの中身をそのままアップロードしてコミットします。index.html がリポジトリの最上位に見えることを確認してください。
3. Settings → Pages → Build and deployment で Deploy from a branch を選び、main と / (root) を指定して保存します。
4. 公開が完了したら同じ画面からサイトを開けます。

## 今回の更新（α0.30）

海音の通常攻撃は上下左右3マス、潮騒の祝福は海音中心の射程4を、コマンド選択直後から紫で表示します。選択した対象の効果範囲は通常攻撃が赤、回復が緑です。祝福の射程は従来どおり斜めを含む最大軸距離です。既存の能力値・セーブ形式は変更していません。

## 公開済みGitHub Pagesの更新手順

1. このZIPをPCにダウンロードして展開します。ZIPファイル自体はアップロードしません。
2. https://github.com/4rcturuz/dark-veil-srpg を開き、Codeタブでmainブランチを選びます。
3. Add file → Upload files を開きます。
4. 展開したフォルダーを開き、index.html、app.js、assets、database、specsなどが並んでいる階層の「中身すべて」をドラッグ＆ドロップします。外側のフォルダーを丸ごと入れず、既存の同じパスへ上書きします。
5. メッセージに「海音の攻撃・祝福の射程表示を修正（α0.30）」と入力し、Commit directly to the main branch を選んで Commit changes を押します。mainが保護されている場合は新しいブランチへコミットし、Pull Requestをmainへマージします。
6. Actionsタブで新しい pages build and deployment が緑のチェック（成功）になるのを待ちます。Settings → Pages の main / (root) は変更不要です。
7. https://4rcturuz.github.io/dark-veil-srpg/ を開き、WindowsのChromeでは Ctrl+Shift+R で再読み込みします。タイトル右上がα 0.30になったことを確認します。反映には最大10分ほどかかる場合があります。
8. 海音の通常攻撃／潮騒の祝福を選び、対象を指定する前から紫の射程表示が出ることを確認します。祝福で味方を選ぶと、緑の3×3効果範囲が重なります。壁・視界・マップ端・暗闇によって表示範囲は狭くなります。

公開URLは変わりません。既存リポジトリやセーブデータの削除は不要です。更新用ファイルの作成まで完了しており、GitHubのmainへの反映は上記のコミット時に行われます。

変更ファイル（旧α0.29との差分）：app.js、engine.js、render.js、style.css、debug-menu.js、specs/game-system.txt、implementation-notes.txt、README.md。公開用に.nojekyllも含めます。

公式手順：https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository
公開の確認：https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site

## データを編集する場所

- database/characters.csv、enemies.csv、items.csv、weapons.csv：味方・敵・アイテム・武器の定義。列の説明は database/README.txt。
- specs/maps/ash-cemetery.txt：灰の墓地の地形・高度・配置。
- specs/game-system.txt：ゲーム仕様書 ver3.11。
- assets/：顔アイコン・キャラクターチップ・背景。

## ローカル試遊

フォルダーをターミナルで開き、Python 3 があれば python -m http.server 8000 （Windowsでは py -m http.server 8000 でも可）を実行し、ブラウザーで http://localhost:8000/ を開いてください。
