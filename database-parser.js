import {SCHEMAS} from './database-schema.js';

// RFC 4180 CSV, accepting BOM, CRLF/LF, escaped quotes and quoted newlines.
export function parseCSV(input,label='CSV'){
 const text=input.replace(/^\uFEFF/,'');let row=[],value='',quoted=false,closed=false,rows=[];
 const fail=message=>{throw Error(`${label}: ${rows.length+1}行 ${message}`);};
 const cell=()=>{row.push(value);value='';closed=false;};
 const line=()=>{cell();if(row.some(v=>v!==''))rows.push(row);row=[];};
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(quoted){if(c==='"'){if(text[i+1]==='"'){value+='"';i++;}else{quoted=false;closed=true;}}else value+=c;continue;}
  if(c===','){cell();continue;}
  if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;line();continue;}
  if(closed)fail('閉じ引用符の後に不正な文字があります');
  if(c==='"'){if(value!=='')fail('引用符がセルの途中にあります');quoted=true;}else value+=c;
 }
 if(quoted)fail('引用符が閉じていません');
 if(value!==''||row.length||closed)line();
 if(!rows.length)throw Error(`${label}: ヘッダーがありません`);
 return rows;
}
export function serializeCSV(rows){return '\uFEFF'+rows.map(row=>row.map(v=>{const s=String(v??'');return /[",\r\n]/.test(s)?'"'+s.replaceAll('"','""')+'"':s;}).join(',')).join('\r\n')+'\r\n';}
const reserved=new Set(['__proto__','constructor','prototype']);
export function parseTable(name,text){
 const schema=SCHEMAS[name],rows=parseCSV(text,`${name}.csv`),headers=rows.shift();
 if(headers.length!==Object.keys(schema).length||new Set(headers).size!==headers.length||headers.some(h=>!Object.hasOwn(schema,h)))throw Error(`${name}.csv: 列名がスキーマと一致しません`);
 const ids=new Set();return rows.map((cells,index)=>{
  const fail=message=>{throw Error(`${name}.csv: ${index+2}行 ${message}`);};
  if(cells.length!==headers.length)fail('列数が一致しません');
  const raw=Object.fromEntries(headers.map((k,i)=>[k,cells[i]])),out={};
  const npc=name==='characters'&&raw.playable==='0';
  for(const [k,s]of Object.entries(schema)){
   const v=raw[k];
   if(s.type==='text'){out[k]=v;continue;}
   if(s.type==='list'){out[k]=v===''?[]:v.split('|').map(x=>x.trim());if(out[k].some(x=>!x))fail(`${k}に空の要素があります`);continue;}
   if(npc&&v===''&&k!=='enabled'&&k!=='playable'){out[k]=null;continue;}
   if(s.type==='boolean'){if(!['0','1'].includes(v))fail(`${k}は0または1です`);out[k]=v==='1';}
   if(s.type==='enum'){if(!s.values.includes(v))fail(`${k}は ${s.values.join('/')} です`);out[k]=v;}
   if(s.type==='number'){const n=Number(v);if(v.trim()===''||!/^[-+]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(v)||!Number.isFinite(n)||n<s.min||n>s.max||(s.integer&&!Number.isInteger(n)))fail(`${k}の数値が不正です`);out[k]=n;}
  }
  if(!/^[a-z][a-zA-Z0-9_]*$/.test(out.id)||reserved.has(out.id))fail('idの形式が不正です');
  if(ids.has(out.id))fail(`idが重複しています: ${out.id}`);ids.add(out.id);
  if(!out.name.trim())fail('nameが空です');
  if(out.color&&!/^#[0-9a-fA-F]{6}$/.test(out.color))fail('colorは#RRGGBB形式です');
  return out;
 });
}
export function parseDatabase(files){
 const tables=Object.fromEntries(Object.keys(SCHEMAS).map(name=>[name,parseTable(name,files[name])]));
 const active=name=>tables[name].filter(r=>r.enabled),index=name=>new Map(active(name).map(r=>[r.id,r]));
 const chars=index('characters'),items=index('items'),weapons=index('weapons');
 const requireRef=(map,id,owner)=>{if(!map.has(id))throw Error(`${owner}: 参照先ID ${id} がありません（または無効です）`);};
 for(const c of active('characters').filter(c=>c.playable)){
  requireRef(weapons,c.weapon_id,c.id);requireRef(items,c.armor_id,c.id);
  if(items.get(c.armor_id).category!=='armor')throw Error(`${c.id}: armor_idは防具ではありません`);
  for(const equip of [weapons.get(c.weapon_id),items.get(c.armor_id)])if(!equip.usable_by.includes('*')&&!equip.usable_by.includes(c.id))throw Error(`${c.id}: 初期装備 ${equip.id} を使用できません`);
  if(c.skill_ids.length<1||c.skill_ids.length>5||new Set(c.skill_ids).size!==c.skill_ids.length)throw Error(`${c.id}: スキルは重複なしの1～5個です`);
  if(c.wolf_move>0&&(!c.wolf_passive||!c.skill_ids.includes('metamorphosis')))throw Error(`${c.id}: 狼形態には形象変化と狼パッシブの指定が必要です`);
  if(!c.wolf_move&&(c.wolf_passive||c.wolf_sight))throw Error(`${c.id}: 狼形態の定義が不完全です`);
 }
 if(!chars.get('astarthe')?.playable)throw Error('序章に必要なアスターテの定義がありません');
 for(const kind of ['items','weapons']){
  const names=new Set();for(const r of active(kind)){
   if(names.has(r.name))throw Error(`${kind}: 表示名 ${r.name} が重複しています`);names.add(r.name);
   for(const id of r.usable_by)if(id!=='*')requireRef(chars,id,r.id);
   if(kind==='items'){
    if(r.category!=='consumable'&&(r.effect!=='none'||r.market))throw Error(`${r.id}: 非消費品には使用効果・市場販売を設定できません`);
    if(r.category==='consumable'&&(r.effect==='none'||r.target==='none'||r.initial_count>r.stack_limit))throw Error(`${r.id}: 消費品の効果・対象・初期数が不正です`);
    if(r.category==='consumable'&&r.stack_limit>99)throw Error(`${r.id}: 現行の消費品所持上限は99です`);
    if(r.effect==='heal'&&!(r.heal>0||r.heal_fraction>0))throw Error(`${r.id}: 回復量がありません`);
    if(r.effect==='cure'&&!r.cure_status_ids.length)throw Error(`${r.id}: 解除状態がありません`);
    if(r.effect==='revive'&&(r.revive_hp<1||r.target!=='dead_ally'))throw Error(`${r.id}: 蘇生量・対象が不正です`);
    if(['status','feral'].includes(r.effect)&&(!r.status_id||r.duration<1))throw Error(`${r.id}: 付与状態・持続がありません`);
    if(r.effect==='feral'&&(r.target!=='self'||r.status_id!=='feral'))throw Error(`${r.id}: 凶獣薬型は自身へのferal付与です`);
   }
  }
 }
 for(const e of active('enemies')){
  if(!e.skill_ids.length||new Set(e.skill_ids).size!==e.skill_ids.length)throw Error(`${e.id}: スキルが不正です`);
  const offsets=e.footprint.split('|');
  if(!offsets.includes('0:0')||new Set(offsets).size!==offsets.length||offsets.some(p=>!/^\d+:\d+$/.test(p)))throw Error(`${e.id}: footprintが不正です`);
  if(e.scope==='normal'&&e.footprint!=='0:0')throw Error(`${e.id}: 通常戦役の複数マス敵は未対応です`);
  if(e.drop_ids.length!==e.drop_chances.length||e.drop_ids.length!==e.drop_conditions.length)throw Error(`${e.id}: ドロップ列の要素数が一致しません`);
  e.drop_ids.forEach((id,i)=>{
   if(!items.has(id)&&!weapons.get(id)?.collectible)throw Error(`${e.id}: ドロップID ${id} がありません`);
   if(items.has(id)&&!['key','consumable'].includes(items.get(id).category))throw Error(`${e.id}: ルーンはrunes列、防具は初期装備で設定してください`);
   const chance=Number(e.drop_chances[i]);if(!Number.isFinite(chance)||chance<0||chance>1)throw Error(`${e.id}: ドロップ確率は0～1です`);
   if(!['always','tutorial_first'].includes(e.drop_conditions[i])||(e.scope!=='tutorial'&&e.drop_conditions[i]!=='always'))throw Error(`${e.id}: ドロップ条件が不正です`);
  });
 }
 return tables;
}
export function validateReferences(tables,skills,statuses){
 for(const kind of ['characters','enemies'])for(const r of tables[kind].filter(r=>r.enabled))for(const id of r.skill_ids)if(!Object.hasOwn(skills,id))throw Error(`${r.id}: 未定義のスキル ${id}`);
 for(const r of tables.characters.filter(r=>r.enabled&&r.wolf_passive))if(!skills[r.wolf_passive]?.passive||r.skill_ids.filter(id=>skills[id]?.passive).length!==1)throw Error(`${r.id}: 形態ごとのパッシブは1枠に対応させてください`);
 for(const r of tables.items.filter(r=>r.enabled))for(const id of [r.status_id,...r.cure_status_ids].filter(Boolean))if(!Object.hasOwn(statuses,id))throw Error(`${r.id}: 未定義の状態 ${id}`);
 for(const e of tables.enemies.filter(r=>r.enabled))for(const id of e.skill_ids)if(skills[id].requires||!(['attack','debuff'].includes(skills[id].kind)||e.scope==='tutorial2'&&['t2FirstAid','t2GuardStance'].includes(id)))throw Error(`${e.id}: 敵AIは装備条件のない攻撃・妨害スキルに対応します。回復はself_heal列を使用してください`);
}
