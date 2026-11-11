# Dark Veil — 月影の還り人（ブラウザ版 α0.34）

このフォルダーはゲームの公開用ルートです。HTML・CSS・JavaScriptと画像、CSV、マップ・仕様書を含みます。ビルドは不要です。

## GitHub Pages で公開

1. このZIPを展開します。
2. GitHubに新しいリポジトリを作成し、展開フォルダーの中身をそのままアップロードしてコミットします。index.html がリポジトリの最上位に見えることを確認してください。
3. Settings → Pages → Build and deployment で Deploy from a branch を選び、main と / (root) を指定して保存します。
4. 公開が完了したら同じ画面からサイトを開けます。

## 今回の更新（α0.34）

街道の会話中の連続歩行、狂獣薬の効果時間、エレナの追加、おりおんの顔アイコンを反映しました。α0.33のマップ素材統合も含みます。

エレナは出撃準備で他の仲間を休息させてから出撃を選択できます（出撃上限4人）。旧セーブではLv1・休息で追加されます。セーブ構造はversion 4のままです。資料の不一致はスキル詳細の射程3／扇形1・3・5を採用しました。詳細はspecs/game-system.txt。

## 公開済みGitHub Pagesの更新手順

1. 既存のα0.33から更新する場合は DarkVeil-alpha0.34-update.zip をPCにダウンロードして展開します。ZIPファイル自体はアップロードしません。
2. https://github.com/4rcturuz/dark-veil-srpg を開き、Codeタブでmainブランチを選びます。
3. Add file → Upload files を開きます。
4. 差分ZIPの中身すべて（app.js、engine.js、assets、database、specsなど）をドラッグ＆ドロップし、既存と同じパスへ上書きします。外側のフォルダーは入れません。assets全体を削除せず内容を追加してください。全体ZIPを使う場合は100ファイル以下に分けてアップロードします。
5. メッセージに「エレナ追加・街道演出・狂獣薬更新（α0.34）」と入力し、Commit directly to the main branch を選んで Commit changes を押します。mainが保護されている場合は新しいブランチへコミットし、Pull Requestをmainへマージします。
6. Actionsタブで新しい pages build and deployment が緑のチェック（成功）になるのを待ちます。Settings → Pages の main / (root) は変更不要です。
7. https://4rcturuz.github.io/dark-veil-srpg/ を開き、WindowsのChromeでは Ctrl+Shift+R で再読み込みします。タイトルの表示がα 0.34になったことを確認します。反映には最大10分ほどかかる場合があります。
8. 出撃準備でエレナの顔・装備・4技、おりおんの顔を確認します。街道の歩行、狂獣薬の使用後3回目の自軍終了時の解除も確認できます。

公開URLは変わりません。既存リポジトリやセーブデータの削除は不要です。更新用ファイルの作成まで完了しており、GitHubのmainへの反映は上記のコミット時に行われます。

差分ZIPにはα0.33から変更・追加したコード、CSV、仕様書、画像と .nojekyll を含めています。マップの論理データは変更していません。全体ZIPは新規配置や復元に利用できます。

公式手順：https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository
公開の確認：https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site

## データを編集する場所

- database/characters.csv、enemies.csv、items.csv、weapons.csv：味方・敵・アイテム・武器の定義。列の説明は database/README.txt。
- specs/maps/ash-cemetery.txt：灰の墓地の地形・高度・配置。
- specs/game-system.txt：ゲーム仕様書 ver3.15。
- assets/：顔アイコン・キャラクターチップ・背景。

## ローカル試遊

フォルダーをターミナルで開き、Python 3 があれば python -m http.server 8000 （Windowsでは py -m http.server 8000 でも可）を実行し、ブラウザーで http://localhost:8000/ を開いてください。

GitHubのブラウザーアップロードは一度に100ファイルまで、1ファイル25MiBまでです。差分ZIPは一度のアップロードに収まる構成です。ZIP自体をリポジトリへ置かず、展開した中身を追加してください。
公式手順：https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository
