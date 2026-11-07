Dark Veil CSVデータベース 編集ガイド
スキーマ版 1 ／ ブラウザα0.29 ／ 2026年11月7日

【編集する正本】
dist/database/characters.csv：キャラクター5件。操作可能5人。
dist/database/enemies.csv：敵16種。通常戦役5種、廃墟の聖堂5種、灰の墓地6種。
dist/database/items.csv：アイテム16件。消費7、重要2、通貨2、防具5。
dist/database/weapons.csv：武器・主装備・素手9件。
個別能力値、価格、効果、武器補正は仕様書へ二重記載しない。

【更新手順】
1. 対象CSVを編集する。列名と既存idは維持。新規行には一意のidを付ける。
2. Excelでは「CSV UTF-8」で保存する。UTF-8 BOM有無、CRLF/LFの両方を読める。
3. プロジェクトで npm run data:validate を実行する。エラー行と列を修正する。
4. npm test と必要な画面確認を行い、CSVを含むゲーム全体を同じ版で再公開する。
5. ゲームを再読み込みする。起動時に4つの公開CSVを読み込む。
手元にダウンロードしたCSVや別保管ファイルの編集だけでは、公開ゲームへ同期されない。
data.jsなどに個別レコードを再記載したり、CSVから手作業で数値を転記したりしない。

【セルの書き方】
1行目は列名。1行が1レコード。列の追加・列名変更にはスキーマ改修が必要。
idは英小文字で始まる英数字・アンダースコア。重複は禁止。表示名は日本語可。
真偽値は0/1。数値は半角、単位・桁区切り・%を付けない。
割合や確率は0～1、会心率・状態耐性は0～100、移動力は整数。
複数のIDは | で区切る。例 attack|crescent|waltz|sonar。
カンマ・改行・引用符を含むセルは二重引用符で囲み、引用符自体は二重にする。
空欄と0は異なる。操作ユニット・敵の必須数値は空欄にしない。
イベント専用キャラクターの未設定数値は空欄とし、playable=0を維持する。
sourceとnotesは開発メモ。画面本文には追加しない。description・bio・quoteは表示文なので原文を尊重する。

【形態と性別】
genderはfemale/male/unknown。月夜の求愛者の隣接判定用。
非変身者はwolf_move=0、wolf_sight=0、wolf_passive空欄。星詠みのヒト形態はmove/sight、狼形態はwolf_move/wolf_sight。
形態変更者にはmetamorphosisと1件のヒト形態パッシブをskill_idsに設定し、wolf_passiveには交代する受動スキルIDを指定する。両形態合計で装着枠を増やさない。

【CSVで更新できる範囲】
characters：既存スキルIDを最大4件まで装着したユニットを追加可能。新規開始では先頭4人を出撃候補にし、以後を休息にする。既存セーブ読込み時は追加ユニットをLv1・全快・休息で補完する。同時出撃は4人まで。
enemies：敵の数値・攻撃/妨害スキル・報酬を編集可能。既存の5描画系統と5AI分類を使用する。scopeはnormal／tutorial（聖堂）／tutorial2（墓地）。墓地の配置・群・出現難易度・担当区域はspecs/maps/ash-cemetery.txtの[units]に指定する。
items：既存のheal/cure/revive/status/feral効果を使う消費品を行追加で使用可能。新規セーブはinitial_count、既存セーブへの追加は0個。market=1なら市場に出る。既存レコードのinitial_count変更で保存済み所持数は変わらない。
weapons：成長後基礎攻撃×attack_multiplier＋ユニット強化加算＋attack_bonus。神秘にはmagic_bonusを加算する。range_override=0はキャラクターの基本射程。usable_byで装備できるキャラクターを指定する。
防具はitemsのarmor。現行の一般的な防具能力補正は未実装で、スキル必要装備の判定に使う。
通貨の行は名称・分類の定義。血の澱の初期量と獲得処理はキャンペーンの共通ルール、ルーン獲得量はenemiesのrunes。

【ドロップ】
drop_ids、drop_chances、drop_conditionsの要素数を揃える。対応する要素を同じ順で | 区切り。
drop_chances=1は確定、0は落とさない。alwaysは常時、tutorial_firstは序章第1エリアで最初の報酬を1回だけ付与する条件。
runesは専用列を使用する。ドロップ品は消費品・重要品・collectible=1の武器。
拾得時に直接所持品へ加算する。討伐後にマップへ配置しない。

【別途実装するもの】
新しい効果種別、スキル効果、画像・キャラクターチップ、マップ・敵配置、入手イベントは別の定義・処理を追加する。
敵AIの装備条件付きスキル、回復/バフの一般的な選択は未対応。無動型の自己回復はself_heal列。通常戦役の複数マス敵も未対応。
初期配置や台本が参照する既存IDを削除・無効化しない。既存武器名はセーブと台本にも使うため、改名には保存データの移行が必要。
最大HP・所持上限の引下げなどで保存済み値が上限を超える場合も、別途移行処理を伴う更新とする。未知のデータを勝手に削除してロードしない。
暫定値はnotesに明記。未指定の値を新たな確定仕様として扱わない。

【列定義】

characters.csv
id [text]：変更しない一意のID。英数字とアンダースコア
name [text]：表示名
enabled [boolean]：1で有効、0で保留
playable [boolean]：1は操作ユニット、0はイベント専用。イベント専用の能力値は空欄可
gender [enum: female/male/unknown]：隣接特性の判定用。外見から推定しない
title [text]：称号
job [text]：職業
symbol [text]：仮アイコン文字
color [text]：表示色。#RRGGBB
max_hp [number]：Lv1最大HP
attack [number]：物理攻撃
defense [number]：物理防御
magic [number]：神秘
resistance [number]：抗秘
speed [number]：迅速
move [number]：移動力
sight [number]：視界
attack_range [number]：基本攻撃射程
magic_attack [boolean]：基本攻撃に神秘を使用
attack_style [enum]：通常攻撃の表示色。melee=近接（赤）、ranged=遠距離（紫）。個別スキルのattackStyle指定を優先。
critical_rate [number]：会心率。百分率
status_resistance [number]：状態異常耐性。百分率
skill_ids [list]：装着スキルID。|区切り。定義はdata.jsのSKILLS
wolf_move [number]：狼形態の基礎移動力。0は形態変更なし
wolf_sight [number]：狼形態の視界
wolf_passive [text]：狼形態で装着中パッシブと交代するスキルID。非変身者は空欄
weapon_id [text]：初期主装備ID。weapons.csv参照
armor_id [text]：初期防具ID。items.csvのarmor参照
growth_hp [number]：1レベルごとの最大HP成長
growth_attack [number]：物理攻撃成長
growth_defense [number]：物理防御成長
growth_magic [number]：神秘成長
growth_resistance [number]：抗秘成長
growth_speed [number]：迅速成長
bio [text]：紹介文
quote [text]：紹介用台詞
source [text]：移行元資料
notes [text]：暫定値・未設定事項などの開発メモ。ゲームには表示しない

enemies.csv
id [text]：変更しない一意のID。英数字とアンダースコア
name [text]：表示名
enabled [boolean]：1で有効、0で保留
scope [enum: normal/tutorial/tutorial2]：使用する戦闘処理
render_type [enum: beast/archer/shade/sentinel/boss]：既存描画系統・ボス判定用
ai_role [enum: 徘徊型/巡回型/待機型/回避型/無動型]：敵AI分類。通常プレイでは非表示
max_hp [number]：Lv1最大HP
attack [number]：物理攻撃
defense [number]：物理防御
magic [number]：神秘
resistance [number]：抗秘
speed [number]：迅速
move [number]：移動力
sight [number]：視界
attack_range [number]：基本攻撃射程
magic_attack [boolean]：基本攻撃に神秘を使用
attack_style [enum]：通常攻撃の表示色。melee=近接（赤）、ranged=遠距離（紫）。個別スキルのattackStyle指定を優先。
critical_rate [number]：会心率。百分率
status_resistance [number]：状態異常耐性。百分率
skill_ids [list]：装着スキルID。|区切り。定義はdata.jsのSKILLS
cardinal_sight [boolean]：視界を上下左右の直線に限定
color [text]：表示色。#RRGGBB
runes [number]：撃破時のルーン
xp [number]：序章の討伐EXP。通常戦役は戦役報酬を別集計
story_factor [number]：物語難易度でHP・攻撃・神秘に掛ける倍率
footprint [text]：占有相対座標。x:yを|区切り。原点0:0を含める
doom_immune [boolean]：呪死無効
self_heal [number]：無動型が負傷時に優先する回復量。0はなし
drop_ids [list]：ドロップ品ID。items.csvまたはweapons.csv参照
drop_chances [list]：各ドロップの確率。0～1。drop_idsと同じ順・同じ数
drop_conditions [list]：各ドロップの条件。alwaysまたはtutorial_first
source [text]：移行元資料
notes [text]：暫定値・未設定事項などの開発メモ。ゲームには表示しない

items.csv
id [text]：変更しない一意のID。英数字とアンダースコア
name [text]：表示名
enabled [boolean]：1で有効、0で保留
category [enum: consumable/key/currency/armor]：種別
description [text]：既存の表示説明文
market [boolean]：市場に出す消費品は1
buy_price [number]：購入額。血の澱
sell_price [number]：売却額。血の澱
initial_count [number]：新規キャンペーン開始時の所持数
stack_limit [number]：所持上限
effect [enum: none/heal/cure/revive/status/feral]：共通効果ハンドラー
target [enum: none/ally/self/enemy/dead_ally]：使用対象
range [number]：射程。消費品は上下左右距離
heal [number]：固定HP回復量
heal_fraction [number]：有効最大HPに対する割合。0～1
revive_hp [number]：蘇生時HP
status_id [text]：付与する状態ID
duration [number]：付与状態の持続ターン
stat_multiplier [number]：凶獣薬型の能力倍率
cure_status_ids [list]：解除する状態ID。|区切り
persistent [boolean]：序章終了後も重要品をキャンペーンへ持ち越す
usable_by [list]：防具の使用可能キャラクターID。*は全員
source [text]：移行元資料
notes [text]：暫定値・未設定事項などの開発メモ。ゲームには表示しない

weapons.csv
id [text]：変更しない一意のID。英数字とアンダースコア
name [text]：表示名
enabled [boolean]：1で有効、0で保留
description [text]：武器説明。数値と暫定事項は各列・notesを正本とする
attack_multiplier [number]：成長後の基礎物理攻撃へ掛ける倍率
attack_bonus [number]：装備時の固定物理攻撃加算
magic_bonus [number]：装備時の固定神秘加算
range_override [number]：0はキャラクター基本射程を使用。正数で武器射程を上書き
usable_by [list]：使用可能キャラクターID。*は全員
available_by_default [boolean]：1は所持取得なしで準備画面に出す装備
collectible [boolean]：1は報酬・所持武器に登録可能
source [text]：移行元資料
notes [text]：暫定値・未設定事項などの開発メモ。ゲームには表示しない

α0.31：カナタを操作ユニットとして追加。skill_idsは重複なしの1～5件。通常攻撃の表示分類attack_styleをcharacters/enemies双方へ追加。カナタの未指定能力・成長値・防具・武器追加補正はnotesに暫定と明記。影縫いは固有武器未装備時のみ使用可能。
