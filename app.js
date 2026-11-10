import {attackStyle,updateEnemyPhaseStatus} from './combat-display.js';
import {formatDialogues} from './dialogue-text.js';
import {dialogueBody,preparationScreen,textField} from './screen-layout.js';
import {FACE_ICONS,faceIconMarkup} from './face-icons.js';
import {ALL_ITEMS,weaponOptions} from './database.js';
import {arrangeFormation} from './formation.js';
import {HEROES,SKILLS,ITEMS,MISSIONS,TERRAIN,STATUS_NAMES} from './data.js';
import {Battle,makeCampaign,validateCampaign,stats,restoreHero,xpNeeded,dist,near,key,makeMap} from './engine.js';
import {unlockCemeteryBoss,prepareCemeteryDebug,testCemeteryCondition} from './cemetery-debug.js';
import {CemeteryBattle} from './cemetery.js';
import {CemeteryPreparation,CEMETERY_PARTY} from './cemetery-preparation.js';
import {CEMETERY_PAGES} from './cemetery-script.js';
import {playCemeteryScene} from './cemetery-presentation.js';
import {cemeteryDiagram,deploymentPreview} from './deployment-preview.js';
import {cemeteryMessage,cemeteryPreparationHtml,cemeteryResultHtml} from './cemetery-ui.js';
import {makeTutorialMap} from './tutorial-data.js';
import {TutorialBattle,LESSONS} from './tutorial.js';
import {MapView,drawMinimap} from './render.js';
import {IntermissionPlayer} from './intermission.js';
import {beginIntermission} from './intermission-state.js';
import {DebugMenu} from './debug-menu.js';
import {DebugSession,createDebugBattle,setDebugIntermission,canEditDebugBattle,debugRecover,debugSetHp,debugElevation,debugTeleport,debugStatus,debugItem,debugCurrency,debugTutorialAction,debugReport} from './debug-state.js';
import {ownedItems} from './inventory.js';
import {itemMenuHtml,itemFlyoutPosition} from './item-menu.js';
const $=s=>document.querySelector(s),app=$('#app'),modalRoot=$('#modal-root');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let intermissionPlayer=null,cemeteryPreparation=null,cemeteryPicked=null,statusPage=0,statusHeroId=null,preparationLocked=false,debugBossUnlocked=false,enemyLoop=0,sceneSerial=0;
let busy=false,lastTutorialLesson=1,itemMenuOpen=false,dialogueAdvance=null,eventEmote=null,cinematic=false,fadeAnimation=null;
let campaign=null,screen='title',selectedMission=0,formation={},formationPick=null,battle=null,view=null,selected=null,mode='move',pending=null,hover=null,paused=false,epoch=0,dialogIndex=0,soundOn=false,audioContext=null,saveMode='save',dangerCache=null,reachCache=new Map(),areaCache=[],targetRangeCache=[],pathCache=null,toastTimer=null,modalReturn=null,lastFocus=null;
const debugSession=new DebugSession();
let debugMenu=null;
const canSave=()=>!debugSession.active&&campaign&&['base','prep','cemetery-prep'].includes(screen);
const readStore=k=>{try{return JSON.parse(localStorage.getItem(k));}catch{return null;}};
function writeStore(k,v){if(debugSession.active)return false;try{localStorage.setItem(k,JSON.stringify(v));return true;}catch{toast('保存できませんでした。JSON書き出しをご利用ください。');return false;}}
function toast(s){$('#toast').textContent=s;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),3300);}
function chime(kind='select'){
 if(!soundOn)return;try{audioContext??=new(window.AudioContext||window.webkitAudioContext)();audioContext.resume();const t=audioContext.currentTime,osc=audioContext.createOscillator(),g=audioContext.createGain();osc.type='sine';osc.frequency.setValueAtTime(kind==='attack'?220:kind==='turn'?330:660,t);osc.frequency.exponentialRampToValueAtTime(kind==='attack'?90:440,t+.17);g.gain.setValueAtTime(.045,t);g.gain.exponentialRampToValueAtTime(.001,t+.3);osc.connect(g);g.connect(audioContext.destination);osc.start(t);osc.stop(t+.31);}catch{}
}
function portrait(id,large=false){const h=HEROES.find(h=>h.id===id);return `<div class="portrait ${large?'large':''}" role="img" aria-label="${esc(h?.name??'ユニット')}のアイコン${FACE_ICONS[id]?'':'（仮）'}" style="color:${h?.color||'#d8a88f'}">${faceIconMarkup(id)}</div>`;}
function hpbar(h){return `<div class="hp-track ${h.hp/h.maxHp<.3?'low':''}"><span style="width:${Math.max(0,h.hp/h.maxHp*100)}%"></span></div>`;}
function topbar(active='base'){return `<header class="topbar"><div class="brand" data-action="title" role="button" tabindex="0" aria-label="タイトルへ"><span class="brand-mark">☾</span><div><div class="brand-name">DARK VEIL</div><div class="brand-sub">月影の還り人</div></div></div><nav class="topnav" aria-label="拠点メニュー"><button class="${active==='base'?'active':''}" data-action="base">拠点</button><button data-action="codex">還り人の記録</button><button data-action="saves">記録</button><button data-action="help">指南</button><button class="debug-entry" data-action="debug">DEBUG</button><button data-action="settings" aria-label="設定">⚙</button></nav><div class="resource"><span>♧</span>${campaign?.blood??0}<small>血の澱</small>${campaign?.runes?`<span class="rune-count">${campaign.runes} <small>ルーン</small></span>`:''}</div></header>`;}
function stopView(){sceneSerial++;enemyLoop++;intermissionPlayer?.destroy();intermissionPlayer=null;fadeAnimation?.cancel();fadeAnimation=null;cinematic=false;eventEmote=null;closeItemMenu();view?.destroy();view=null;}
function activeDialog(){return modalRoot.firstChild?modalRoot:$('#battle-text')??modalRoot;}
function closeModal(){preparationLocked=false;$('.deployment-layout')?.removeAttribute?.('inert');if($('#cemetery-diagrams'))$('#cemetery-diagrams').innerHTML='';dialogueAdvance=null;eventEmote=null;modalRoot.innerHTML='';if($('#battle-text'))$('#battle-text').innerHTML='';paused=false;modalReturn=null;lastFocus?.focus?.();}
function modal(body,wide=false,closable=true,field=false,advance=null){
 dialogueAdvance=advance;eventEmote=null;
 closeItemMenu();lastFocus=document.activeElement;paused=screen==='battle';const inField=field&&!!$('#battle-text'),root=inField?$('#battle-text'):modalRoot;preparationLocked=inField&&screen.endsWith('prep');if(preparationLocked)$('.deployment-layout')?.setAttribute?.('inert','');
 modalRoot.innerHTML='';if($('#battle-text'))$('#battle-text').innerHTML='';
 const content=`<section class="modal ${wide?'wide-modal':''} ${inField?'field-dialog':''}" role="dialog" aria-modal="${!inField}" aria-label="${inField?'メッセージ':'ゲームメニュー'}">${closable?'<button class="modal-close" data-action="close-modal" aria-label="閉じる">×</button>':''}${body}</section>`;
 root.innerHTML=inField?content:`<div class="modal-shade ${paused?'battle-menu-screen':''}">${content}</div>`;
 formatDialogues(root);
 setTimeout(()=>(root.querySelector('button.primary:not(:disabled)')??root.querySelector('button:not(:disabled),select,input'))?.focus(),0);
}
function advanceDialogue(){if(busy||!dialogueAdvance)return false;const next=dialogueAdvance;closeModal();next();return true;}
function nextStory(){dialogIndex++;if(dialogIndex<battle.mission.story.length)showDialogue();else phaseBanner();}
function nextTutorial(){if(battle.hero().pose==='prone')delete battle.hero().pose;tutorialPump();}
function showCombatPage(message,next,action){
 const lines=[message.text];while(lines.length<4&&battle.messages[0]?.kind==='combat')lines.push(battle.messages.shift().text);
 modal(`<div class="combat-report">${lines.map(text=>`<p>${esc(text)}</p>`).join('')}</div><div class="modal-actions"><button class="primary" data-action="${action}">次へ</button></div>`,false,false,true,next);
}
function showAreaTitle(text,done=null){
 const el=$('#area-title');if(!el){done?.();return;}const token=epoch;
 el.textContent=text;el.classList.remove('visible');void el.offsetWidth;el.classList.add('visible');
 setTimeout(()=>{if(token!==epoch)return;el.classList.remove('visible');el.textContent='';done?.();},window.matchMedia('(prefers-reduced-motion: reduce)').matches?900:2600);
}
function inventorySummary(items,quest=[],weapons=[]){return ownedItems(items,quest,weapons).map(i=>`${esc(i.name)} ×${i.count}`).join('　')||'所持アイテム：なし';}

function title(){epoch++;stopView();closeModal();screen='title';app.innerHTML=`<main class="title-screen"><img class="title-art" src="assets/title-red-moon.png" alt="赤く輝く月と黒い霧に覆われた廃墟を望む探索者の後ろ姿"><div class="moon-decoration"></div><div class="title-top"><span>LUMEN CHRONICLES</span><span>TACTICAL ROLE-PLAYING GAME · α 0.32</span></div><div class="title-content"><div class="title-seal"><span>☾</span></div><div class="eyebrow" style="margin-bottom:22px">BEYOND THE VEIL, WE RETURN.</div><h1>DARK<br>VEIL</h1><div class="title-sub">月影の還り人</div><p class="title-quote">帳の地に、鈴の音が響く。<br>幾度還っても、月を見上げる者たちの物語。</p><div class="title-controls">${campaign?'<button class="primary" data-action="base"><span class="title-button-label">旅を続ける<small lang="en">Campaign</small></span><span aria-hidden="true">→</span></button>':'<button class="primary" data-action="new-game"><span class="title-button-label">旅を始める<small lang="en">Campaign</small></span><span aria-hidden="true">→</span></button>'}<button data-action="tutorial"><span class="title-button-label">操作を学ぶ<small lang="en">Tutorial</small></span></button><button data-action="load-title"><span class="title-button-label">記録を読み込む<small lang="en">Save / Load</small></span></button><button data-action="cemetery-alpha"><span class="title-button-label">灰の墓地 α版<small lang="en">Tutorial 2</small></span></button><button class="debug-entry" data-action="debug">デバッグメニュー　F2</button>${campaign?'<button class="text-button" data-action="new-game">はじめから</button>':''}</div></div><div class="title-bottom"><div class="row"><span>☾ 血盟ルーメン</span><span>序章 · ${HEROES.length}人の還り人 · 3つの戦役</span></div><span class="tiny">Dark Veil 二次創作 · PC / マウス・キーボード推奨</span></div></main>`;}
function base(){if(campaign?.cemeteryTutorial?.status==='preparation'){launchCemetery();return;}if(campaign?.cathedralIntermission&&!campaign.cathedralIntermission.completed){showIntermission();return;}epoch++;stopView();closeModal();if(!campaign){newGame();return;}screen='base';app.innerHTML=`<main class="base">${topbar()}<div class="base-content"><div class="section-head"><div><div class="eyebrow">SANCTUARY OF LUMEN</div><h2>月下の拠点</h2></div><span class="tag"><span class="dot"></span>　${campaign.difficulty==='story'?'物語':'標準'} · ${Object.values(campaign.cleared).filter(x=>x.win).length} / 3 戦役踏破</span></div><div class="base-grid"><div><section class="base-hero"><img src="assets/astarthe.png" alt="月光の下のアスターテ"><div class="base-hero-copy"><div class="eyebrow">THE MOON STILL GUIDES US</div><h2>この夜にも、<br>導きの光はある。</h2><p>「${campaign.unlocked===0?'鈴の音が届くうちは、道に迷わせません。':campaign.unlocked===1?'水路の先に、まだ灯が見えます。一緒に参りましょう。':'何度還っても、ここは私たちの帰る場所です。'}」<br><span class="tiny">— 夜鳴り猫、アスターテ</span></p></div></section><div class="row spread party-title"><span class="eyebrow">YOUR RETURNERS</span><span class="tiny muted">帰還時のHPは維持されます</span></div><section class="party-grid">${campaign.heroes.map(h=>{const d=stats(h);return `<button class="party-card" data-action="hero" data-id="${h.id}">${portrait(h.id)}<div class="role">${d.title}</div><div class="name">${d.name}</div><div class="row spread hp-value"><span class="muted">Lv.${h.lv}</span><span>${h.hp}<span class="muted"> / ${d.maxHp}</span></span></div>${hpbar({...d,hp:h.hp})}${h.hp===0?'<div class="red tiny" style="margin-top:7px">戦闘不能</div>':h.rest?'<div class="gold tiny" style="margin-top:7px">休息中</div>':''}</button>`;}).join('')}</section><div class="services"><button class="service row" data-action="guild"><span class="icon">♧</span><div><strong>血盟</strong><small>癒し・蘇生・転生</small></div><span style="margin-left:auto" class="muted">→</span></button><button class="service row" data-action="market"><span class="icon">⚒</span><div><strong>市場</strong><small>補給・売却・装備強化</small></div><span style="margin-left:auto" class="muted">→</span></button></div></div><aside class="panel missions-panel"><div class="eyebrow">CHOOSE YOUR EXPEDITION</div><h3>帳の向こうへ</h3><button class="mission-card tutorial-card" data-action="tutorial"><span class="number">PROLOGUE · TUTORIAL</span><div class="mission-name">廃墟の聖堂</div><div class="place">アスターテの脱出劇 · 全3エリア</div><span class="tag">${campaign.tutorialCompleted?'踏破済み · 再挑戦':'基本操作を学ぶ'}</span><span class="chevron">→</span></button><button class="mission-card" data-action="cemetery-alpha"><span class="number">TUTORIAL 02 · α</span><div class="mission-name">灰の墓地</div><div class="place">灰の墓地の門へ</div><span class="chevron">→</span></button>${MISSIONS.map(m=>`<button class="mission-card ${m.id>campaign.unlocked?'locked':''}" data-action="prep" data-id="${m.id}" ${m.id>campaign.unlocked?'disabled':''}><span class="number">CHAPTER 0${m.id+1}</span><div class="mission-name">${m.name}</div><div class="place">${m.place}</div><div class="row"><span class="tag">${m.short}</span><span class="tiny muted">${m.id>campaign.unlocked?'前の戦役を踏破して解放':`${m.stages}区画 · ${m.turns}ターン`}</span></div>${campaign.cleared[m.id]?`<span class="rank">${campaign.cleared[m.id].rank}</span>`:''}<span class="chevron">${m.id>campaign.unlocked?'◇':'→'}</span></button>`).join('')}<p class="tiny muted" style="line-height:1.9;margin-top:5px">出撃準備で装備・スキル・初期陣形を調整できます。<br>まずは「鈴の鳴る方へ」から。</p></aside></div><footer class="base-footer"><span>Dark Veil · Lumen Chronicles</span><span>α 0.32　｜　${campaign.autoSave?'帰還時オートセーブ ON':'手動セーブ'}　｜　少人数向け試作</span></footer></div></main>`;}
function newGame(){modal(`<div class="eyebrow">A NEW CHRONICLE</div><h2>物語のはじまり</h2><p class="muted small-text">世界は帳に覆われた。都市は沈黙し、人は獣じみた何かへと変じていった。<br>それでも月を見上げる者たちがいる。還り人たちを率い、帳の瀬際へ向かう。</p><div class="divider"></div><button class="primary wide" data-action="tutorial-new">チュートリアルから始める<br><small>廃墟の聖堂 · アスターテの物語</small></button><div class="row" style="margin-top:12px"><button class="wide" data-action="start-new" data-id="normal">標準<br><small>戦術を楽しむ · 敗北時EXPなし</small></button><button class="secondary wide" data-action="start-new" data-id="story">物語<br><small>敵HP・火力を軽減 · 敗北時EXPあり</small></button></div><p class="tiny muted" style="margin-top:15px">${campaign?'現在の未保存の進行は置き換わります。保存済みの記録は残ります。':'戦闘中の中断セーブはありません。拠点で記録できます。'}</p>`);}
function heroDetail(id){statusHeroId=id;const h=campaign.heroes.find(x=>x.id===id),d=stats(h);modal(`<div class="eyebrow">RETURNER DOSSIER</div><h2>${d.name}</h2><div class="hero-detail">${portrait(id,true)}<div><div class="gold small-text">${d.title}　／　${d.job}</div><p style="margin-top:9px">${d.bio}</p>${d.quote?`<p style="margin-top:8px;color:var(--gold)">「${esc(d.quote)}」</p>`:''}</div></div><div class="status-pagination"><button data-action="status-page" aria-label="前のステータスページ">◀</button><span>${statusPage+1} / 2</span><button data-action="status-page" aria-label="次のステータスページ">▶</button></div><div class="selection-stats" ${statusPage?'hidden':''}>${[['HP',`${h.hp} / ${d.maxHp}`],['Lv / EXP',`${h.lv} / ${h.xp} / ${xpNeeded(h.lv)}`],['攻撃',d.atk],['防御',d.def],['神秘',d.mag],['抗秘',d.res],['迅速',d.speed],['移動力',d.move],['視界',d.sight]].map(([k,v])=>`<div><span>${k}</span>${v}</div>`).join('')}</div><div class="divider"></div>${d.wolf_move?`<p class="small-text gold">ヒト：移動 ${d.move}・視界 ${d.sight} ／ 狼：移動 ${d.wolf_move}・視界 ${d.wolf_sight}</p>`:''}${[...new Set([...d.skills,...(d.wolf_passive?[d.wolf_passive]:[])])].map(s=>`<div style="margin-bottom:12px"><div class="small-text gold">${SKILLS[s].name}${SKILLS[s].passive?'　<small>常時</small>':''}</div><p class="tiny muted">${SKILLS[s].desc}</p></div>`).join('')}<p class="tiny muted">${h.penalty?'転生ペナルティ：次のレベルまで獲得EXP −25%。':''}装備：${h.weapon} ／ ${h.armor}　強化 +${h.upgrade}</p>`);}
function prep(id=selectedMission){if(id>campaign.unlocked)return;selectedMission=id;screen='prep';formationPick=null;const m=MISSIONS[id];formation=arrangeFormation(campaign.heroes,formation);app.innerHTML=preparationScreen({eyebrow:`CHAPTER 0${id+1} · DEPLOYMENT`,tools:'<button class="small" data-action="base">← 拠点へ</button><button class="debug-entry" data-action="debug">DEBUG</button>',objectives:`<div class="eyebrow">${m.subtitle}</div><h3>${m.name}</h3><div class="brief-item"><span>主目標</span><span>${m.objective}</span></div><div class="brief-item"><span>副目標</span><span>${m.sub}</span></div><div class="brief-item"><span>敗北条件</span><span>${m.turns}ターン超過・${m.id===2?'アスターテの戦闘不能':'味方全員の戦闘不能'}</span></div><p class="brief-text">${m.desc}</p><div class="brief-item"><span>報酬</span><span class="gold">${m.reward} 血の澱</span></div><div class="divider"></div><p>血の澱　${campaign.blood}</p><h3>所持品</h3><p class="tiny muted" style="line-height:1.8;margin-bottom:16px">${inventorySummary(campaign.inventory,campaign.questItems,campaign.weapons)}</p>`,party:`${campaign.heroes.map(h=>{const d=stats(h);return `<article class="panel prep-card">${portrait(h.id)}<div><h3>${d.name} <small class="muted" style="font:11px var(--sans)">Lv.${h.lv}</small></h3><div class="tiny muted">HP ${h.hp} / ${d.maxHp}　移動 ${d.move}　視界 ${d.sight}　アクション 1</div>${hpbar({...d,hp:h.hp})}<div class="skill-list">${d.skills.map((s,i)=>`<button title="${SKILLS[s].desc}" class="skill-chip ${h.equipped.includes(s)?'':'off'}" data-action="toggle-skill" data-id="${h.id}" data-skill="${s}">${SKILLS[s].passive?'受動':['attack','debuff'].includes(SKILLS[s].kind)?'基本':'能動'} · ${SKILLS[s].name}</button>`).join('')}</div></div><div><label class="field">主武装<select data-change="equip" data-id="${h.id}" data-slot="weapon">${weaponOptions(h,campaign).map(w=>`<option ${h.weapon===w.name?'selected':''}>${esc(w.name)}</option>`).join('')}</select></label><label class="field">防具<select data-change="equip" data-id="${h.id}" data-slot="armor">${Object.values(ALL_ITEMS).filter(i=>i.category==='armor'&&(i.usable_by.includes('*')||i.usable_by.includes(h.id))).map(i=>`<option ${h.armor===i.name?'selected':''}>${esc(i.name)}</option>`).join('')}</select></label><button class="small wide" data-action="hero" data-id="${h.id}">ステータス・スキル詳細</button><button class="small wide ${h.rest?'secondary':''}" data-action="rest" data-id="${h.id}" ${h.hp===0?'disabled':''}>${h.hp===0?'戦闘不能':h.rest?'休息する ✓':'出撃する ✓'}</button></div></article>`;}).join('')}<p class="tiny muted">スキル名をクリックして着脱。固有スキルには必要装備があります。休息した仲間は戦役終了後に全回復。</p>`,formation:`<h3>初期配置</h3><div class="row spread"><span class="eyebrow">FORMATION</span><span class="tiny muted">2人選んで配置交換</span></div><div class="deployment-picker">${[0,1,2,3].map(slot=>{const h=campaign.heroes.find(h=>formation[h.id]===slot);if(!h)return `<button disabled><span class="tiny muted">${['左前','左後','右前','右後'][slot]}</span><br>空き</button>`;return `<button data-action="formation" data-id="${h.id}" id="formation-${h.id}">${stats(h).name}${h.rest?'（休息）':''} <small>${String.fromCharCode(65+slot)} · ${['左前','左後','右前','右後'][slot]}</small></button>`;}).join('')}</div>${deploymentPreview(makeMap(id,0),{action:'formation-slot',formation,heroes:campaign.heroes.map(h=>({...h,name:stats(h).name})),disabled:!formationPick})}<button class="primary wide" data-action="deploy">戦場へ　→</button><p class="tiny muted" style="margin-top:10px">${m.id===2?'アスターテの出撃が必須です。':'出撃メンバーは1〜4人。'}</p>`});}
function guild(){modal(`<div class="eyebrow">BLOOD COVENANT</div><h2>血盟の癒し</h2><p class="small-text muted">血の澱を捧げ、傷を癒す。転生はHP1で復帰し、次のレベルまで獲得EXPが25%減ります。</p><p class="gold" style="margin:15px 0">所持：${campaign.blood} 血の澱</p>${campaign.heroes.map(h=>{const d=stats(h),cost=(h.hp===0?65:20)+h.lv*5;return `<div class="shop-row"><div class="row">${portrait(h.id)}<div><h3>${d.name}</h3><p>HP ${h.hp} / ${d.maxHp}${h.penalty?' · 転生ペナルティ':''}</p></div></div><div class="row">${h.hp===0?`<button class="small" data-action="rebirth" data-id="${h.id}">転生 · 無料</button>`:''}<button class="small primary" data-action="restore" data-id="${h.id}" ${h.hp===d.maxHp||campaign.blood<cost?'disabled':''}>${h.hp===0?'蘇生':'全回復'} · ${cost}</button></div></div>`;}).join('')}<p class="tiny muted" style="margin-top:15px">蘇生・回復は既存の転生ペナルティを消しません。次のレベルアップで解除されます。</p>`);}
function market(){modal(`<div class="eyebrow">THE NIGHT MARKET</div><h2>市場</h2><p class="gold">所持：${campaign.blood} 血の澱</p>${Object.entries(ITEMS).filter(([,i])=>i.market!==false).map(([k,i])=>`<div class="shop-row"><div><h3>${i.name} <small class="muted" style="font-size:11px">×${campaign.inventory[k]}</small></h3><p>${i.desc}</p></div><div class="row"><button class="small" data-action="sell" data-id="${k}" ${campaign.inventory[k]<1?'disabled':''}>売却 ${i.sellPrice}</button><button class="small primary" data-action="buy" data-id="${k}" ${campaign.blood<i.price||campaign.inventory[k]>=i.stackLimit?'disabled':''}>購入 ${i.price}</button></div></div>`).join('')}<div class="divider"></div><div class="eyebrow">EQUIPMENT FORGE</div>${campaign.heroes.map(h=>`<div class="shop-row"><div><h3>${stats(h).name}の装備 +${h.upgrade}</h3><p>強化1段階につき 攻撃・神秘 +8。最大+5。</p></div><button class="small" data-action="upgrade" data-id="${h.id}" ${h.upgrade>=5||campaign.blood<80*(h.upgrade+1)?'disabled':''}>${h.upgrade>=5?'強化済み':`強化 ${80*(h.upgrade+1)}`}</button></div>`).join('')}`,true);}
function saveMenu(modeArg='save'){if(debugSession.active){toast('デバッグ中は通常の記録の保存・読込を停止しています。');return;}saveMode=modeArg;modal(`<div class="eyebrow">CHRONICLE ARCHIVE</div><h2>還りの記録</h2><p class="small-text muted" style="margin-bottom:18px">12スロット＋帰還時オートセーブ。記録はこのブラウザに保存されます。</p><div class="slots">${Array.from({length:12},(_,i)=>{const v=readStore(`dv-slot-${i}`);return `<div class="save-slot"><strong>記録 ${String(i+1).padStart(2,'0')}</strong><p>${v?`${esc(v.date)}<br>${v.data?.difficulty==='story'?'物語':'標準'} · ${Number(v.data?.blood)||0} 血の澱`:'— 空の記録 —'}</p><div class="row">${canSave()?`<button data-action="save-slot" data-id="${i}">保存</button>`:''}<button data-action="load-slot" data-id="${i}" ${!v?'disabled':''}>読込</button></div></div>`;}).join('')}</div><div class="modal-actions"><button data-action="load-auto" ${readStore('dv-auto')?'':'disabled'}>自動保存を読込</button><button data-action="import">JSON読込</button><button data-action="export" ${canSave()?'':'disabled'}>JSON書出</button></div><p class="tiny muted" style="margin-top:12px">ブラウザの保存領域を消去すると記録も失われます。JSONでバックアップできます。</p>`,true);}
function saveSlot(i){if(!canSave())return;const existing=readStore(`dv-slot-${i}`);if(existing){modal(`<div class="eyebrow">OVERWRITE RECORD</div><h2>記録 ${i+1} を上書きしますか？</h2><p class="muted">保存日時：${esc(existing.date)}</p><div class="modal-actions"><button data-action="saves">戻る</button><button class="primary" data-action="save-confirm" data-id="${i}">上書きする</button></div>`);}else doSave(i);}
function doSave(i){if(!canSave())return;if(writeStore(`dv-slot-${i}`,{date:new Date().toLocaleString('ja-JP'),data:campaign})){toast('記録を保存しました。');saveMenu();}}
function loadData(v){if(debugSession.active)return;try{campaign=validateCampaign(v);formation={};base();toast('記録を読み込みました。');}catch(e){toast(e.message);}}
function exportSave(){if(!canSave())return;const blob=new Blob([JSON.stringify(campaign,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`DarkVeil-save-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('セーブデータを書き出しました。');}
function settings(){modal(`<div class="eyebrow">OPTIONS</div><h2>設定</h2><div class="shop-row"><div><h3>効果音</h3><p>選択・戦闘・フェイズ切替の音</p></div><button data-action="sound">${soundOn?'ON':'OFF'}</button></div>${campaign?`<div class="shop-row"><div><h3>オートセーブ</h3><p>戦役終了後、拠点へ帰還したとき</p></div><button data-action="autosave" ${debugSession.active?'disabled':''}>${debugSession.active?'デバッグ中：停止':campaign.autoSave?'ON':'OFF'}</button></div>`:''}<p class="tiny muted" style="margin-top:20px">α版 0.21 · 仕様書 ver3.2 対応。</p>`);}
function help(){modal(`<h2>月影の戦術指南</h2><p>(作成中)</p>`);}
function codex(){modal(`<div class="eyebrow">LUMEN ARCHIVES</div><h2>還り人の記録</h2><p class="brief-text">かつてこの世界には、高い文明があった。<br>だが、ある日、世界は帳に覆われた。<br>世界は滅びることすらなく、歪んだまま残された。<br>――ダークヴェール。</p><div class="divider"></div>${HEROES.map(h=>`<button class="wide row" style="margin-bottom:10px;text-align:left" data-action="hero" data-id="${h.id}">${portrait(h.id)}<div><h3>${h.name}</h3><span class="tiny muted">${h.title}</span></div><span class="gold" style="margin-left:auto">→</span></button>`).join('')}<p class="tiny muted" style="margin-top:16px">序章は提供台本に基づきます。既存3戦役の会話はSRPG試作用の仮設定です。</p><div class="modal-actions"><a href="specs/game-system.txt" target="_blank" rel="noopener" class="gold small-text">ゲームシステム仕様書 ↗</a><a href="specs/tutorial-script.txt" target="_blank" rel="noopener" class="gold small-text">チュートリアル台本 ↗</a><a href="implementation-notes.txt" target="_blank" rel="noopener" class="gold small-text">実装ノート・暫定仕様を読む ↗</a></div>`);}
function deploy(){
 const ready=campaign.heroes.filter(h=>!h.rest&&h.hp>0);if(!ready.length){toast('戦闘可能な仲間を1人以上、出撃に設定してください。');return;}
 if(selectedMission===2&&!ready.some(h=>h.id==='astarthe')){toast('この防衛戦ではアスターテの出撃が必要です。');return;}
 battle=new Battle(campaign,selectedMission,formation);dialogIndex=0;startBattle();showDialogue();
}
function showDialogue(){const story=battle.mission.story,[id,text]=story[dialogIndex],d=HEROES.find(h=>h.id===id);
 modal(dialogueBody({speaker:d.name,text,portrait:portrait(id),actions:`<span class="dialogue-counter">${dialogIndex+1} / ${story.length}</span><button class="text-button" data-action="skip-story">会話をスキップ</button><button class="primary" data-action="next-story">${dialogIndex+1===story.length?'進軍を開始する':'次へ'}</button>`}),false,false,true,nextStory);
}
function startBattle(){battle.debug=debugSession.active;epoch++;busy=false;stopView();closeModal();screen='battle';selected=battle.living('ally')[0]??null;mode='move';pending=null;hover=null;app.innerHTML=`<main class="battle-app scenario-screen ${battle.tutorial?'tutorial-arrival':''}"><header class="topbar battle-top"><div class="battle-title"><span class="brand-mark">☾</span><div><div class="eyebrow" style="font-size:8px;letter-spacing:2px">${battle.tutorial?'PROLOGUE':battle.tutorial2?'TUTORIAL 02 · α':'CHAPTER 0'+(battle.mission.id+1)}</div><h3>${battle.mission.name}</h3></div></div><div class="turn-block"><span class="turn-label">TURN</span><span class="turn-number" id="turn-number"></span><span class="phase-tag" id="phase-tag"></span></div><div class="row"><button class="text-button" data-action="help" aria-label="指南">?</button><button class="small" data-action="pause">Ⅱ メニュー</button></div></header><div class="battle-body"><aside class="battle-sidebar" id="battle-left"></aside><section class="battle-map-wrap"><canvas class="battle-map" id="map" tabindex="0" role="img" aria-label="${battle.map.width}×${battle.map.height}の戦術マップ。仲間と移動先をマウスで選択してください。"></canvas><div class="map-vignette"></div>${battle.tutorial2?'<div class="cemetery-map-caption" id="cemetery-caption">灰の墓地</div><div class="cemetery-cutin" id="cemetery-cutin"></div><div id="cemetery-diagrams"></div><div class="cemetery-screen-fade" id="cemetery-fade"></div><button id="cemetery-skip" class="small cemetery-skip" data-action="cemetery-skip" hidden>イベントをスキップ</button>':''}<div id="area-title" class="area-title-overlay" aria-live="polite"></div><div class="map-controls"><button data-action="rotate-left" aria-label="左へ45度回転 Q">↶ Q</button><button data-action="rotate-right" aria-label="右へ45度回転 E">E ↷</button><button data-action="zoom-out" aria-label="縮小">−</button><button data-action="zoom-in" aria-label="拡大">＋</button><button data-action="reset-camera">全体</button></div><div class="terrain-box" id="terrain-box"><strong>月下の古道</strong><p>地形にカーソルを合わせて確認</p></div><div class="map-legend"><span><i class="legend-square"></i>移動</span><span><i class="legend-square range"></i>遠距離・指定射程</span><span><i class="legend-square attack"></i>近接</span><span><i class="legend-square support"></i>支援</span><span class="gold">? 推定位置</span>${battle.flags?.bossStarted?'<span>橙斜線：予兆</span>':''}</div></section><aside class="battle-sidebar battle-right" id="battle-right"></aside></div>${textField('',true)}<div id="cinematic-fade" class="cinematic-fade" aria-hidden="true"></div><div id="item-flyouts" class="item-flyouts" hidden></div><footer class="battle-bottom"><div class="hint" id="battle-hint"></div><div class="row"><button class="small" data-action="deselect">選択解除</button><button class="primary" id="end-turn" data-action="end-turn">ターン終了　Enter</button></div></footer></main>`;
 view=new MapView($('#map'),battle,()=>({selected,mode,danger:dangerCache,reachable:reachCache,area:areaCache,targetRange:targetRangeCache,path:pathCache,interactive:screen==='battle'&&!debugMenu?.opened&&!busy&&!paused&&battle.phase==='ally'&&!battle.result&&!battle.pendingExit&&!battle.preparing&&!battle.scripted,emote:eventEmote}),mapHover,mapClick);if(battle.tutorial)view.focus(battle.hero());refreshBattle();if(!battle.tutorial&&!battle.tutorial2)showAreaTitle(battle.mission.place.split(' → ')[battle.stage]??battle.mission.place);
}
function statuses(u){const a=Object.entries(u.status).map(([id,s])=>`<span class="${id==='immune'?'good':''}">${STATUS_NAMES[id]} ${id==='doom'?s.stacks.length:s.turns}</span>`);if(u.wolf_move){a.push(`<span>${u.form==='wolf'?'狼形態':'ヒト形態'}</span>`);const bonus=battle.courtshipBonus(u);if(bonus)a.push(`<span class="good">月夜の求愛者 +${Math.round(bonus*100)}%</span>`);}for(const [k,b]of Object.entries(u.buffs))if(b.positive)a.push(`<span class="good">${{atk:'攻撃',def:'防御',res:'抗秘',speed:'迅速',move:'移動力'}[k]||k}↑ ${b.positive.turns}</span>`);return `<div class="status-tags">${a.join('')}</div>`;}
function refreshBattle(){if(screen!=='battle')return;
 updateEnemyPhaseStatus($('#enemy-phase-status'),battle);
 if(selected&&!battle.units.includes(selected))selected=null;
 dangerCache=!battle.scripted&&selected?.heavy?battle.danger(selected):null;
 reachCache=!battle.scripted&&selected&&selected.team==='ally'&&battle.phase==='ally'&&!selected.waited?battle.reachable(selected,true).costs:new Map();pathCache=null;updateArea();
 $('#turn-number').textContent=String(battle.turn).padStart(2,'0');$('#phase-tag').className=`phase-tag ${battle.phase==='enemy'?'enemy':''}`;$('#phase-tag').textContent=battle.phase==='ally'?'PLAYER PHASE':'ENEMY PHASE';if(battle.tutorial2&&battle.flow==='boss'){const legend=$('.map-legend');if(legend)legend.textContent='橙斜線：予兆　'+(selected?.heavy?'赤：墓碑薙ぎ　薄赤：移動後の墓碑薙ぎ':'青：移動　赤：近接　紫：遠距離・指定射程　緑：支援');}
 $('#end-turn').disabled=battle.phase!=='ally'||!!battle.result||battle.scripted;
 $('#battle-left').innerHTML=`<div class="battle-roster"><div class="objective"><div class="eyebrow">MISSION OBJECTIVES</div><h3>作戦目標</h3><p class="goal">◇ ${battle.tutorial||battle.tutorial2?battle.objective():battle.mission.id===1?(battle.stage===0?'全員で東端の4マスへ到達':'礼拝堂の帳守を撃破'):battle.mission.objective}</p>${battle.tutorial?`${battle.stage>0||battle.flags.staff?`<p class="${battle.stage===2?'objective-complete':''}">${battle.stage===2?'☑':'☐'} 聖堂の地上階をめざせ(${battle.stage}/2)</p>`:''}<button class="small" data-action="tutorial-guide">操作案内 ${battle.lessons.length}/12</button>`:`<p style="margin-top:7px">副：${battle.mission.sub}</p>${battle.tutorial2?'<button class="small" data-action="cemetery-guide">確認した操作</button>':''}`}<p style="margin-top:7px">${battle.tutorial?'戦闘不能時はチェックポイントから再開':battle.tutorial2?'敗北：味方全員の戦闘不能':battle.mission.id===2?'アスターテ戦闘不能で敗北':`${battle.mission.turns}ターン以内`}</p></div><div class="divider" style="margin:2px 0"></div><div class="row spread"><span class="eyebrow" style="font-size:9px;letter-spacing:2px">RETURNERS</span><span class="tiny muted">${battle.living('ally').length} / ${battle.units.filter(u=>u.team==='ally').length}</span></div><div class="unit-list">${battle.units.filter(u=>u.team==='ally').map(u=>`<button class="unit-row ${selected?.id===u.id?'selected':''} ${u.waited||u.hp===0?'spent':''}" data-action="select-unit" data-id="${u.id}">${portrait(u.id)}<div><div class="name">${u.name}</div><small>${u.hp} / ${battle.effective(u,'maxHp')}</small>${hpbar({...u,maxHp:battle.effective(u,'maxHp')})}</div><span class="ready">${u.hp===0?'×':u.ap?'◆':'◇'}</span></button>`).join('')}</div></div><canvas class="minimap" id="minimap" aria-label="探索済みの地形と部隊のミニマップ"></canvas><section class="battle-log"><h3>行動ログ</h3><div class="log-feed" id="log-feed" role="log" aria-live="polite" aria-label="味方・敵ユニットの行動ログ">${battle.log.map(t=>`<p>${esc(t)}</p>`).join('')}</div></section>`;drawMinimap($('#minimap'),battle);const logs=$('#log-feed');logs.scrollTop=logs.scrollHeight;renderRight();renderForecast();renderItemMenu();
 $('#battle-hint').innerHTML='<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> カメラ移動　<kbd>Q</kbd><kbd>E</kbd> 45°回転　<kbd>Esc</kbd> 取消';
}
function updateArea(){areaCache=[];targetRangeCache=[];if(!selected||battle.scripted)return;
 if(mode==='move'){
  if(selected.heavy)return;
  if(selected.team==='enemy')for(let y=0;y<battle.map.height;y++)for(let x=0;x<battle.map.width;x++)if(battle.inRange(selected,{x,y},'attack')&&battle.visible.has(key(x,y)))areaCache.push({x,y});return;
 }
 if(mode.startsWith('item:')&&ITEMS[mode.slice(5)].enemy){for(let y=0;y<battle.map.height;y++)for(let x=0;x<battle.map.width;x++)if(battle.itemInRange(selected,{x,y},ITEMS[mode.slice(5)]))areaCache.push({x,y});return;}
 if(mode.startsWith('item:')){areaCache=[{x:selected.x,y:selected.y},...[[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy])=>({x:selected.x+dx,y:selected.y+dy}))];return;}
 const s=SKILLS[mode];if(!s)return;
 if(s.targeted)targetRangeCache=battle.targetRange(selected,mode).filter(p=>battle.visible.has(key(p.x,p.y)));
 if(s.kind==='relocate'){areaCache=pending?.target?battle.pullDestinations(selected,pending.target):[];return;}
 if(s.shape){const p=pending?.target??hover;areaCache=battle.area(selected,mode,s.kind==='heal'&&p?battle.at(p.x,p.y):p);}
 else for(let y=0;y<battle.map.height;y++)for(let x=0;x<battle.map.width;x++)if(battle.inRange(selected,{x,y},mode))areaCache.push({x,y});
}
function renderRight(){const u=selected;
 if(!u){$('#battle-right').innerHTML='<div class="empty-selection"><span class="symbol">☾</span>鈴の音を頼りに、<br>帳の向こうへ。<br><br><span class="small-text">仲間を選んでください。</span></div>';return;}
 $('#battle-right').innerHTML=`<div><div class="selection-head">${portrait(u.id)}<div><div class="eyebrow">${u.team==='ally'?u.title:'敵ユニット'}</div><h3>${u.name}</h3></div></div><div class="row spread small-text"><span class="muted">HP</span><span>${u.hp} <span class="muted">/ ${battle.effective(u,'maxHp')}</span></span></div>${hpbar({...u,maxHp:battle.effective(u,'maxHp')})}${statuses(u)}<div class="ap-info"><span>移動 ${u.mp} / ${battle.movementLimit(u)}</span><span>行動 ${u.ap} / 1</span></div><div class="status-pagination"><button data-action="status-page" aria-label="前のステータスページ">◀</button><span>${statusPage+1} / 2</span><button data-action="status-page" aria-label="次のステータスページ">▶</button></div><div class="selection-stats" ${statusPage?'hidden':''}>${[['攻撃','atk'],['防御','def'],['神秘','mag'],['抗秘','res'],['迅速','speed'],['会心','crit'],['視界','sight']].map(([k,v])=>`<div><span>${k}</span>${Math.floor(battle.effective(u,v))}${v==='crit'?'%':''}</div>`).join('')}</div>${statusPage?`<section class="status-details"><h4>装備・スキル</h4><p>${esc(u.weapon??'—')}<br>${esc(u.armor??'—')}</p>${(u.equipped??[]).map(id=>`<p><strong>${esc(SKILLS[id].name)}</strong><br>${esc(SKILLS[id].desc)}</p>`).join('')}</section>`:''}<div class="divider"></div>${u.team==='ally'?`<div class="eyebrow" style="font-size:9px;letter-spacing:2px;margin-bottom:10px">COMMAND</div><div class="commands"><button class="command ${mode==='move'?'active':''}" data-action="mode" data-id="move" ${u.hp<=0||u.waited||battle.phase!=='ally'?'disabled':''}>移動 <small>${u.mp} pt</small></button>${u.equipped.filter(id=>!SKILLS[id].passive).map(id=>{const sk=SKILLS[id],reason=battle.available(u,id);return `<button title="${sk.desc}" class="command ${mode===id?'active':''}" data-action="mode" data-id="${id}" ${reason||battle.phase!=='ally'?'disabled':''}>${id==='metamorphosis'?'形象変化':sk.name}<small>${reason||sk.freeAction&&`${u.form==='wolf'?'ヒト':'狼'}へ · 行動0`||[sk.cd&&`CT ${sk.cd}`,sk.uses&&`残り${sk.uses-(u.uses[id]||0)}回`].filter(Boolean).join(' · ')||`射程 ${battle.skillRange(id,u)}`}</small></button>`;}).join('')}<button class="command ${mode.startsWith('item:')?'active':''}" id="items-command" aria-controls="item-flyouts" aria-expanded="${itemMenuOpen}" data-action="items" ${u.hp<=0||!u.ap||u.waited||u.status.paralysis||battle.phase!=='ally'?'disabled':''}>アイテム <small>行動1</small></button><button class="command" data-action="wait-unit" ${u.hp<=0||u.waited||battle.phase!=='ally'?'disabled':''}>待機 <small>行動を終了</small></button></div><p class="command-note">${mode==='move'?'移動力が残っていれば、攻撃後も移動できます。':mode.startsWith('item:')?ITEMS[mode.slice(5)].desc:SKILLS[mode]?.desc??''}</p>`:`<div class="eyebrow">ENEMY INTELLIGENCE</div><p class="command-note">視界 ${u.sight}${u.cardinalSight?'（直線）':''} · 通常攻撃 射程${u.range}<br>${attackStyle(u)==='ranged'?'紫':'赤'}のマスは現在位置からの攻撃範囲です。<br>${u.magic?'神秘':'物理'}攻撃を使用します。${u.tutorialType?'<br>'+u.equipped.map(id=>SKILLS[id].name+'：'+SKILLS[id].desc).join('<br>'):''}</p>`}</div><div style="margin-top:auto"><p class="tiny muted" style="line-height:1.8">${u.team==='ally'?`${esc(u.weapon)}<br>${esc(u.armor)}<br>${battle.skills(u).filter(id=>SKILLS[id].passive).map(id=>`◇ ${SKILLS[id].name}`).join('')}`:'敵の情報は現在見えている範囲のみ。'}</p></div>`;
}
function selectUnit(id){if(battle.scripted)return;const u=battle.units.find(u=>u.id===id);if(!u||!battle.isVisible(u))return;closeItemMenu();selected=u;statusPage=0;mode='move';pending=null;chime();battle.selectUnit?.(id);refreshBattle();if(battle.tutorial2&&battle.messages.length)cemeteryPump();}
function mapHover(p){hover=p;const box=$('#terrain-box');if(!box)return;
 if(!p){box.innerHTML='<strong>戦場の霧</strong><p>地形にカーソルを合わせて確認</p>';pathCache=null;if(SKILLS[mode]?.targeted&&!pending)updateArea();return;}
 const vis=battle.visible.has(key(p.x,p.y)),known=battle.seen.has(key(p.x,p.y)),t=vis?TERRAIN[battle.tile(p.x,p.y)]:null;
 box.innerHTML=`<div class="row spread"><strong>${t?.name??(known?'視界外':'未踏の領域')}</strong><span class="tiny muted">${p.x+1}, ${p.y+1}</span></div><p>${t?.desc??(known?'通行可否・高さを記録しています':'地形・敵の情報は不明')}</p>${known?`<p>高さ ${battle.elevationAt(p,true)}${selected&&vis?` · 選択ユニットとの差 ${battle.elevationDifference(selected,p)>0?'+':''}${battle.elevationDifference(selected,p)}`:''}</p>`:''}${selected&&mode==='move'&&reachCache.has(key(p.x,p.y))?`<p class="gold">必要移動力 ${reachCache.get(key(p.x,p.y))}${vis?'':'（予測）'}</p>`:''}`;
 pathCache=selected?.team==='ally'&&mode==='move'&&reachCache.has(key(p.x,p.y))?battle.route(selected,p.x,p.y):null;
 if((SKILLS[mode]?.directional||SKILLS[mode]?.targeted)&&!pending)updateArea();
}
async function mapClick(p){if(debugMenu?.opened)return;if(dialogueAdvance){advanceDialogue();return;}if(!p||busy||paused||battle.result||battle.phase!=='ally')return;const occupant=battle.at(p.x,p.y),seen=occupant&&battle.isVisible(occupant)?occupant:null;
 if(!selected||selected.team==='enemy'){if(seen){selectUnit(seen.id);}return;}
 if(mode==='move'){
  if(seen){selectUnit(seen.id);return;}
  if(battle.move(selected,p.x,p.y)){chime();const token=epoch;busy=true;await view?.animateMoves();if(token!==epoch||screen!=='battle')return;busy=false;afterBattleAction();}else toast('そこには移動できません。残り移動力と地形を確認してください。');return;
 }
 if(mode.startsWith('item:')){const target=battle.units.find(u=>u.x===p.x&&u.y===p.y&&u.hp===0&&mode==='item:revive')||seen;if(target)chooseItemTarget(target.id);return;}
 const sk=SKILLS[mode];
 if(sk.kind==='relocate'){
  if(pending?.target&&battle.pullPath(selected,pending.target,p)){pending.destination={...p};updateArea();renderForecast();return;}
  if(!seen||!battle.canTarget(selected,mode,seen)){toast('射程内の味方、または緑色の空きマスを選んでください。');return;}
  pending={skill:mode,target:seen,destination:null};updateArea();renderForecast();return;
 }
 if(sk.targeted){const target=sk.kind==='heal'?seen:p;if(!battle.canTarget(selected,mode,target)){toast(sk.kind==='heal'?'射程内の味方を選んでください。':'射程内の直線上のマスを選んでください。');return;}pending={skill:mode,target};updateArea();renderForecast();return;}
 if(sk.shape){if(sk.directional&&near(selected,p)===0){toast('攻撃する方向を選んでください。');return;}pending={skill:mode,target:p};updateArea();renderForecast();return;}
 if(!seen||!battle.targets(selected,mode).includes(seen)){toast('有効な射程内の対象を選んでください。');return;}pending={skill:mode,target:seen};renderForecast();
}
function setMode(id){if(busy||!selected||selected.team!=='ally'||battle.phase!=='ally')return;if(id!=='move'&&battle.available(selected,id))return;closeItemMenu();mode=id;pending=null;
 if(id!=='move'&&SKILLS[id]?.shape&&!SKILLS[id].directional&&!SKILLS[id].targeted)pending={skill:id,target:null};refreshBattle();
}
function renderForecast(){const root=$('#forecast-container');if(!root)return;if(!pending||!selected){root.innerHTML='';return;}
 const u=selected;if(pending.item){root.innerHTML='';return;}
 const sk=SKILLS[pending.skill],targets=battle.targets(u,pending.skill,pending.target);let content='';
 if(sk.kind==='transform'){const form=u.form==='wolf'?'human':'wolf',next={...u,form};content=`<h3>${form==='wolf'?'狼':'ヒト'}の姿へ</h3><p class="small-text">残り移動力 ${u.mp} → ${Math.max(0,battle.movementLimit(next)-(u.movementSpent||0))} ／ 視界 ${Math.floor(battle.effective(u,'sight'))} → ${Math.floor(battle.effective(next,'sight'))}</p><p class="tiny muted">行動回数は消費しません。1ターンに1回。</p>`;}
 else if(sk.kind==='relocate')content=`<h3>${sk.name}：${pending.target.name}</h3><p class="small-text">${pending.destination?`移動先：(${pending.destination.x+1},${pending.destination.y+1})`:battle.pullDestinations(u,pending.target).length?'緑色の空きマスから移動先を選んでください。':'移動できる隣接マスがありません。別の味方を選ぶか取り消してください。'}</p><p class="tiny muted">対象の行動回数は回復しません。</p>`;
 else if(!sk.shape&&sk.kind==='attack'){const f=battle.forecast(u,pending.target,pending.skill);content=`<h3>${pending.target.name}</h3><div class="forecast-numbers"><div><strong>${f.min}–${f.max}</strong><small>通常ダメージ</small></div><div><strong>${f.hit}%</strong><small>命中（部分回避含む）</small></div><div><strong>${f.crit}%</strong><small>会心</small></div></div><p class="tiny muted" style="margin-top:11px">部分回避時ダメージ50% · 反撃なし</p><p class="tiny muted">高度による命中補正 ${f.accuracyModifier>0?'+':''}${f.accuracyModifier}ポイント · 補正後射程 ${f.effectiveRange}</p>`;}
 else if(sk.kind==='heal')content=`<h3>${sk.name}</h3><p class="small-text gold">${targets.map(t=>`${t.name}：HP ${t.hp} → ${t.hp+battle.healAmount(t,sk)}`).join('<br>')}</p>`;
 else content=`<h3>${sk.name}</h3><p class="small-text muted">${targets.length?targets.map(t=>`${t.name}${sk.kind==='attack'?`（約${battle.forecast(u,t,pending.skill,pending.target).damage} · 命中${battle.forecast(u,t,pending.skill,pending.target).hit}%）`:''}`).join('・'):'効果範囲内に対象はいません。'}</p><p class="tiny muted" style="margin-top:8px">${sk.kind==='buff'?`${sk.duration}ターン持続`:sk.paralysis?`遮蔽貫通・地形破壊・${sk.paralysis}%で麻痺`:sk.directional?'攻撃の向きをマップで選び直せます':'味方への巻き込みなし'}</p>`;
 root.innerHTML=`<div class="forecast"><span class="eyebrow">${sk.kind==='transform'?'FORM CHANGE':['buff','heal','relocate'].includes(sk.kind)?'SUPPORT':'COMBAT FORECAST'}</span>${content}<div class="forecast-actions"><button data-action="cancel-command">取消</button><button class="primary" data-action="confirm-action" ${(sk.kind==='relocate'&&!battle.pullPath(u,pending.target,pending.destination))||(!targets.length&&pending.skill!=='phenomena')||sk.kind==='heal'&&!targets.some(t=>battle.healAmount(t,sk)>0)?'disabled':''}>${sk.kind==='heal'?'回復する':['buff','transform','relocate'].includes(sk.kind)?'発動する':'攻撃する'}</button></div></div>`;
}
async function confirmAction(){if(busy||!pending||paused||!selected)return;const eventStart=battle.events.length,ok=pending.item?battle.useItem(selected,pending.item,pending.target):battle.act(selected,pending.skill,pending.target,pending.destination);if(!ok){toast('この行動は実行できません。対象の状態・装備・残り回数を確認してください。');return;}chime('attack');closeItemMenu();pending=null;mode='move';if(battle.events.slice(eventStart).some(e=>e.type==='move')){const token=epoch;busy=true;await view?.animateMoves();if(token!==epoch||screen!=='battle')return;busy=false;}afterBattleAction();}
function afterBattleAction(){refreshBattle();if(battle.tutorial2){cemeteryPump();return;}if(battle.tutorial){tutorialPump();return;}if(battle.messages.length){const message=battle.messages.shift();if(message.kind==='combat'){showCombatPage(message,afterBattleAction,'pickup-next');return;}modal(`<p class="pickup-message">${esc(message.text)}</p><div class="modal-actions"><button class="primary" data-action="pickup-next">次へ</button></div>`,false,false,true,afterBattleAction);return;}if(battle.result){showResult();return;}if(battle.pendingExit){modal(`<div class="eyebrow">PASSAGE DISCOVERED</div><h2>礼拝堂へ続く道</h2><p>全員が出口に到達しました。HP・状態異常・アイテム・ターン数を引き継いで、次の区画へ進みます。</p>${battle.units.some(u=>u.team==='ally'&&u.hp===0)?'<p class="gold" style="margin-top:12px">戦闘不能となっている還り人がいます。転生させますか？</p>':''}<div class="modal-actions">${battle.units.some(u=>u.team==='ally'&&u.hp===0)?'<button data-action="next-map" data-id="leave">戦闘不能の仲間を残す</button>':''}<button class="primary" data-action="next-map" data-id="rebirth">${battle.units.some(u=>u.team==='ally'&&u.hp===0)?'転生させて':''}進む →</button></div>`,false,false,true);}}
function closeItemMenu(){itemMenuOpen=false;const root=$('#item-flyouts');if(root){root.innerHTML='';root.hidden=true;}$('#items-command')?.setAttribute?.('aria-expanded','false');if(mode.startsWith('item:')){mode='move';pending=null;}}
function positionItemMenu(){
 const root=$('#item-flyouts'),button=$('#items-command');if(!itemMenuOpen||!root||!button)return;
 const panes=mode.startsWith('item:')?2:1,rect=button.getBoundingClientRect();
 const p=itemFlyoutPosition(rect,{width:window.innerWidth||1280,height:window.innerHeight||720},panes,root.getBoundingClientRect().height);
 Object.assign(root.style,{left:p.left+'px',top:p.top+'px',width:p.width+'px',maxHeight:p.maxHeight+'px'});
}
function renderItemMenu(){
 const root=$('#item-flyouts');if(!root)return;
 if(!itemMenuOpen||!selected||selected.team!=='ally'||paused||battle.phase!=='ally'||!selected.ap||selected.waited||selected.hp<=0||battle.result){closeItemMenu();return;}
 root.hidden=false;root.innerHTML=itemMenuHtml(battle,selected,mode.startsWith('item:')?mode.slice(5):null,pending?.item?pending.target.id:null);positionItemMenu();
}
function itemsMenu(){
 if(busy||paused||!selected||selected.team!=='ally'||!selected.ap||selected.waited||selected.status.paralysis||battle.phase!=='ally')return;
 if(itemMenuOpen){closeItemMenu();refreshBattle();return;}itemMenuOpen=true;mode='move';pending=null;refreshBattle();
}
function chooseItem(id){if(!itemMenuOpen||!ITEMS[id]||!battle.items[id])return;mode=`item:${id}`;pending=null;refreshBattle();}
function chooseItemTarget(id){
 if(!itemMenuOpen||!mode.startsWith('item:'))return;const item=mode.slice(5),target=battle.units.find(u=>u.id===id);
 if(battle.itemUseReason(selected,item,target))return;pending={item,target};refreshBattle();
}

function phaseBanner(){const el=$('#phase-container');if(!el)return;el.innerHTML=`<div class="phase-banner ${battle.phase==='enemy'?'enemy':''}"><strong>${battle.phase==='ally'?'PLAYER PHASE':'ENEMY PHASE'}</strong><span>第 ${battle.turn} ターン</span></div>`;chime('turn');setTimeout(()=>{if(el.isConnected)el.innerHTML='';},1400);}
function requestEndTurn(){if(battle.scripted||busy||battle.phase!=='ally'||battle.result||paused)return;const prompts=battle.endTurnPrompts();if(prompts.length){modal(`<div class="eyebrow">END PLAYER PHASE</div>${prompts.map(text=>`<p>${esc(text)}</p>`).join('')}<div class="modal-actions"><button data-action="close-modal">戦場に戻る</button><button class="primary" data-action="end-turn-confirm">ターン終了</button></div>`,false,true,true);}else endTurn();}
async function endTurn(){if(busy||battle.scripted)return;closeItemMenu();closeModal();pending=null;mode='move';battle.endPhase();afterBattleAction();if(battle.result||battle.pendingExit||battle.scripted)return;phaseBanner();if(battle.phase==='enemy')runEnemyPhase();}
async function runEnemyPhase(){
 const token=epoch,revision=battle.flowRevision,serial=++enemyLoop,b=battle;
 const valid=()=>token===epoch&&serial===enemyLoop&&screen==='battle'&&b===battle&&!b.result&&!b.retryPending&&!b.scripted&&revision===b.flowRevision;
 const wait=ms=>new Promise(r=>setTimeout(r,ms));
 await wait(1000);
 for(const e of [...b.living('enemy')]){
  while((paused||busy)&&valid())await wait(100);if(!valid())return;
  b.enemyStep(e);busy=true;await view?.animateMoves();if(token!==epoch||screen!=='battle')return;busy=false;afterBattleAction();if(!valid())return;await wait(440);
 }
 while((paused||busy)&&valid())await wait(100);if(!valid())return;
 b.endPhase();afterBattleAction();if(!b.result&&!b.pendingExit&&!b.scripted)phaseBanner();
}
function pauseMenu(){modal(`<div class="eyebrow">PAUSED</div><h2>月影のひと休み</h2><div class="stack"><button class="primary" data-action="close-modal">ゲームに戻る</button><button data-action="help">戦術指南</button><button data-action="restart-confirm">この戦役を最初から</button><button class="danger" data-action="retreat-confirm">撤退する</button></div><p class="tiny muted" style="margin-top:16px">やり直し・撤退では、HP・所持品・経験値を戦役開始時に戻します。戦闘中の中断セーブはありません。</p>`);}
function showResult(){if(battle.tutorial2){modal(cemeteryResultHtml(battle.result),true,false);return;}if(battle.tutorial){showTutorialResult();return;}const r=battle.result;modal(`<div class="result-hero"><div class="eyebrow">${r.win?'CHRONICLE COMPLETED':'THE VEIL DEEPENS'}</div><h2>${r.win?'戦役踏破':'戦役失敗'}</h2><div class="rank-seal">${r.rank}</div><p class="muted">${battle.mission.name}</p></div><div class="result-metrics"><div><strong>${r.turns}</strong><span>経過ターン</span></div><div><strong>${r.kills}</strong><span>撃破数</span></div><div><strong>+${r.xp}</strong><span>各出撃者 EXP</span></div><div><strong>+${r.blood}</strong><span>血の澱</span></div></div><p class="small-text muted" style="text-align:center">副目標 ${r.sub?'達成':'未達成'}　·　戦闘不能 ${r.casualties}回　·　戦績点 ${r.score}</p><div class="divider"></div><div class="scroll-table"><table><thead><tr><th>ユニット</th><th>陣営</th><th>HP</th><th>状態</th></tr></thead><tbody>${[...battle.units,...battle.absent].map(u=>`<tr><td>${u.name}</td><td>${u.team==='ally'?'自軍':'敵軍'}</td><td>${u.hp} / ${u.maxHp}</td><td>${u.hp===0?'戦闘不能':Object.keys(u.status).map(k=>STATUS_NAMES[k]).join('・')||'健在'}</td></tr>`).join('')}</tbody></table></div><div class="modal-actions"><button class="primary" data-action="return-base">拠点へ帰還　→</button></div>`,true,false);}
function returnBase(){campaign=battle.commit();if(!campaign)return;const dead=campaign.heroes.filter(h=>h.hp===0);if(campaign.autoSave)writeStore('dv-auto',{date:new Date().toLocaleString('ja-JP'),data:campaign});base();if(dead.length){modal(`<div class="eyebrow">THE RETURNERS</div><h2>還りを待つ仲間</h2><p>戦闘不能となっている還り人がいます。転生させますか？</p><p class="muted" style="margin-top:12px">血盟で血の澱を払って蘇生するか、無料で転生できます。転生はHP1で復帰し、次のレベルまで獲得EXPが25%減ります。</p><div class="modal-actions"><button data-action="close-modal">あとで</button><button class="primary" data-action="guild">血盟へ</button></div>`);}else toast('帰還しました。HPを確認して、次の旅に備えましょう。');}
function launchTutorial(){if(!campaign)campaign=makeCampaign();battle=new TutorialBattle(campaign);lastTutorialLesson=1;startBattle();selected=null;refreshBattle();tutorialPump();}
function tutorialArt(kind){
 if(kind==='brokenStaff')return `<svg class="story-art" viewBox="0 0 480 170" role="img" aria-label="真っ二つに折れた月蝕の錫杖"><defs><linearGradient id="staff-silver"><stop stop-color="#556d78"/><stop offset=".5" stop-color="#e0e4dc"/><stop offset="1" stop-color="#718b96"/></linearGradient></defs><ellipse cx="240" cy="142" rx="175" ry="15" fill="#091820"/><g transform="translate(54 27) rotate(13 80 70)" fill="none" stroke="url(#staff-silver)"><circle cx="50" cy="40" r="29" stroke-width="7"/><path d="M50 69V105l5 8-9 4 5 8" stroke-width="7"/><path d="M27 55v24m12-16v19m24-19v19m12-25v22" stroke-width="3"/><circle cx="27" cy="83" r="4"/><circle cx="39" cy="86" r="4"/><circle cx="63" cy="86" r="4"/><circle cx="75" cy="83" r="4"/></g><path d="M232 100l8-7-3-7 10 4 177 38" fill="none" stroke="url(#staff-silver)" stroke-width="8"/><path d="M231 100l9-7-3-7" stroke="#ae9575" fill="none" stroke-width="4"/><path d="M170 122l8-4m9 11 9-3m15-17 4 8" stroke="#9eacaa" stroke-width="2"/></svg>`;
 return '';
}
async function focusTutorialMessage(message){
 const token=epoch,v=view;busy=true;cinematic=true;eventEmote=message.emote?{unitId:battle.hero().id,kind:message.emote}:null;
 if(message.highlight)v?.highlightItem(message.highlight,false);
 await v?.panTo(message.focus);
 if(token!==epoch||screen!=='battle')return;
 if(message.kind==='focus')await new Promise(resolve=>setTimeout(resolve,420));
 if(token!==epoch||screen!=='battle')return;
 busy=false;cinematic=false;presentTutorialMessage(message);
}
async function fadeScreen(opacity){
 const el=$('#cinematic-fade');if(!el)return;
 const animation=el.animate?.([{opacity:Number(el.style.opacity||0)},{opacity}],{duration:450,fill:'forwards'});fadeAnimation=animation??null;
 if(animation){try{await animation.finished;}catch{return;}el.style.opacity=String(opacity);animation.cancel();}
 else{el.style.opacity=String(opacity);await new Promise(resolve=>setTimeout(resolve,450));}
 fadeAnimation=null;
}
async function doorTransition(){
 const token=epoch,b=battle,v=view;closeModal();busy=true;cinematic=true;
 await fadeScreen(1);if(token!==epoch||screen!=='battle')return;
 b.relocateToDoor();v?.focus(b.hero());refreshBattle();v?.draw(performance.now());
 await fadeScreen(0);if(token!==epoch||screen!=='battle')return;
 b.completeDoorTransition();busy=false;cinematic=false;tutorialPump();
}
function presentTutorialMessage(message){
 if(message.kind==='focus'){tutorialPump();return;}
 if(message.kind==='area'){closeModal();busy=true;showAreaTitle(message.text,()=>{busy=false;tutorialPump();});return;}
 if(message.kind==='combat'){showCombatPage(message,nextTutorial,'tutorial-next');return;}
 if(message.n)lastTutorialLesson=message.n;
 if(['locked','unlock','footsteps'].includes(message.art))chime(message.art==='locked'?'attack':'select');
 const lesson=message.kind==='lesson';
 modal(dialogueBody({speaker:message.kind==='dialogue'?'アスターテ':'',label:lesson?`チュートリアル ${message.n} / 12`:'',text:message.text,portrait:message.kind==='dialogue'?portrait('astarthe'):'',art:lesson?'':tutorialArt(message.art),actions:'<button class="primary" data-action="tutorial-next">次へ</button>'}),false,false,true,nextTutorial);
 if(message.art&&message.art!=='brokenStaff')eventEmote={unitId:battle.hero().id,kind:message.art};
}
function tutorialPump(){
 if(!battle?.tutorial||busy)return;
 const message=battle.messages.shift();
 if(message){
  if(message.kind==='door-transition'){doorTransition();return;}
  if(message.focus&&message.kind!=='area'&&screen==='battle'){focusTutorialMessage(message);return;}
  presentTutorialMessage(message);return;
 }
 if(battle.retryPending){modal(`<h2>チェックポイントから再開</h2><p>アスターテは戦闘不能になりました。${battle.stage===0?'最初の戦闘前':'このエリアの開始地点'}から、HP・所持品・敵の状態を戻して再開します。</p><div class="modal-actions"><button class="primary" data-action="tutorial-retry">もう一度挑む</button><button data-action="retreat">拠点へ戻る</button></div>`,false,false,true);return;}
 if(battle.result){showTutorialResult();return;}
 if(battle.preparing){tutorialPrep();return;}
 if(battle.pendingExit){modal(`<p>このエリアでの行動を終了し、次のエリアに進みますか？</p><div class="modal-actions"><button data-action="tutorial-exit-no">いいえ</button><button class="primary" data-action="tutorial-exit-yes" ${battle.canAcceptExit()?'':'disabled title="『折れた直剣』を取得すると選択できます。"'}>はい</button></div>`,false,false,true);return;}
 eventEmote=null;if(screen==='battle'){refreshBattle();highlightTutorialControl();}
}

function highlightTutorialControl(){const selector=lastTutorialLesson===4?'[data-action="mode"][data-id="attack"]':lastTutorialLesson===10?'[data-action="items"]':lastTutorialLesson===12?'[data-action="mode"][data-id="waltz"]':null;if(selector)document.querySelector(selector)?.classList.add('guide-glow');}
function tutorialPrep(){
 stopView();closeModal();screen='tutorial-prep';const a=battle.hero(),equipment=battle.stage===0,hasSword=battle.weapons.includes('折れた直剣'),ready=!equipment||a.weapon==='折れた直剣';
 const line=equipment?(ready?'流石にこれでも無手よりはマシでしょう':''):'先に何が待ち受けているかわかりません。いつ使うかは慎重に考えましょう';
 app.innerHTML=preparationScreen({variant:'tutorial-preparation',eyebrow:'THE RUINED SANCTUARY · DEPLOYMENT',objectives:`<h3>作戦目標</h3><div class="brief-item"><span>主目標</span><span>${battle.objective()}</span></div><p class="tiny muted">戦闘不能時はチェックポイントから再開</p><div class="divider"></div><h3>${equipment?'所持品':'回復と備え'}</h3>${Object.keys(ITEMS).filter(id=>battle.items[id]>0).map(id=>`<div class="preparation-item"><strong>${ITEMS[id].name} ×${battle.items[id]}</strong><p class="tiny muted">${ITEMS[id].desc}</p><button class="small wide ${!equipment&&a.hp<battle.effective(a,'maxHp')?'guide-glow':''}" data-action="tutorial-heal" data-id="${id}" ${!ITEMS[id].fraction||a.hp>=battle.effective(a,'maxHp')?'disabled':''}>回復</button></div>`).join('')}<p class="tiny muted">${ownedItems({},battle.quest,battle.weapons).map(i=>`${esc(i.name)} ×${i.count}`).join('　')}${!ownedItems(battle.items,battle.quest,battle.weapons).length?'所持アイテム：なし':''}</p>`,party:`<article class="panel prep-card">${portrait('astarthe')}<div><h3>アスターテ</h3><p class="tiny">HP ${a.hp} / ${battle.effective(a,'maxHp')}　残り移動力 ${a.mp}　行動 ${a.ap}</p>${hpbar({...a,maxHp:battle.effective(a,'maxHp')})}</div><div><label class="field">主武装<select id="tutorial-weapon" data-change="tutorial-weapon" class="${equipment&&!ready?'guide-glow':''}"><option ${a.weapon==='素手'?'selected':''}>素手</option>${hasSword?`<option ${a.weapon==='折れた直剣'?'selected':''}>折れた直剣</option>`:''}</select></label></div></article>`,formation:`<h3>初期配置</h3><div class="deployment-picker"><button disabled>アスターテ <small>A</small></button></div>${deploymentPreview(makeTutorialMap(battle.stage+1),{formation:{astarthe:0},heroes:[{id:'astarthe',name:'アスターテ'}],disabled:true})}<button class="primary wide ${ready?'guide-glow':''}" data-action="tutorial-deploy" ${!ready?'disabled':''}>${battle.stage===0?'マトロネウム':'聖堂の地上階'}へ出撃　→</button>`,message:line?dialogueBody({speaker:'アスターテ',text:line,portrait:portrait('astarthe')}):'',footer:`合計 ${battle.turn}ターン · 前のエリアへは戻れません`});
 formatDialogues(app);
 const lesson=equipment?8:11;if(!battle.lessons.includes(lesson)){battle.lesson(lesson);tutorialPump();}
}
function showTutorialResult(){if(battle.result?.win)startTutorialIntermission();}

function saveIntermission(){if(campaign.autoSave)writeStore('dv-auto',{date:new Date().toLocaleString('ja-JP'),data:campaign});}
function showIntermission(){
 epoch++;stopView();closeModal();screen='intermission';busy=false;selected=null;pending=null;
 intermissionPlayer=new IntermissionPlayer({root:app,campaign,onSave:saveIntermission,onFinish:()=>launchCemetery(true)});
}
function startTutorialIntermission(){
 if(screen!=='battle'||!battle?.tutorial||!battle.result?.win)return;
 const nextCampaign=battle.commit();if(!nextCampaign)return;campaign=nextCampaign;beginIntermission(campaign);saveIntermission();showIntermission();
}

function launchCemetery(restart=false){
 if(!campaign)campaign=makeCampaign();epoch++;stopView();closeModal();busy=false;
 cemeteryPreparation=new CemeteryPreparation(campaign,{restart:restart||campaign.cemeteryTutorial?.status==='failed'});cemeteryPicked=null;screen='cemetery-prep';renderCemeteryPreparation();
}
function renderCemeteryPreparation(){app.innerHTML=cemeteryPreparationHtml(cemeteryPreparation,cemeteryPicked,portrait,hpbar);formatDialogues(app);saveIntermission();}
function deployCemetery(){
 const c=cemeteryPreparation.deployment();if(!c)return;
 battle=new CemeteryBattle(c,cemeteryPreparation.state.formation,{debug:debugSession.active,bossUnlocked:debugBossUnlocked});startBattle();cemeteryPump();
}
async function cemeteryFade(opacity,duration=450,color='#000'){
 const el=$('#cemetery-fade');if(!el)return;el.style.background=color;
 const animation=el.animate?.([{opacity:Number(el.style.opacity||0)},{opacity}],{duration,fill:'forwards'});fadeAnimation=animation??null;
 if(animation){try{await animation.finished;}catch{return;}el.style.opacity=String(opacity);animation.cancel();}else{el.style.opacity=String(opacity);await new Promise(r=>setTimeout(r,duration));}fadeAnimation=null;
}
async function cemeteryBanner(text,duration){
 const el=$('#area-title');if(!el)return;el.textContent=text;el.classList.remove('visible');void el.offsetWidth;el.classList.add('visible');await new Promise(r=>setTimeout(r,duration));if(el.isConnected){el.classList.remove('visible');el.textContent='';}
}
function cemeterySound(kind){
 if(!soundOn)return;
 try{audioContext??=new(window.AudioContext||window.webkitAudioContext)();audioContext.resume();const t=audioContext.currentTime,duration=kind==='stone'?.9:.55,buffer=audioContext.createBuffer(1,audioContext.sampleRate*duration,audioContext.sampleRate),data=buffer.getChannelData(0);
  for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*Math.pow(1-i/data.length,2);
  const source=audioContext.createBufferSource(),filter=audioContext.createBiquadFilter(),gain=audioContext.createGain();source.buffer=buffer;filter.type='lowpass';filter.frequency.setValueAtTime(kind==='stone'?350:950,t);filter.frequency.exponentialRampToValueAtTime(90,t+duration);gain.gain.value=.12;source.connect(filter);filter.connect(gain);gain.connect(audioContext.destination);source.start(t);
 }catch{}
}
function updateCemeterySkip(){const el=$('#cemetery-skip');if(el)el.hidden=!['opening','ending'].includes(battle.flow);}
async function cemeteryScene(action){
 const token=epoch,serial=++sceneSerial,b=battle,v=view;closeModal();busy=true;cinematic=true;updateCemeterySkip();
 const alive=()=>token===epoch&&serial===sceneSerial&&battle===b&&screen==='battle';
 const result=await playCemeteryScene(action,{battle:b,view:v,fade:cemeteryFade,banner:cemeteryBanner,sound:cemeterySound,alive,caption:text=>{if(alive())$('#cemetery-caption').textContent=text;},cutin:html=>{if(alive())$('#cemetery-cutin').innerHTML=html;}});
 if(!alive())return;busy=false;cinematic=false;refreshBattle();cemeteryPump();if(result?.enemyFirst)runEnemyPhase();
}
function cemeteryPump(){
 if(!battle?.tutorial2||busy||screen!=='battle')return;
 updateCemeterySkip();const message=battle.messages.shift();
 if(message){
  if(message.kind==='cemetery-scene'){cemeteryScene(message.action);return;}
  if(message.kind==='combat'){showCombatPage(message,cemeteryPump,'cemetery-next');return;}
  modal(cemeteryMessage(message,portrait,'<button class="primary" data-action="cemetery-next">次へ</button>'),false,false,true,cemeteryPump);
  if(message.emote)eventEmote={unitId:message.actor,kind:message.emote};
  if(message.sword)battle.units.find(u=>u.id===message.actor).eventSword=true;
  if(message.diagram)$('#cemetery-diagrams').innerHTML=cemeteryDiagram(message.diagram);
  return;
 }
 eventEmote=null;closeModal();refreshBattle();
 if(battle.result){showResult();return;}
 if(battle.pendingExit)modal('<p>このエリアでの行動を終了し、次のエリアに進みますか？</p><div class="modal-actions"><button data-action="cemetery-exit-no">いいえ</button><button class="primary" data-action="cemetery-exit-yes">はい</button></div>',false,false,true);
}
function skipCemeteryEvent(){
 if(!battle?.tutorial2||!['opening','ending'].includes(battle.flow))return;
 sceneSerial++;fadeAnimation?.cancel();fadeAnimation=null;busy=false;cinematic=false;closeModal();view?.cancelCameraPan?.();battle.messages=[];$('#cemetery-fade').style.opacity='0';$('#cemetery-cutin').innerHTML='';
 if(battle.flow==='opening'){battle.flow='exploration';battle.flags.started=true;if(!battle.lessons.includes(16))battle.lessons.push(16);view.focus(battle.center());cemeteryPump();return;}
 if(battle.bossBranch&&!battle.flags.bossStarted){battle.stageClear();battle.startBoss();battle.messages.push(CEMETERY_PAGES[94],CEMETERY_PAGES[95],{kind:'cemetery-scene',action:'enemy-first'});view.focus(battle.center());cemeteryPump();return;}
 battle.finish(true);cemeteryPump();
}

document.addEventListener('click',e=>{
 const btn=e.target.closest('[data-action]');if(!btn||btn.disabled)return;if(btn.dataset.action==='debug'){toggleDebugMenu();return;}if(debugMenu?.opened)return;const action=btn.dataset.action,id=btn.dataset.id,cameraAction=['rotate-left','rotate-right','zoom-in','zoom-out','reset-camera'].includes(action);if((cinematic||busy&&!cameraAction)&&action!=='cemetery-skip')return;if(preparationLocked&&!activeDialog()?.contains(btn))return;if(screen==='battle'&&paused&&!cameraAction&&!['cemetery-skip','status-page'].includes(action)&&!activeDialog()?.contains(btn))return;
 switch(action){
  case 'cemetery-alpha':launchCemetery(true);break;
  case 'cemetery-prep-next':cemeteryPreparation.advance();renderCemeteryPreparation();break;
  case 'cemetery-heal':cemeteryPreparation.heal();renderCemeteryPreparation();break;
  case 'cemetery-pick':if(cemeteryPreparation.state.step==='placement'){cemeteryPicked=id;renderCemeteryPreparation();}break;
  case 'cemetery-slot':if(cemeteryPreparation.place(cemeteryPicked,Number(id))){cemeteryPicked=CEMETERY_PARTY.find(id=>cemeteryPreparation.state.formation[id]===undefined)??null;renderCemeteryPreparation();}break;
  case 'cemetery-confirm':if(cemeteryPreparation.ready())modal(cemeteryMessage(CEMETERY_PAGES[17],portrait,'<button data-action="close-modal">考え直す</button><button class="primary" data-action="cemetery-deploy">出発する</button>'),false,false,true);break;
  case 'cemetery-deploy':deployCemetery();break;
  case 'cemetery-status':if(cemeteryPreparation.state.step==='placement')heroDetail(id);break;
  case 'cemetery-skill':if(cemeteryPreparation.state.step==='placement'){const h=campaign.heroes.find(h=>h.id===id),sk=btn.dataset.skill;h.equipped=h.equipped.includes(sk)?h.equipped.filter(s=>s!==sk):HEROES.find(x=>x.id===id).skills.filter(s=>s===sk||h.equipped.includes(s));renderCemeteryPreparation();}break;
  case 'cemetery-exit-no':case 'cemetery-exit-yes':closeModal();battle.confirmExit(action==='cemetery-exit-yes');cemeteryPump();break;
  case 'cemetery-next':advanceDialogue();break;
  case 'cemetery-skip':skipCemeteryEvent();break;
  case 'cemetery-guide':modal('<h2>確認した操作</h2>'+CEMETERY_PAGES.filter(m=>m.lesson&&battle.lessons.includes(m.lesson)).filter((m,i,a)=>a.findIndex(x=>x.lesson===m.lesson)===i).map(m=>'<p class="lesson-copy">'+esc(m.text)+'</p>').join(''),true);break;
  case 'status-page':statusPage=1-statusPage;if(modalRoot.firstChild&&statusHeroId)heroDetail(statusHeroId);else if(screen==='battle')renderRight();break;
  case 'tutorial-new':campaign=makeCampaign();formation={};launchTutorial();break;
  case 'tutorial':launchTutorial();break;
  case 'tutorial-next':if(!advanceDialogue()){closeModal();nextTutorial();}break;
  case 'tutorial-guide':modal(`<h2>確認した操作</h2>${battle.lessons.map(n=>`<h3>チュートリアル ${n}</h3><p class="lesson-copy">${esc(LESSONS[n].text)}</p>`).join('')}`,true);break;
  case 'tutorial-retry':epoch++;battle.retry();startBattle();tutorialPump();break;
  case 'tutorial-exit-no':closeModal();battle.declineExit();tutorialPump();break;
  case 'tutorial-exit-yes':if(battle.acceptExit()){closeModal();tutorialPump();}break;
  case 'tutorial-heal':battle.preparationHeal(id);tutorialPrep();break;
  case 'tutorial-deploy':if(battle.nextMap()){startBattle();tutorialPump();}break;
  case 'title':title();break;
  case 'base':base();break;
  case 'new-game':newGame();break;
  case 'start-new':campaign=makeCampaign(id);formation={};base();break;
  case 'load-title':saveMenu('load');break;
  case 'hero':if(campaign)heroDetail(id);break;
  case 'codex':codex();break;
  case 'guild':guild();break;
  case 'market':market();break;
  case 'saves':saveMenu();break;
  case 'help':help();break;
  case 'settings':settings();break;
  case 'close-modal':closeModal();if(screen==='battle')refreshBattle();break;
  case 'sound':soundOn=!soundOn;chime();settings();break;
  case 'autosave':campaign.autoSave=!campaign.autoSave;settings();break;
  case 'restore':case 'rebirth':if(restoreHero(campaign,id,action==='rebirth')){base();guild();chime();}break;
  case 'buy':{const item=ITEMS[id];if(campaign.blood>=item.price&&campaign.inventory[id]<item.stackLimit){campaign.blood-=item.price;campaign.inventory[id]++;base();market();chime();}break;}
  case 'sell':if(campaign.inventory[id]>0){campaign.inventory[id]--;campaign.blood+=ITEMS[id].sellPrice;base();market();}break;
  case 'upgrade':{const h=campaign.heroes.find(h=>h.id===id),cost=80*(h.upgrade+1);if(h.upgrade<5&&campaign.blood>=cost){campaign.blood-=cost;h.upgrade++;base();market();chime();}break;}
  case 'prep':closeModal();prep(Number(id));break;
  case 'rest':{const h=campaign.heroes.find(h=>h.id===id);if(h.hp>0){if(h.rest&&campaign.heroes.filter(x=>!x.rest&&x.hp>0).length>=4){toast('出撃は4人までです。先に他の仲間を休息にしてください。');break;}h.rest=!h.rest;}prep();break;}
  case 'toggle-skill':{const h=campaign.heroes.find(h=>h.id===id),sk=btn.dataset.skill;h.equipped=h.equipped.includes(sk)?h.equipped.filter(s=>s!==sk):HEROES.find(x=>x.id===id).skills.filter(s=>s===sk||h.equipped.includes(s));prep();break;}
  case 'formation-slot':if(formationPick){const other=campaign.heroes.find(h=>formation[h.id]===Number(id));if(other)formation[other.id]=formation[formationPick];formation[formationPick]=Number(id);formationPick=null;prep();}break;
  case 'formation':if(!formationPick){formationPick=id;btn.classList.add('chosen');document.querySelectorAll('[data-action="formation-slot"]').forEach(b=>b.disabled=false);toast('交換するもう1人、または配置地点を選んでください。');}else{const a=formation[formationPick];formation[formationPick]=formation[id];formation[id]=a;formationPick=null;prep();}break;
  case 'deploy':deploy();break;
  case 'next-story':advanceDialogue();break;
  case 'skip-story':closeModal();phaseBanner();break;
  case 'select-unit':if(screen==='battle'&&!paused)selectUnit(id);break;
  case 'mode':setMode(id);break;
  case 'confirm-action':confirmAction();break;
  case 'cancel-command':closeItemMenu();pending=null;mode='move';refreshBattle();break;
  case 'deselect':closeItemMenu();selected=null;mode='move';pending=null;refreshBattle();break;
  case 'wait-unit':if(battle.phase==='ally'&&selected&&battle.wait(selected)){const remaining=battle.living('ally').find(u=>!u.waited&&(u.ap||u.mp));selected=remaining??selected;pending=null;mode='move';afterBattleAction();}break;
  case 'items':itemsMenu();break;
  case 'choose-item':chooseItem(id);break;
  case 'choose-item-target':chooseItemTarget(id);break;
  case 'close-items':closeItemMenu();refreshBattle();break;
  case 'item-list-back':mode='move';pending=null;refreshBattle();break;
  case 'item-target-back':pending=null;refreshBattle();break;
  case 'pickup-next':advanceDialogue();break;
  case 'zoom-in':view?.setZoom(.15);break;
  case 'zoom-out':view?.setZoom(-.15);break;
  case 'rotate-left':view?.rotate(-1);break;
  case 'rotate-right':view?.rotate(1);break;
  case 'reset-camera':view?.reset();break;
  case 'end-turn':requestEndTurn();break;
  case 'end-turn-confirm':endTurn();break;
  case 'pause':pauseMenu();break;
  case 'restart-confirm':modal(`<div class="eyebrow">RESTART EXPEDITION</div><h2>この戦役をやり直しますか？</h2><p class="muted">シナリオの冒頭から再開し、HP・所持品・経験値を戦役開始時の状態へ戻します。</p><div class="modal-actions"><button data-action="close-modal">戻る</button><button class="primary" data-action="restart">最初から</button></div>`);break;
  case 'restart':{if(battle.tutorial2){campaign=structuredClone(battle.source);launchCemetery(true);break;}const source=battle.source,m=battle.mission.id,isTutorial=battle.tutorial;battle=isTutorial?new TutorialBattle(source):new Battle(source,m,formation);lastTutorialLesson=1;dialogIndex=0;startBattle();if(isTutorial)tutorialPump();else showDialogue();break;}
  case 'retreat-confirm':modal(`<div class="eyebrow">RETREAT</div><h2>拠点へ撤退しますか？</h2><p class="muted">この戦役での変化を取り消し、出撃前の状態で帰還します。評価は記録されません。</p><div class="modal-actions"><button data-action="close-modal">戦場に戻る</button><button class="danger" data-action="retreat">撤退する</button></div>`);break;
  case 'retreat':campaign=structuredClone(battle.source);if(battle.tutorial2)campaign.cemeteryTutorial={status:'failed'};base();toast('出撃前の状態で帰還しました。');break;
  case 'next-map':battle.nextMap(id==='rebirth');startBattle();if(battle.phase==='enemy')toast('敵軍フェイズを継続します。');else phaseBanner();break;
  case 'tutorial-intermission':startTutorialIntermission();break;
  case 'return-base':returnBase();break;
  case 'save-slot':saveSlot(Number(id));break;
  case 'save-confirm':doSave(Number(id));break;
  case 'load-slot':{const v=readStore(`dv-slot-${Number(id)}`);if(v)loadData(v.data);break;}
  case 'load-auto':{const v=readStore('dv-auto');if(v)loadData(v.data);break;}
  case 'export':exportSave();break;
  case 'import':$('#import-file').click();break;
 }
});
document.addEventListener('change',e=>{if(preparationLocked)return;const t=e.target;if(t.dataset.change==='cemetery-equip'){if(cemeteryPreparation?.state.step!=='placement')return;const h=campaign.heroes.find(h=>h.id===t.dataset.id);h[t.dataset.slot]=t.value;renderCemeteryPreparation();return;}if(t.dataset.change==='tutorial-weapon'){if(t.value==='折れた直剣')battle.equipSword();else{battle.hero().weapon='素手';const a=battle.hero(),d=stats(a);a.atk=d.atk;a.mag=d.mag;a.range=d.range;}tutorialPrep();return;}if(t.dataset.change==='equip'){const h=campaign.heroes.find(h=>h.id===t.dataset.id);h[t.dataset.slot]=t.value;toast('装備を変更しました。');}});
$('#import-file').addEventListener('change',async e=>{const f=e.target.files[0];if(!f)return;if(f.size>1000000){toast('セーブファイルが大きすぎます。');e.target.value='';return;}try{loadData(JSON.parse(await f.text()));}catch{toast('JSON形式のセーブデータを読み込めませんでした。');}e.target.value='';});
document.addEventListener('keydown',e=>{
 if(e.key==='F2'){e.preventDefault();if(!e.repeat)toggleDebugMenu();return;}
 if(debugMenu?.handleKey(e))return;
 if(screen==='intermission'){intermissionPlayer?.handleKey(e);return;}
 if(['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName)||e.target.isContentEditable)return;
 const k=e.key.toLowerCase();
 if(screen==='battle'&&view&&!cinematic){
  const d={arrowleft:[25,0],a:[25,0],arrowright:[-25,0],d:[-25,0],arrowup:[0,25],w:[0,25],arrowdown:[0,-25],s:[0,-25]}[k];
  if(d){view.panBy(...d);e.preventDefault();return;}
  if(k==='q'||k==='e'){if(!e.repeat)view.rotate(k==='q'?-1:1);e.preventDefault();return;}
 }
 if(itemMenuOpen&&e.key==='Escape'){e.preventDefault();if(pending?.item)pending=null;else if(mode.startsWith('item:'))mode='move';else closeItemMenu();refreshBattle();return;}
 if(itemMenuOpen&&e.key==='Enter')return;
 const root=activeDialog();
 if(root?.firstChild){
  if(e.key==='Enter'&&!e.repeat&&root.querySelector('[data-action="end-turn-confirm"]')&&e.target.dataset.action!=='close-modal'){e.preventDefault();endTurn();return;}
  if(e.key==='Escape'){if(root.querySelector('[data-action="close-modal"]'))closeModal();e.preventDefault();}
  if(e.key==='Tab'){const els=[...root.querySelectorAll('button:not(:disabled),a,select,input')],first=els[0],last=els[els.length-1];if(e.shiftKey&&document.activeElement===first){last?.focus();e.preventDefault();}else if(!e.shiftKey&&document.activeElement===last){first?.focus();e.preventDefault();}}return;
 }
 if(e.target.dataset.action==='title'&&['Enter',' '].includes(e.key)){title();e.preventDefault();return;}
 if(screen!=='battle'||busy||battle.scripted)return;
 if(e.key==='Escape'){e.preventDefault();if(mode!=='move'||pending){mode='move';pending=null;refreshBattle();}else if(selected){selected=null;refreshBattle();}else pauseMenu();return;}
 if(['1','2','3','4'].includes(e.key)){const id=HEROES[Number(e.key)-1].id;selectUnit(id);e.preventDefault();return;}
 if(e.key==='Tab'){e.preventDefault();const units=battle.living('ally'),i=units.indexOf(selected);selectUnit(units[(i+1)%units.length]?.id);return;}
 if(e.key==='Enter'||k==='t'){if(!e.repeat)requestEndTurn();e.preventDefault();}
});
document.addEventListener('contextmenu',e=>{if(debugMenu?.opened)return;if(screen==='battle'&&!paused&&!battle.scripted){e.preventDefault();if(itemMenuOpen){closeItemMenu();refreshBattle();return;}if(mode!=='move'||pending){mode='move';pending=null;}else selected=null;refreshBattle();}});
window.addEventListener('beforeunload',e=>{if(!debugSession.active&&screen==='battle'&&!battle.result){e.preventDefault();e.returnValue='';}});
function debugContext(){
 const currentBattle=['battle','tutorial-prep'].includes(screen)?battle:null;
 return {active:debugSession.active,screen,campaign,battle:currentBattle,page:campaign?.cathedralIntermission?.page??0,canStart:['title','base','prep'].includes(screen),bossUnlocked:debugBossUnlocked,editable:screen==='battle'&&!paused&&!busy&&!cinematic&&!currentBattle?.scripted&&canEditDebugBattle(currentBattle)};
}
function toggleDebugMenu(){
 if(debugMenu?.opened){debugMenu.close();return;}
 if(screen==='battle'&&(busy||cinematic||battle.phase==='enemy')||screen==='intermission'&&intermissionPlayer?.busy){toast('演出・敵軍の行動が終わってから開いてください。');return;}
 debugMenu?.open();
}
function resetDebugScene(){debugMenu.close();epoch++;stopView();closeModal();busy=false;battle=null;selected=null;pending=null;hover=null;}
function requireDebugEdit(){if(!debugContext().editable)throw Error('会話・演出を終え、自軍の操作が可能になってから変更してください。');}
function handleDebug(action,data){
 if(action==='start'){
  if(!debugContext().canStart)throw Error('タイトルか拠点から開始してください。');
  campaign=debugSession.start(campaign,{screen,formation,selectedMission});
  $('#debug-badge').hidden=false;debugMenu.tab='scenes';return;
 }
 if(!debugSession.active)throw Error('デバッグを開始してください。');
 if(action==='end'){
  debugBossUnlocked=false;resetDebugScene();const original=debugSession.end();campaign=original.campaign;formation=original.context.formation;selectedMission=original.context.selectedMission;$('#debug-badge').hidden=true;
  if(original.context.screen==='title')title();else if(original.context.screen==='prep'){base();prep();}else base();return;
 }
 if(action==='cemetery-password'){if(!unlockCemeteryBoss(debugSession.active,data.password))throw Error('パスワードが一致しません。');debugBossUnlocked=true;return;}
 if(action==='cemetery'){
  const next=prepareCemeteryDebug(campaign,data.id,debugBossUnlocked);resetDebugScene();campaign=next.campaign;
  if(next.battle){battle=next.battle;startBattle();cemeteryPump();}else launchCemetery();return;
 }
 if(action==='cemetery-condition'){requireDebugEdit();const u=testCemeteryCondition(battle,data.id);view?.focus(u);debugMenu.close();refreshBattle();afterBattleAction();return;}
 if(action==='tutorial'||action==='mission'){
  const next=createDebugBattle(campaign,action,Number(data.id));resetDebugScene();battle=next;dialogIndex=0;startBattle();if(battle.tutorial)tutorialPump();else showDialogue();return;
 }
 if(action==='intermission'||action==='page'){setDebugIntermission(campaign,data.page);resetDebugScene();showIntermission();return;}
 if(action==='base'){resetDebugScene();delete campaign.cathedralIntermission;delete campaign.cemeteryTutorial;base();return;}
 if(action==='report'){
  const report=debugReport(campaign,battle,screen),blob=new Blob([JSON.stringify(report,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=url;link.download=`DarkVeil-debug-${new Date().toISOString().replace(/[:.]/g,'-')}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);return;
 }
 const b=debugContext().battle;
 if(['item','runes','blood'].includes(action)){
  if(b)requireDebugEdit();
  if(action==='item')debugItem(b?b.items:campaign.inventory,data.item,data.count);
  else debugCurrency(b&&action==='runes'?b:campaign,action,data.count);
  if(b)refreshBattle();else if(screen==='base')base();else if(screen==='prep')prep();return;
 }
 requireDebugEdit();
 if(action==='recover')debugRecover(b,data.id);
 else if(action==='hp')debugSetHp(b,data.unit,data.hp);
 else if(action==='elevation')debugElevation(b,data.x,data.y,data.elevation);
 else if(action==='teleport'){const u=debugTeleport(b,data.unit,data.x,data.y,data.trigger==='yes');view?.focus(u);}
 else if(action==='status')debugStatus(b,data.unit,data.status,data.turns);
 else if(['rubble','skills'].includes(action))debugTutorialAction(b,action);
 else throw Error('不明なデバッグ操作です。');
 pending=null;mode='move';refreshBattle();
 if(b.messages.length||b.pendingExit||b.result||b.retryPending){debugMenu.close();afterBattleAction();}
}
if($('#debug-root'))debugMenu=new DebugMenu($('#debug-root'),debugContext,handleDebug);
const auto=readStore('dv-auto');if(auto)try{campaign=validateCampaign(auto.data);}catch{}
title();

window.addEventListener('resize',positionItemMenu);
window.addEventListener('scroll',positionItemMenu,true);
