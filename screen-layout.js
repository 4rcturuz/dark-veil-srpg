// Shared screen primitives. Scenario code supplies content, never dimensions.
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function dialogueBody({speaker='',label='',text='',portrait='',art='',actions='',quote=true,ids={}}={}){
 const id=key=>ids[key]?` id="${esc(ids[key])}"`:'';
 const line=speaker&&quote?`「${esc(text)}」`:esc(text);
 return `<div class="tutorial-scene scenario-message"><div class="eyebrow scenario-speaker"${id('speaker')}>${esc(label||speaker)}</div>${art}<div class="tutorial-dialogue">${portrait}<p class="${speaker?'dialogue-line':'lesson-copy'}"${id('line')}>${line}</p></div>${actions?`<div class="modal-actions">${actions}</div>`:''}</div>`;
}
export function fieldPanel(content){return content?`<section class="modal field-dialog" role="dialog" aria-modal="false" aria-label="メッセージ">${content}</section>`:'';}
export function textField(content='',combat=false){return `<section class="battle-text-field" aria-label="テキストフィールド"><div id="battle-text" aria-live="polite">${fieldPanel(content)}</div>${combat?'<div id="enemy-phase-status" class="enemy-phase-status" role="status" aria-live="polite" hidden></div><div id="forecast-container"></div><div id="phase-container"></div>':''}</section>`;}
// Tutorial 2's three-column preparation: objectives/resources, party/equipment, formation/deploy.
export function preparationScreen({variant='',eyebrow='',tools='',objectives='',party='',formation='',message='',footer=''}={}){
 return `<main class="scenario-screen preparation-screen ${variant}"><header class="preparation-header"><div><div class="eyebrow">${esc(eyebrow)}</div><h2>出撃準備</h2></div><div class="row preparation-tools">${tools}</div></header><div class="deployment-layout"><aside class="panel deployment-objectives">${objectives}</aside><section class="deployment-party" aria-label="出撃ユニット・装備">${party}</section><aside class="panel deployment-formation" aria-label="初期配置・出撃">${formation}</aside></div>${textField(message)}<footer class="preparation-footer">${footer}</footer></main>`;
}
