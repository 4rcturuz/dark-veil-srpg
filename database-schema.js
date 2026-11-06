// Column definitions are shared by the browser loader and the update validator.
const text = description => ({type:'text',description});
const num = (description,min=0,max=9999999,integer=false) => ({type:'number',description,min,max,integer});
const int = (description,min=0,max=9999999) => num(description,min,max,true);
const bool = description => ({type:'boolean',description});
const list = description => ({type:'list',description});
const choice = (description,values) => ({type:'enum',description,values});
const common = {id:text('変更しない一意のID。英数字とアンダースコア'),name:text('表示名'),enabled:bool('1で有効、0で保留'),source:text('移行元資料'),notes:text('暫定値・未設定事項などの開発メモ。ゲームには表示しない')};
const stats = {max_hp:int('Lv1最大HP',1,9999),attack:num('物理攻撃'),defense:num('物理防御'),magic:num('神秘'),resistance:num('抗秘'),speed:num('迅速'),move:int('移動力',0,99),sight:int('視界',0,99),attack_range:int('基本攻撃射程',1,99),magic_attack:bool('基本攻撃に神秘を使用'),critical_rate:num('会心率。百分率',0,100),status_resistance:num('状態異常耐性。百分率',0,100),skill_ids:list('装着スキルID。|区切り。定義はdata.jsのSKILLS')};
export const SCHEMAS = {
 characters:{...common,playable:bool('1は操作ユニット、0はイベント専用。イベント専用の能力値は空欄可'),gender:choice('隣接特性の判定用。外見から推定しない',['female','male','unknown']),title:text('称号'),job:text('職業'),symbol:text('仮アイコン文字'),color:text('表示色。#RRGGBB'),...stats,wolf_move:int('狼形態の基礎移動力。0は形態変更なし',0,99),wolf_sight:int('狼形態の視界',0,99),wolf_passive:text('狼形態で装着中パッシブと交代するスキルID。非変身者は空欄'),weapon_id:text('初期主装備ID。weapons.csv参照'),armor_id:text('初期防具ID。items.csvのarmor参照'),growth_hp:num('1レベルごとの最大HP成長'),growth_attack:num('物理攻撃成長'),growth_defense:num('物理防御成長'),growth_magic:num('神秘成長'),growth_resistance:num('抗秘成長'),growth_speed:num('迅速成長'),bio:text('紹介文'),quote:text('紹介用台詞')},
 enemies:{...common,scope:choice('使用する戦闘処理',['normal','tutorial','tutorial2']),render_type:choice('既存描画系統・ボス判定用',['beast','archer','shade','sentinel','boss']),ai_role:choice('敵AI分類。通常プレイでは非表示',['徘徊型','巡回型','待機型','回避型','無動型']),...stats,cardinal_sight:bool('視界を上下左右の直線に限定'),color:text('表示色。#RRGGBB'),runes:int('撃破時のルーン'),xp:int('序章の討伐EXP。通常戦役は戦役報酬を別集計'),story_factor:num('物語難易度でHP・攻撃・神秘に掛ける倍率',0.001,10),footprint:text('占有相対座標。x:yを|区切り。原点0:0を含める'),doom_immune:bool('呪死無効'),self_heal:int('無動型が負傷時に優先する回復量。0はなし'),drop_ids:list('ドロップ品ID。items.csvまたはweapons.csv参照'),drop_chances:list('各ドロップの確率。0～1。drop_idsと同じ順・同じ数'),drop_conditions:list('各ドロップの条件。alwaysまたはtutorial_first')},
 items:{...common,category:choice('種別',['consumable','key','currency','armor']),description:text('既存の表示説明文'),market:bool('市場に出す消費品は1'),buy_price:int('購入額。血の澱'),sell_price:int('売却額。血の澱'),initial_count:int('新規キャンペーン開始時の所持数',0,99),stack_limit:int('所持上限',1,9999999),effect:choice('共通効果ハンドラー',['none','heal','cure','revive','status','feral']),target:choice('使用対象',['none','ally','self','enemy','dead_ally']),range:int('射程。消費品は上下左右距離',0,99),heal:int('固定HP回復量'),heal_fraction:num('有効最大HPに対する割合。0～1',0,1),revive_hp:int('蘇生時HP'),status_id:text('付与する状態ID'),duration:int('付与状態の持続ターン'),stat_multiplier:num('凶獣薬型の能力倍率',0,10),cure_status_ids:list('解除する状態ID。|区切り'),persistent:bool('序章終了後も重要品をキャンペーンへ持ち越す'),usable_by:list('防具の使用可能キャラクターID。*は全員')},
 weapons:{...common,description:text('武器説明。数値と暫定事項は各列・notesを正本とする'),attack_multiplier:num('成長後の基礎物理攻撃へ掛ける倍率',0,10),attack_bonus:num('装備時の固定物理攻撃加算',-9999,9999),magic_bonus:num('装備時の固定神秘加算',-9999,9999),range_override:int('0はキャラクター基本射程を使用。正数で武器射程を上書き',0,99),usable_by:list('使用可能キャラクターID。*は全員'),available_by_default:bool('1は所持取得なしで準備画面に出す装備'),collectible:bool('1は報酬・所持武器に登録可能')}
};
// Put provenance after editable gameplay columns in the delivered CSV files.
for(const [name,schema]of Object.entries(SCHEMAS)){
 const {source,notes,...fields}=schema;SCHEMAS[name]={...fields,source,notes};
}
