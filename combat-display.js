import {SKILLS} from './data.js';

// The attack method determines color, independently of physical/magic damage or reach.
export function attackStyle(unit,skill='attack'){
 return SKILLS[skill]?.attackStyle??unit?.attackStyle??(unit?.magic?'ranged':'melee');
}
export const RANGE_COLORS={casting:'#8b739deb',ranged:'#a070d9eb',melee:'#d66d57eb',support:'#5ea984eb'};
export function effectColor(unit,skill){
 if(['heal','buff','relocate'].includes(SKILLS[skill]?.kind))return RANGE_COLORS.support;
 return RANGE_COLORS[attackStyle(unit,skill)];
}
export const ENEMY_PHASE_MESSAGE='《敵ユニット行動中…》';
export function updateEnemyPhaseStatus(element,battle){
 if(!element)return;
 const active=battle?.phase==='enemy'&&!battle.result&&!battle.preparing&&!battle.pendingExit;
 element.hidden=!active;element.textContent=active?ENEMY_PHASE_MESSAGE:'';
}
