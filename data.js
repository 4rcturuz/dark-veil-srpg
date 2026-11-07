import {DATABASE,HEROES,ITEMS,WEAPONS} from './database.js';
import {validateReferences} from './database-parser.js';
export {HEROES,ITEMS} from './database.js';
export const VERSION = 4;
export const WEAPON_ATTACK_BONUS = Object.fromEntries(Object.values(WEAPONS).map(w=>[w.name,w.attackBonus]));
export const DIRS = [[1,0],[0,1],[-1,0],[0,-1]];
export const TERRAIN = {
  stairsDown:{name:'下り階段',cost:2,color:'#54646c',desc:'移動コスト 2｜平地と同じ高度補正'},
  stairsUp:{name:'上り階段',cost:2,color:'#65737a',desc:'移動コスト 2｜平地と同じ高度補正'},
  dormantStatue:{name:'石像',cost:Infinity,block:true,color:'#536460',desc:'通行・視線を遮る'},
  door:{name:'聖堂の正門',cost:Infinity,color:'#6b5545',block:true,desc:'施錠されている。聖堂の鍵が必要'},
  plain:{name:'平地',cost:2,color:'#536460',desc:'移動コスト 2'},
  road:{name:'街道',cost:1,color:'#8a8875',desc:'移動コスト 1｜平地の半分'},
  grass:{name:'草地',cost:2,color:'#405e50',breakable:true,desc:'移動コスト 2｜破壊可能'},
  shrub:{name:'灌木',cost:3,color:'#304d42',cover:.15,breakable:true,desc:'移動 3｜遠距離への迅速 +15%'},
  mud:{name:'泥濘',cost:4,color:'#5f5548',speed:-.3,desc:'移動 4｜迅速 −30%'},
  sand:{name:'砂地',cost:3,color:'#a38e67',speed:-.15,desc:'移動 3｜迅速 −15%'},
  poison:{name:'毒沼',cost:4,color:'#635b75',speed:-.3,desc:'移動 4｜ターン終了時50%で毒'},
  water:{name:'水流',cost:2,color:'#315c69',desc:'南向きの流れ｜移動 順2・横3・逆4'},
  ice:{name:'氷床',cost:2,color:'#8baeb5',speed:-.3,desc:'移動 2｜迅速 −30%｜被弾でノックバック'},
  lava:{name:'溶岩',cost:6,color:'#ad5841',desc:'移動 6｜通過で炎上・3ターン移動 −2'},
  thorn:{name:'棘床',cost:4,color:'#706461',breakable:true,desc:'移動 4｜進入時 最大HPの10%ダメージ'},
  charge:{name:'帯電',cost:2,color:'#746e9b',desc:'移動 2｜進入時HP10%減・50%で麻痺'},
  sound:{name:'鳴床',cost:2,color:'#7f816f',desc:'移動 2｜通過で3ターン位置が露見'},
  pit:{name:'陥没',cost:Infinity,color:'#1c2b31',desc:'通行不可'},
  wall:{name:'堅壁',cost:Infinity,color:'#667575',block:true,desc:'通行・視線を遮る'},
  crack:{name:'罅壁',cost:Infinity,color:'#786f62',block:true,breakable:true,desc:'通行不可｜フェノメナで瓦礫へ'},
  rubble:{name:'瓦礫',cost:4,color:'#65706b',cover:.15,breakable:true,desc:'平地2＋瓦礫2｜遠距離への迅速 +15%'}
};
export const SKILLS = {
  fanStrike:{name:'扇打ち',kind:'attack',attackStyle:'melee',range:1,magic:false,power:1,desc:'隣接する敵1体へ物理攻撃。追加効果・CTなし。'},
  shadowPin:{name:'影縫い',kind:'attack',attackStyle:'ranged',range:3,magic:false,power:1,cd:3,excludesWeapon:'黒羽の鉄扇〈宵掃ぎ〉',shadowPin:true,desc:'直線3マスの敵1体を影で攻撃。次の行動時の移動力を2下げる（最低1）。宵掃ぎを装備していないときに使用可能。CT 3。'},
  blackFeather:{name:'黒羽払い',kind:'attack',attackStyle:'melee',shape:'front3',directional:true,lineOfSight:true,magic:false,power:1,push:1,pushFromCaster:true,cd:3,requires:'黒羽の鉄扇〈宵掃ぎ〉',desc:'前方の隣接3マスへ物理攻撃。命中した敵を離れる方向へ1マス押し出す。壁・占有・通行不能な高低差では押し出し不発。宵掃ぎが必要。CT 3。'},
  curtainPull:{name:'帳引き',kind:'relocate',targeted:true,range:3,cd:4,uses:3,desc:'射程3の自身か味方1体を選び、カナタに上下左右で隣接する空きマスへ移動させる。壁越し不可。対象の行動回数は回復しない。CT 4・1シナリオ3回。'},
  cleanup:{name:'後片づけ',passive:true,move:2,desc:'自分の行動で敵を撃破すると、攻撃後に残り移動力を2回復する（上限は現在の移動力）。1ターン1回。行動回数は回復しない。'},
  t2Slash:{name:'斬撃',kind:'attack',range:1,magic:false,power:1,desc:'隣接する敵1体に物理攻撃。'},
  t2Flame:{attackStyle:'ranged',name:'焔',kind:'attack',range:2,magic:true,power:1,cd:3,desc:'直線2マスの敵1体に神秘攻撃。'},
  t2PoisonBlade:{name:'毒刃',kind:'attack',shape:'front3',singleTarget:true,directional:true,lineOfSight:true,magic:false,power:1,poison:25,cd:3,desc:'前方横3マスから1体を攻撃。命中時に確率で毒。'},
  t2HeavyStrike:{name:'強打',kind:'attack',shape:'front6',singleTarget:true,directional:true,lineOfSight:true,magic:false,power:1.25,cd:3,desc:'前方幅3・奥行2マスから1体に物理攻撃。'},
  t2GuardStance:{name:'回避の構え',kind:'buff',shape:'self',stat:'guard',amount:.25,duration:3,cd:4,desc:'自身の防御・抗秘を3ターン25%上げる。'},
  t2FirstAid:{name:'応急手当',kind:'heal',shape:'self',healFraction:.2,cd:4,desc:'自身の最大HPの20%を回復する。'},
  t2MoonCurse:{attackStyle:'ranged',name:'月影の呪縛',kind:'debuff',range:3,checkHit:true,stat:'atk',amount:-.2,duration:3,cd:4,desc:'直線3マス。命中した敵の物理攻撃を3ターン20%下げる。'},
  adariusSweep:{name:'墓碑薙ぎ',kind:'attack',shape:'bossFront',range:2,width:4,magic:false,power:1.10,desc:'前方幅4・奥行2マスへ即時攻撃。'},
  adariusProcession:{name:'葬列砕き',kind:'attack',shape:'bossFront',range:5,width:2,magic:false,power:1.55,cd:3,desc:'予兆の次の敵フェイズに前方幅2・奥行5マスを攻撃。'},
  adariusAshWave:{attackStyle:'ranged',name:'灰葬の波動',kind:'attack',shape:'bossRing',range:2,magic:true,power:1.40,cd:4,desc:'予兆の次の敵フェイズに占有域の周囲2マスを攻撃。'},
  adariusFallingTomb:{attackStyle:'ranged',name:'弔鐘の落碑',kind:'attack',shape:'bossTomb',range:6,magic:false,power:1.35,cd:5,desc:'予兆の次の敵フェイズに指定地点の周囲3×3を攻撃。'},
  holyLight:{attackStyle:'ranged',name:'聖光',kind:'attack',range:3,magic:true,power:1,cd:3,desc:'直線3マスの敵に魔法攻撃。CT 3。'},
  bind:{attackStyle:'ranged',name:'捕縛',kind:'debuff',range:3,stat:'move',amount:-2,duration:3,desc:'射程3。敵の移動力 −2。3ターン。'},
  heavyStrike:{name:'強打',kind:'attack',range:1,power:1.35,desc:'隣接する敵へ強い物理攻撃。'},
  gregorSlash:{name:'斬撃',kind:'attack',shape:'front3',directional:true,power:1,desc:'前方横3マスに斬撃。'},
  gregorSmash:{name:'強打',kind:'attack',shape:'front6',directional:true,power:1.25,desc:'前方2段・横3マスに強打。'},
  gregorPoison:{name:'毒刃',kind:'attack',shape:'front3',directional:true,power:1,poison:25,cd:3,desc:'前方横3マスへ物理攻撃。命中時25%で毒。CT 3。'},
  attack:{name:'通常攻撃',kind:'attack',power:1,desc:'直線上の敵1体を攻撃。壁に遮られる。'},
  fangThrust:{name:'牙突き(仮)',kind:'attack',shape:'rays',range:2,lineOfSight:true,damageMultiplier:1.5,accuracySpeedMultiplier:1.15,cd:3,desc:'上下左右4方向・各直線2マスの敵すべてへ通常攻撃の1.5倍ダメージ。この攻撃の命中判定のみ迅速 +15%。CT 3。'},
  metamorphosis:{name:'形象変化(メタモルフォーゼ)(仮)',kind:'transform',shape:'self',freeAction:true,oncePerTurn:true,desc:'ヒトと狼の姿を切り替える。1ターンに1回、行動回数を消費しない。消費済みの移動力は引き継ぐ。'},
  moonSuitor:{name:'月夜の求愛者',passive:true,amount:.05,maxStacks:4,desc:'ヒト形態で、生存する女性キャラクターと上下左右に隣接すると、1人につき全能力基礎値 +5%（最大 +20%）。狼形態では音響探知に切り替わる。'},
  crescent:{name:'月影一閃',kind:'attack',shape:'front3',directional:true,power:1.15,cd:3,requires:'夜鳴りの狩月鎌',desc:'向きを選択。前方1マスとその左右の計3マスの敵すべてに物理ダメージ。CT 3。'},
  waltz:{name:'月相の円舞曲',kind:'buff',shape:'area2',uses:3,stat:'speed',amount:.1,duration:3,desc:'周囲2マスの自身を含む味方全員の迅速 +10%。3ターン。1シナリオ3回。'},
  sonar:{name:'音響探知',passive:true,range:8,desc:'前ターンに移動した、半径8マス以内の見えない敵を、誤差2マス以内の「？」で表示。静止した敵は感知しない。'},
  seaAttack:{attackStyle:'ranged',name:'通常攻撃',kind:'attack',shape:'line2',targeted:true,hitsUnseen:true,range:3,magic:true,power:1,lineOfSight:true,desc:'射程3。指定マスから奥へ縦2マスの敵に神秘ダメージ。上下左右の直線上で選択し、射程外と壁の向こうには届かない。CTなし。'},
  seaTrident:{attackStyle:'ranged',name:'海割りの三叉槍',kind:'attack',shape:'rectangle',directional:true,hitsUnseen:true,width:3,depth:5,range:5,magic:true,damageMultiplier:1.5,push:1,lineOfSight:true,cd:4,requires:'蒼海の杖',desc:'上下左右から向きを選び、幅3×奥行5マスの敵すべてへ通常攻撃の150%のダメージ。命中した敵を1マス押し出す。障害物・他ユニットで塞がれていれば押し出さない。蒼海の杖が必要。CT 4。'},
  tideBlessing:{name:'潮騒の祝福',kind:'heal',shape:'targetArea',targeted:true,range:4,radius:1,healFraction:.3,cd:3,uses:5,desc:'縦＋横の距離が4以内の味方を中心とする周囲1マスの味方全員を、それぞれの最大HPの30%回復。範囲内なら自身も対象。蘇生不可。CT 3・1シナリオ5回。'},
  seaHope:{name:'君は清楚な海の希望',passive:true,range:2,healFraction:.05,lowHealthFraction:.08,threshold:.5,desc:'周囲2マスの自身を含む味方は、自軍ターン終了時に最大HPの5%回復。残りHPが50%以下なら8%回復。重複・蘇生なし。海音が戦闘不能になると消失。'},
  shieldstrike:{name:'シールドバッシュ',kind:'attack',range:1,power:1,desc:'前後左右の隣接する敵1体に物理ダメージ。コスト0・毎ターン使用可。'},
  shieldbash:{name:'俺の時代が来た',kind:'attack',shape:'adjacent',power:1.05,cd:2,requires:'大盾',desc:'隣接8マスの敵すべてを盾で攻撃。CT 2。'},
  bastion:{name:'だって俺盾だし',kind:'buff',shape:'area2',uses:3,stat:'guard',amount:.15,duration:3,desc:'周囲2マスの自身を含む味方全員の防御・抗秘 +15%。3ターン。1シナリオ3回。'},
  lure:{name:'全員とっ捕まえてやる',passive:true,desc:'自身を視認する敵の標的優先度 +10%。'},
  phenomena:{attackStyle:'ranged',name:'フェノメナ',kind:'attack',shape:'rays',range:4,power:1.25,cd:4,paralysis:25,pierce:true,requires:'ロングソード',desc:'上下左右4方向・各直線4マス。遮蔽を貫通し、敵に物理攻撃＋25%で麻痺。通過した破壊可能地形を破壊。CT 4。'},
  guidance:{name:'月の導きとともに！',kind:'buff',shape:'self',uses:3,stat:'atk',amount:.15,duration:3,desc:'自身の物理攻撃 +15%。3ターン。1シナリオ3回。'},
  hundredcuts:{name:'百還斬り',passive:true,move:1,amount:.1,duration:2,desc:'無傷の敵を一撃で撃破すると、自身の移動力 +1・物理攻撃 +10%。発動ターンを含む2ターン。再発動は上書き。'}
};
export const MISSIONS = [
 {id:0,name:'鈴の鳴る方へ',subtitle:'THE BELL IN THE VEIL',place:'ルーメン外縁・月下の古道',objective:'敵部隊の全滅',short:'殲滅',turns:24,par:10,reward:220,xp:70,stages:1,sub:'癒しの雫を回収する',desc:'古道から、帰らぬ巡礼の鈴が聞こえる。帳の瀬際へ向かい、道を塞ぐ獣を退けよ。',story:[['astarthe','……聞こえます。鈴ではありません。その向こうに、いくつもの足音。'],['orion','だったら俺が先頭だ。後ろは頼んだぜ。'],['umine','水の流れも淀んでいる……。どうか、無理はしないで。'],['roland','隊列を崩さず進みましょう。月の光が、まだ道を照らしています。']]},
 {id:1,name:'水鏡の向こう',subtitle:'BEYOND THE WATER MIRROR',place:'旧水路 → 閉ざされた礼拝堂',objective:'全員で東の出口へ → 帳守を撃破',short:'踏破・討伐',turns:32,par:18,reward:340,xp:100,stages:2,sub:'全区画の還りの灯を回収する',desc:'水路の先で、礼拝堂の灯が消えた。濁流を渡り、還り人たちの帰路を取り戻せ。',story:[['umine','水路は礼拝堂に繋がっています。足元は、私に任せて。'],['roland','壁の向こうに気配があります。剣の届く場所なら、切り拓けます。'],['astarthe','見えないものを、見えないまま信じる。それも月の導きなのでしょうね。']]},
 {id:2,name:'明けぬ夜の灯',subtitle:'A LIGHT BEFORE DAWN',place:'ルーメン旧礼拝堂・防衛線',objective:'アスターテを守り8ターン生存',short:'防衛',turns:8,par:8,reward:420,xp:125,stages:1,sub:'敵を6体以上撃破する',desc:'帳が満ちる夜。鐘の音が戻るまで、四人でこの場所を守り抜く。',story:[['astarthe','人を、人のまま留め続けるために。今宵も、鈴を鳴らします。'],['orion','何体来ようが同じことだ。全員、とっ捕まえてやる。'],['roland','この光は絶やさせません。'],['umine','夜が明けなくても、私たちはここにいます。']]}
];
export const STATUS_NAMES={shadowPin:'影縫い',feral:'凶獣薬',poison:'毒',burn:'炎上',paralysis:'麻痺',blind:'暗闇',freeze:'凍結',doom:'呪死',exposed:'露見',lavaSlow:'移動低下',immune:'麻痺耐性'};

validateReferences(DATABASE,SKILLS,STATUS_NAMES);
