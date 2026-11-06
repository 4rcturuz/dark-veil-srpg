try{await import('./app.js');}
catch(error){
 const app=document.getElementById('app');
 const main=document.createElement('main');main.className='base-content';
 const title=document.createElement('h1');title.textContent='ゲームデータを読み込めませんでした';
 const detail=document.createElement('p');detail.textContent=error.message;
 const retry=document.createElement('button');retry.textContent='再読み込み';retry.addEventListener('click',()=>location.reload());
 main.append(title,detail,retry);app.replaceChildren(main);
}
