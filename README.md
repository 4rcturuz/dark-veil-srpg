# Dark Veil — 月影の還り人（ブラウザ版 α0.31）

このフォルダーはゲームの公開用ルートです。HTML・CSS・JavaScriptと画像、CSV、マップ・仕様書を含みます。ビルドは不要です。

## GitHub Pages で公開

1. このZIPを展開します。
2. GitHubに新しいリポジトリを作成し、展開フォルダーの中身をそのままアップロードしてコミットします。index.html がリポジトリの最上位に見えることを確認してください。
3. Settings → Pages → Build and deployment で Deploy from a branch を選び、main と / (root) を指定して保存します。
4. 公開が完了したら同じ画面からサイトを開けます。

## 今回の更新（α0.31）

近接攻撃は赤、遠距離攻撃は紫で共通表示します。潮騒の祝福の指定射程は縦＋横≦4の菱形へ変更し、回復効果の3×3は維持しました。敵フェイズ中は《敵ユニット行動中…》を下部ウィンドウへ表示します。

カナタの顔・8方向チップ・固有武器と5技を追加しました。通常戦役の出撃準備で他の仲間1人を休息にし、カナタを出撃へ切り替えてください。既存セーブにも休息状態で追加されます。帳引きは「対象をマップで選ぶ→緑の空きマスを選ぶ→発動する」の順です。

設定書の影縫いの装備条件に矛盾があるため、詳細の「宵掃ぎを装備していないとき」を採用しています。訓練装備へ変更すると使用できます。未指定の基礎能力値・成長値・攻撃倍率等は暫定で、CSVと仕様書に明記しました。セーブ形式はversion 4を維持しています。

## 公開済みGitHub Pagesの更新手順

1. このZIPをPCにダウンロードして展開します。ZIPファイル自体はアップロードしません。
2. https://github.com/4rcturuz/dark-veil-srpg を開き、Codeタブでmainブランチを選びます。
3. Add file → Upload files を開きます。
4. 展開したフォルダーを開き、index.html、app.js、assets、database、specsなどが並んでいる階層の「中身すべて」をドラッグ＆ドロップします。外側のフォルダーを丸ごと入れず、既存の同じパスへ上書きします。
5. メッセージに「攻撃範囲ルール更新・カナタ追加（α0.31）」と入力し、Commit directly to the main branch を選んで Commit changes を押します。mainが保護されている場合は新しいブランチへコミットし、Pull Requestをmainへマージします。
6. Actionsタブで新しい pages build and deployment が緑のチェック（成功）になるのを待ちます。Settings → Pages の main / (root) は変更不要です。
7. https://4rcturuz.github.io/dark-veil-srpg/ を開き、WindowsのChromeでは Ctrl+Shift+R で再読み込みします。タイトル右上がα 0.31になったことを確認します。反映には最大10分ほどかかる場合があります。
8. 海音の通常攻撃／潮騒の祝福を選び、対象を指定する前から紫の射程表示が出ることを確認します。祝福で味方を選ぶと、緑の3×3効果範囲が重なります。壁・視界・マップ端・暗闇によって表示範囲は狭くなります。

公開URLは変わりません。既存リポジトリやセーブデータの削除は不要です。更新用ファイルの作成まで完了しており、GitHubのmainへの反映は上記のコミット時に行われます。

更新対象はコード・CSV・仕様書・画像を含む全ファイルです。古いCSVだけを戻すと列の不一致で起動できなくなります。.nojekyllも含めます。

公式手順：https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository
公開の確認：https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site

## データを編集する場所

- database/characters.csv、enemies.csv、items.csv、weapons.csv：味方・敵・アイテム・武器の定義。列の説明は database/README.txt。
- specs/maps/ash-cemetery.txt：灰の墓地の地形・高度・配置。
- specs/game-system.txt：ゲーム仕様書 ver3.12。
- assets/：顔アイコン・キャラクターチップ・背景。

## ローカル試遊

フォルダーをターミナルで開き、Python 3 があれば python -m http.server 8000 （Windowsでは py -m http.server 8000 でも可）を実行し、ブラウザーで http://localhost:8000/ を開いてください。
