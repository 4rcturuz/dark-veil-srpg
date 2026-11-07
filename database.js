import {SCHEMAS} from './database-schema.js';
import {parseDatabase} from './database-parser.js';
async function read(name){
 const url=new URL(`./database/${name}.csv`,import.meta.url);
 if(url.protocol==='file:'){const {readFile}=await import('node:fs/promises');return readFile(url,'utf8');}
 const response=await fetch(url,{cache:'no-store'});if(!response.ok)throw Error(`${name}.csvを読み込めません (${response.status})`);return response.text();
}
export const DATABASE=parseDatabase(Object.fromEntries(await Promise.all(Object.keys(SCHEMAS).map(async name=>[name,await read(name)]))));
const active=name=>DATABASE[name].filter(r=>r.enabled);
export const WEAPONS=Object.fromEntries(active('weapons').map(w=>[w.id,{...w,attackMultiplier:w.attack_multiplier,attackBonus:w.attack_bonus,magicBonus:w.magic_bonus,rangeOverride:w.range_override}]));
export const WEAPONS_BY_NAME=Object.fromEntries(Object.values(WEAPONS).map(w=>[w.name,w]));
export const ALL_ITEMS=Object.fromEntries(active('items').map(i=>[i.id,{...i,desc:i.description,price:i.buy_price,sellPrice:i.sell_price,initialCount:i.initial_count,stackLimit:i.stack_limit,fraction:i.heal_fraction||undefined,heal:i.heal||undefined,reviveHp:i.revive_hp,statMultiplier:i.stat_multiplier,statusId:i.status_id,cureStatuses:i.cure_status_ids,enemy:i.target==='enemy',important:i.category==='key'}]));
export const ITEMS=Object.fromEntries(Object.entries(ALL_ITEMS).filter(([,i])=>i.category==='consumable'));
export const TUTORIAL_ITEMS={...Object.fromEntries(Object.entries(ALL_ITEMS).filter(([,i])=>['key','currency'].includes(i.category))),...Object.fromEntries(Object.entries(WEAPONS).filter(([,w])=>w.collectible).map(([id,w])=>[id,{...w,weapon:true}]))};
const stat=r=>({maxHp:r.max_hp,atk:r.attack,def:r.defense,mag:r.magic,res:r.resistance,speed:r.speed,move:r.move,sight:r.sight,range:r.attack_range,magic:r.magic_attack,attackStyle:r.attack_style,crit:r.critical_rate,resistance:r.status_resistance,skills:r.skill_ids});
export const CHARACTERS=active('characters').map(r=>({...r,...stat(r),weapon:r.weapon_id?WEAPONS[r.weapon_id].name:undefined,armor:r.armor_id?ALL_ITEMS[r.armor_id].name:undefined,growth:['hp','attack','defense','magic','resistance','speed'].map(k=>r['growth_'+k])}));
export const HEROES=CHARACTERS.filter(r=>r.playable);
const enemy=r=>({...r,...stat(r),hp:r.max_hp,role:r.ai_role,enemyType:r.render_type,cardinalSight:r.cardinal_sight,storyFactor:r.story_factor,doomImmune:r.doom_immune,selfHeal:r.self_heal,footprint:r.footprint.includes('|')?r.footprint.split('|').map(p=>p.split(':').map(Number)):undefined,drops:r.drop_ids.map((type,i)=>({type,chance:Number(r.drop_chances[i]),condition:r.drop_conditions[i]}))});
export const ENEMY_TYPES=Object.fromEntries(active('enemies').filter(r=>r.scope==='normal').map(r=>[r.id,enemy(r)]));
export const TUTORIAL_ENEMIES=Object.fromEntries(active('enemies').filter(r=>r.scope==='tutorial').map(r=>[r.id,enemy(r)]));
export const CEMETERY_ENEMIES=Object.fromEntries(active('enemies').filter(r=>r.scope==='tutorial2').map(r=>[r.id,enemy(r)]));
export function weaponOptions(hero,campaign){return Object.values(WEAPONS).filter(w=>(w.usable_by.includes('*')||w.usable_by.includes(hero.id))&&(w.id===HEROES.find(h=>h.id===hero.id)?.weapon_id||w.available_by_default||campaign.weapons.includes(w.name)));}
