(() => {
 const M=ArcoGuided, key='arco-guided-v1';
 let saved;try{saved=localStorage.getItem(key)}catch{}
 const state=M.restore(saved), root=document.createElement('section');root.id='guided';root.setAttribute('aria-label','Aprendizado guiado');
 document.querySelector('main').prepend(root);
 const back=document.createElement('button');back.id='back-to-guide';back.textContent='← Aprender com orientação';back.onclick=enter;document.querySelector('main').insertBefore(back,document.querySelector('nav'));
 const positions=['Espaço logo abaixo da pauta','1ª linha da pauta','1º espaço da pauta','2ª linha da pauta','2º espaço da pauta'];
 const note=id=>notes.find(n=>n.id===id), label=id=>note(id).name.replace('#','♯'), currentId=()=>state.queue[state.index];
 function save(){try{localStorage.setItem(key,JSON.stringify(state))}catch{}}
 function svg(id,finger=false){return staff(note(id),finger).replace('viewBox="0 0 480 205"','viewBox="35 20 410 180"').replace('<svg ',`<svg role="img" aria-label="Nota na pauta em clave de sol" `)}
 function button(text,fn,cls=''){const b=document.createElement('button');b.textContent=text;b.className=cls;b.onclick=fn;return b}
 function action(text,fn,cls='g-primary'){root.querySelector('.g-actions').append(button(text,fn,cls))}
 function commit(){save();render()}
 function begin(stage=state.stage,review=false){stopPhraseAudio();M.introduce(state,stage);if(review)state.intro=0;commit()}
 function start(){stopPhraseAudio();M.round(state);commit();auto()}
 function advance(){stopPhraseAudio();M.next(state);commit();auto()}
 async function hear(id,support=false){if(support&&state.phase==='quiz'){state.supported=true;save()}await play(note(id));const status=root.querySelector('.g-audio-status');if(status)status.textContent=document.querySelector('#audio-status').textContent}
 function auto(){if(state.phase==='quiz'&&state.autoAudio)hear(currentId(),true)}
 function enter(){stopPhraseAudio();document.body.dataset.tab='guided';for(const id of ['practice','map','about'])document.getElementById(id).hidden=true;document.querySelector('.study-controls').hidden=true;document.querySelector('nav').hidden=true;back.hidden=true;root.hidden=false;render()}
 function free(){stopPhraseAudio();root.hidden=true;back.hidden=false;document.querySelector('nav').hidden=false;document.querySelector('[data-tab="practice"]').click()}
 function shell(title,subtitle){root.innerHTML=`<div class="g-top"><span>CORDA RÉ · APRENDER</span><button class="g-exit" type="button">Pausar</button></div><div class="g-content"><h1 tabindex="-1">${title}</h1><p class="g-subtitle">${subtitle}</p><div class="g-body"></div></div><div class="g-actions"></div>`;root.querySelector('.g-exit').onclick=()=>{stopPhraseAudio();state.phase='home';commit()}}
 function card(id){return `<div class="g-note">${svg(id)}<strong>${label(id)}<small>${note(id).octave}</small></strong><p>${positions[note(id).finger]}</p></div>`}
 function compare(a,b){return `<div class="g-pair">${card(a)}${card(b)}</div><p class="g-position-rule">Conte as linhas e os espaços de baixo para cima.</p>`}
 function render(){
  const p=state.phase;
  if(p==='home'){
   shell('Uma corda. Um passo por vez.','Vamos firmar a leitura na corda Ré antes de misturar com a corda Lá.');root.querySelector('.g-exit').hidden=true;
   root.querySelector('.g-body').innerHTML=`<div class="g-path"><span>SEU PASSO ${state.stage-1} DE 4</span><h2>${M.active(state).map(label).join(' · ')}</h2><p>Veja onde cada nota fica. Depois, reconheça os nomes no seu tempo.</p></div><details class="g-options"><summary>Ajustar meu estudo</summary><label><input id="g-auto" type="checkbox" ${state.autoAudio?'checked':''}> Ouvir ao abrir cada exercício</label><p>Ouvir é apoio. Você também pode treinar só a leitura.</p><label>Revisitar um passo<select id="g-stage">${[2,3,4,5].filter(n=>n<=state.visited).map(n=>`<option value="${n}" ${n===state.stage?'selected':''}>${n-1} · ${M.ids.slice(0,n).map(label).join(', ')}</option>`).join('')}</select></label></details>`;
   root.querySelector('#g-auto').onchange=e=>{state.autoAudio=e.target.checked;save()};root.querySelector('#g-stage').onchange=e=>{state.stage=Number(e.target.value);commit()};action('Aprender estas notas',()=>begin(state.stage,true));action('Treino livre · notas e frases',free,'g-secondary');
  }else if(p==='present'){
   const id=M.ids[state.intro];shell(`Conheça ${label(id)}`,state.stage===2?'Primeiro observe. Ainda não precisa responder.':'Uma nova nota, na mesma corda Ré.');
   root.querySelector('.g-body').innerHTML=`${card(id)}<p class="g-finger">Corda Ré · ${note(id).finger===0?'solta · dedo 0':note(id).finger+'º dedo'}</p>${state.intro===2?'<p class="g-position-rule">♯ significa sustenido. O sinal muda a altura do som; a nota continua no lugar do Fá na pauta.</p>':''}${state.intro===4?'<p class="g-position-rule">Este Lá tem a mesma altura da corda Lá solta. Aqui, tocamos com o 4º dedo na corda Ré.</p>':''}<div class="g-audio-status" aria-live="polite"></div>`;
   action(`▶ Ouvir ${label(id)}`,()=>hear(id),'g-secondary');action(state.intro<state.stage-1?'Conhecer '+label(M.ids[state.intro+1]):'Comparar as duas',()=>{stopPhraseAudio();if(state.intro<state.stage-1)state.intro++;else state.phase='compare';commit()});
  }else if(p==='compare'){
   const a=M.ids[state.stage-2],b=M.ids[state.stage-1];shell('Observe o que muda','A nota sobe um lugar: de espaço para linha, ou de linha para espaço.');root.querySelector('.g-body').innerHTML=compare(a,b);action('Agora vou reconhecer',start);action('Ver apresentação de novo',()=>begin(),'g-secondary');
  }else if(p==='quiz'||p==='feedback'){
   const id=currentId();shell(p==='quiz'?'Qual é o nome?':'Vamos conferir',`Passo ${state.stage-1} · Nota ${state.index+1} de ${state.queue.length}`);
   const body=root.querySelector('.g-body');
   if(p==='quiz'){
    body.innerHTML=`<div class="g-question-staff">${svg(id)}</div><div class="g-support"></div><div class="g-help" aria-live="polite"></div><div class="g-audio-status" aria-live="polite"></div><div class="g-answers" aria-label="Escolha o nome da nota"></div>`;
    body.querySelector('.g-support').append(button('▶ Ouvir',()=>hear(id,true)),button('Ver apoio',()=>{state.supported=true;save();body.querySelector('.g-help').textContent=`${positions[note(id).finger]}. Conte as linhas e os espaços de baixo para cima.`}));
    const choices=M.active(state);for(let i=choices.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[choices[i],choices[j]]=[choices[j],choices[i]]}for(const choice of choices)body.querySelector('.g-answers').append(button(label(choice),()=>{stopPhraseAudio();M.answer(state,choice);commit()}));
   }else{
    const r=state.results.at(-1);body.innerHTML=`<p class="g-feedback" role="status">${r.correct?(r.supported?'Você reconheceu com apoio. Vamos continuar.':'Isso, '+label(id)+'.'):'Esta é '+label(id)+'. Compare as posições com calma.'}</p>${r.correct?card(id):compare(id,r.chosen)}<p class="g-position-rule">${label(id)}: ${positions[note(id).finger].toLowerCase()}.</p>`;action(state.index+1===state.queue.length?'Fechar esta rodada':'Próxima nota',advance);action('▶ Ouvir '+label(id),()=>hear(id),'g-secondary');
   }
  }else if(p==='summary'){
   const ready=M.ready(state),review=M.active(state).filter(id=>{const r=(state.history[id]||[]).slice(-2);return r.length<2||r.some(x=>!x.correct||x.supported||x.independent===false)});
   shell('Um passo de cada vez',ready?'Você reconheceu cada nota nas duas últimas tentativas sem apoio.':'Esta rodada mostrou o que vale observar de novo.');root.querySelector('.g-body').innerHTML=`<div class="g-path"><h2>${ready?'Estas posições estão ficando familiares.':'Vamos dar mais tempo para '+review.map(label).join(' e ')+'.'}</h2><p>${ready&&state.stage<5?'Se quiser, conheça mais uma nota na corda Ré.':'Rever e comparar faz parte do aprendizado. Você decide quando continuar.'}</p></div><p class="g-position-rule">Seu progresso fica salvo neste navegador. Pausar não apaga o que você aprendeu.</p>`;
   action('Praticar estas notas de novo',start);if(state.stage<5)action('Conhecer '+label(M.ids[state.stage]),()=>begin(state.stage+1),'g-secondary');action('Rever as posições',()=>begin(state.stage,true),'g-secondary');
  }
  // Focus announces state changes without forcing the mobile page to jump.
  root.querySelector('h1')?.focus({preventScroll:true});
 }
 enter();
})();
