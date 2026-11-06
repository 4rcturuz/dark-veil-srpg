import {ITEMS} from './data.js';
import {ownedItems} from './inventory.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function itemTargetRows(battle,unit,id){
 const item=ITEMS[id];if(!item)return [];
 return battle.units.filter(target=>item.enemy?target.team!==unit.team&&target.hp>0&&battle.isVisible(target):target.team===unit.team)
  .map(target=>({target,reason:battle.itemUseReason(unit,id,target)}));
}

export function itemMenuHtml(battle,unit,id=null,targetId=null){
 const owned=ownedItems(battle.items);
 const itemPane=`<section class="item-pane" aria-label="所持アイテム"><header><h3>アイテム</h3><button data-action="close-items" aria-label="アイテム一覧を閉じる">×</button></header><div class="item-pane-list">${owned.map(it=>it.consumable?`<button class="item-choice ${id===it.id?'active':''}" data-action="choose-item" data-id="${it.id}" aria-expanded="${id===it.id}"><span>${esc(it.name)} <small>×${it.count}</small></span><small>${esc(it.desc)}</small><span class="submenu-arrow" aria-hidden="true">‹</span></button>`:`<div class="item-choice owned-equipment"><span>${esc(it.name)} <small>×${it.count}</small></span></div>`).join('')||'<p class="item-empty">所持アイテム：なし</p>'}</div></section>`;
 const item=ITEMS[id];if(!item)return itemPane;
 const rows=itemTargetRows(battle,unit,id),chosen=rows.find(r=>r.target.id===targetId);
 const targetPane=`<section class="item-pane target-pane" aria-label="アイテムの対象ユニット"><header><h3>対象ユニット</h3><button data-action="item-list-back" aria-label="アイテム一覧に戻る">›</button></header><p class="item-context">${esc(item.name)}</p><div class="item-pane-list">${rows.map(({target:t,reason})=>`<button class="item-target ${targetId===t.id?'active':''}" data-action="choose-item-target" data-id="${t.id}" ${reason?'disabled':''}><span>${esc(t.name)}</span><small>HP ${t.hp} / ${battle.effective(t,'maxHp')}</small>${reason?`<small class="target-reason">${esc(reason)}</small>`:''}</button>`).join('')||'<p class="item-empty">対象ユニット：なし</p>'}</div>${chosen?`<footer class="item-confirm"><p>${esc(item.name)} → ${esc(chosen.target.name)}</p><div><button data-action="item-target-back">戻る</button><button class="primary" data-action="confirm-action" ${chosen.reason?'disabled':''}>使う</button></div></footer>`:''}</section>`;
 return itemPane+targetPane;
}

export function itemFlyoutPosition(anchor,viewport,panes,height){
 const gap=8,available=Math.max(144,Math.min(anchor.left-gap,viewport.width-16));
 const paneWidth=Math.min(236,Math.max(144,(available-gap*(panes-1))/panes));
 const width=paneWidth*panes+gap*(panes-1),maxHeight=Math.min(430,viewport.height-16);
 return {left:Math.max(8,Math.min(anchor.left-width-gap,viewport.width-width-8)),top:Math.max(8,Math.min(anchor.top,viewport.height-Math.min(height||maxHeight,maxHeight)-8)),width,paneWidth,maxHeight};
}
