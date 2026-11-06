import {DATABASE} from './database.js';
// Display-only grouping: authored text, spaces and explicit line breaks stay literal.
const esc=text=>text.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const closing=/^[、。，．！？!?：:；;）」』】〕〉》\])｝}…‥ー々ぁぃぅぇぉゃゅょっァィゥェォャュョッヮヵヶ]+$/u;
const opening=/^[「『（【〔〈《\[(｛{]+$/u;
const particles=new Set(['は','が','を','に','へ','と','で','も','の','や','から','まで','より','ので','のに','です','ます','でした','ました','ません']);
const wordSegmenter=typeof Intl.Segmenter==='function'?new Intl.Segmenter('ja',{granularity:'word'}):null;
// Keep CSV-owned proper names intact even when the Japanese segmenter does not know them.
const names=[...new Set(Object.values(DATABASE).flatMap(rows=>rows.map(row=>row.name).filter(Boolean)))].sort((a,b)=>b.length-a.length);
const nameSet=new Set(names),namePattern=new RegExp(`(${names.map(name=>name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|')})`,'gu');

export function dialoguePhrases(text){
 // Keep punctuation and closing quotes with the preceding phrase; never insert a hard newline.
 return String(text??'').match(/\r\n|\r|\n|[^\r\n、。，！？!?：；,;]+[、。，！？!?：；,;]*[）」』】〕〉》\])｝}]*|[、。，！？!?：；,;]+[）」』】〕〉》\])｝}]*/gu)??[];
}
export function dialogueWords(text,segmenter=wordSegmenter){
 // A long phrase may wrap between words. Particles and forbidden line starters stay attached.
 const segments=text.split(namePattern).filter(Boolean).flatMap(part=>nameSet.has(part)?[part]:segmenter?[...segmenter.segment(part)].map(s=>s.segment):(part.match(/[\p{Script=Han}]+[\p{Script=Hiragana}]*|[\p{Script=Katakana}ー]+|[\p{Script=Hiragana}]+|[\p{L}\p{N}_]+|\s+|./gu)??[]));
 const words=[];let prefix='';
 for(const segment of segments){
  if(opening.test(segment)){prefix+=segment;continue;}
  const inflection=/^[\p{Script=Hiragana}]+$/u.test(segment)&&/[\p{Script=Han}][\p{Script=Hiragana}]*$/u.test(words.at(-1)??'');
  if(!prefix&&words.length&&(closing.test(segment)||particles.has(segment)||inflection)&&!/^\s+$/u.test(words.at(-1)))words[words.length-1]+=segment;
  else{words.push(prefix+segment);prefix='';}
 }
 if(prefix){if(words.length)words[words.length-1]+=prefix;else words.push(prefix);}
 return words;
}
export function dialogueMarkup(text){
 return dialoguePhrases(text).map(phrase=>/^[\r\n]+$/.test(phrase)?phrase:`<span class="dialogue-phrase">${dialogueWords(phrase).map(word=>/^\s+$/u.test(word)?esc(word):`<span class="dialogue-word">${esc(word)}</span>`).join('')}</span>`).join('');
}
export function formatDialogueElement(element){
 if(!element?.childNodes)return;
 element.classList.add('dialogue-copy');
 const visit=node=>{
  for(const child of [...node.childNodes]){
   if(child.nodeType===3){const template=element.ownerDocument.createElement('template');template.innerHTML=dialogueMarkup(child.textContent);child.replaceWith(template.content);}
   else if(child.nodeType===1&&!child.classList.contains('dialogue-phrase'))visit(child);
  }
 };
 visit(element);
}
export function formatDialogues(root){
 for(const element of root.querySelectorAll('.tutorial-dialogue p, .lesson-copy, .field-dialog p'))formatDialogueElement(element);
}
