import {ITEMS} from './data.js';
import {TUTORIAL_ITEMS} from './database.js';
// Shared inventory presentation: never show zero-count entries.
export function ownedItems(items={},quest=[],weapons=[]){
 return Object.entries(items).filter(([id,count])=>ITEMS[id]&&count>0).map(([id,count])=>({id,count,name:ITEMS[id].name,desc:ITEMS[id].desc,consumable:true}))
  .concat(quest.map(id=>({id,count:1,name:TUTORIAL_ITEMS[id]?.name??id,consumable:false})),weapons.map(name=>({id:name,count:1,name,consumable:false})));
}
