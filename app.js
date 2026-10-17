const $=s=>document.querySelector(s);
const names=['Dó','Ré','Mi','Fá','Sol','Lá','Si'];
const letters=['C','D','E','F','G','A','B'];
const bases=[55,62,69,76], stringNames=['Sol','Ré','Lá','Mi'];
const offsets=[0,2,4,5,7];
const notes=bases.flatMap((base,string)=>offsets.map((o,finger)=>{let midi=base+o,pc=midi%12;let idx=[0,2,4,5,7,9,11].indexOf(pc),sharp=false;if(idx<0){idx=[0,2,4,5,7,9,11].indexOf(pc-1);sharp=true}let octave=Math.floor(midi/12)-1;return {id:`${string}-${finger}`,midi,string,finger,name:names[idx]+(sharp?'♯':''),letter:letters[idx],sharp,octave,step:octave*7+idx}}));
let saved;try{saved=JSON.parse(localStorage.getItem('arco-v1'))}catch{}let stats=saved||{total:0,correct:0,streak:0,errors:{}};let current,answered=false,done=0,ctx;let isPhrase=false,phrase=[],phraseIndex=0,phraseAttempts=[],phraseFinished=false,phraseAudioToken=0;
function persist(){try{localStorage.setItem('arco-v1',JSON.stringify(stats))}catch{}}
function update(){ $('#total').textContent=stats.total;$('#streak').textContent=stats.streak;$('#accuracy').innerHTML=(stats.total?Math.round(stats.correct/stats.total*100)+'%':'—')+'<small>de acertos</small>';$('#counter').textContent=String(Math.min(done+1,10)).padStart(2,'0')+' / 10';$('#bar').style.width=Math.min(done,10)*10+'%';$('#session').textContent=`Sessão de 10 notas · ${done} concluídas`}
function staffPosition(n){
 const d=n.step-30;
 if(d>=0&&d<=8)return d%2===0?`${d/2+1}ª linha (de baixo para cima)`:`${(d+1)/2}º espaço (de baixo para cima)`;
 const above=d>8, distance=above?d-8:-d;
 const side=above?'acima':'abaixo';
 if(distance===1)return `Espaço logo ${side} da pauta`;
 return distance%2===0?`${distance/2}ª linha suplementar ${side} da pauta`:`Espaço entre a ${Math.floor(distance/2)}ª e a ${Math.ceil(distance/2)}ª linhas suplementares ${side} da pauta`;
}
function staff(n,showFinger=false){const y=126-(n.step-30)*7;let ledger='';for(let v=140;v<=y;v+=14)ledger+=`<line x1="230" x2="272" y1="${v}" y2="${v}"/>`;for(let v=56;v>=y;v-=14)ledger+=`<line x1="230" x2="272" y1="${v}" y2="${v}"/>`;return `<svg viewBox="0 0 480 205" role="img" aria-label="Nota para identificar na clave de sol"><g stroke="#9ba392" stroke-width="1">${[70,84,98,112,126].map(v=>`<line x1="40" x2="440" y1="${v}" y2="${v}"/>`).join('')}</g><text x="64" y="132" font-size="87" font-family="serif" fill="#294b3b">𝄞</text><g stroke="#294b3b" stroke-width="1.5">${ledger}</g>${n.sharp?`<text x="216" y="${y+6}" font-size="26">♯</text>`:''}<ellipse cx="251" cy="${y}" rx="11" ry="7.5" transform="rotate(-20 251 ${y})" fill="#294b3b"/><line x1="${y<98?241:261}" x2="${y<98?241:261}" y1="${y}" y2="${y+(y<98?48:-48)}" stroke="#294b3b" stroke-width="2"/>${showFinger?`<text class="finger-mark" x="251" y="190" text-anchor="middle" font-size="27" font-family="system-ui,sans-serif" font-weight="700" fill="#317347">${n.finger}</text>`:''}</svg>`}
function renderExerciseStaff(){
 const fingerMode=$('#mode').value==='finger';
 const toggle=$('#show-fingers');toggle.disabled=fingerMode;
 $('#finger-option').title=fingerMode?'Dedos ocultos enquanto você treina a digitação':'0 = corda solta; 1 a 4 = dedos';
 $('#finger-option-text').textContent=fingerMode?'Dedos ocultos':'Mostrar dedos';
 $('#staff').innerHTML=isPhrase?phraseStaff(toggle.checked&&!fingerMode):staff(current,toggle.checked&&!fingerMode);
}
try{$('#show-fingers').checked=localStorage.getItem('arco-show-fingers')==='true'}catch{}
$('#show-fingers').onchange=()=>{try{localStorage.setItem('arco-show-fingers',String($('#show-fingers').checked))}catch{}renderExerciseStaff()};
function shuffle(a){return a.sort(()=>Math.random()-.5)}
function selectedNotes(){return notes.filter(n=>$('#string').value==='all'||n.string===Number($('#string').value))}
function nextSingle(){if(done>=10)done=0;const pool=selectedNotes();let weighted=pool.flatMap(n=>Array(1+Math.min(stats.errors[n.id]||0,4)).fill(n));let previous=current;do{current=weighted[Math.floor(Math.random()*weighted.length)]}while(current===previous&&pool.length>1);answered=false;$('.training-card').classList.remove('answered');$('#next').hidden=true;$('#feedback').textContent='';$('#hint-text').textContent='';$('#hint').textContent='Posição na pauta';$('#hint').setAttribute('aria-expanded','false');$('#feedback').className='';renderExerciseStaff();$('#exercise-context').textContent=$('#string').value==='all'?'Todas as cordas':'Corda '+stringNames[Number($('#string').value)];const finger=$('#mode').value==='finger';$('#question').textContent=finger?'Qual dedo usar?':'Qual é esta nota?';const key=n=>finger?n.id:n.name;const right=key(current);let alternatives=shuffle(pool.filter(n=>key(n)!==right));let opts=[current];for(const n of alternatives)if(!opts.some(o=>key(o)===key(n))&&opts.length<4)opts.push(n);$('#answers').replaceChildren(...shuffle(opts).map(n=>{let b=document.createElement('button');b.innerHTML=finger?`${n.finger===0?'Corda solta':n.finger+'º dedo'}<small>Corda ${stringNames[n.string]}</small>`:n.name;b.onclick=()=>answer(b,key(n)===right);b.dataset.right=String(key(n)===right);return b}));update()}
function answerSingle(button,correct){if(answered)return;answered=true;done++;stats.total++;if(correct){stats.correct++;stats.streak++;stats.errors[current.id]=Math.max(0,(stats.errors[current.id]||0)-1)}else{stats.streak=0;stats.errors[current.id]=(stats.errors[current.id]||0)+1;button.classList.add('wrong')}document.querySelectorAll('#answers button').forEach(b=>{if(b.dataset.right==='true'){b.classList.add('correct');b.innerHTML+=' <span aria-label="resposta correta">✓</span>'}else if(b===button&&!correct){b.innerHTML+=' <span aria-label="resposta incorreta">✕</span>'}b.disabled=true});$('.training-card').classList.add('answered');$('#feedback').className=correct?'result-correct':'result-wrong';$('#feedback').textContent=(correct?'Muito bem! ':'Vamos memorizar: ')+`${staffPosition(current)} · ${current.name}${current.octave} · corda ${stringNames[current.string]} · ${current.finger===0?'solta':current.finger+'º dedo'}.`;$('#next').textContent=done===10?'Sessão concluída · Treinar mais →':'Próxima nota →';$('#next').hidden=false;persist();update()}
function stopPhraseAudio(){phraseAudioToken++;if(activeRecording){activeRecording.pause();activeRecording=null}playRequest++}
function next(){stopPhraseAudio();if(isPhrase)startPhrase();else nextSingle()}
function answer(button,correct){if(!isPhrase)return answerSingle(button,correct);answerPhrase(button)}
function phraseStaff(showFinger){
 const width=480,spacing=310/phrase.length;
 const glyphs=phrase.map((n,i)=>{
  const x=145+i*spacing,y=126-(n.step-30)*7,active=i===phraseIndex&&!phraseFinished;
  let ledger='';for(let v=140;v<=y;v+=14)ledger+=`<line x1="${x-17}" x2="${x+17}" y1="${v}" y2="${v}"/>`;for(let v=56;v>=y;v-=14)ledger+=`<line x1="${x-17}" x2="${x+17}" y1="${v}" y2="${v}"/>`;
  const attempted=phraseFinished?phraseAttempts[i]:null;
  return `<g>${active?`<rect x="${x-27}" y="16" width="54" height="180" rx="12" fill="#e3eddc" stroke="#54794b" stroke-width="2"/>`:''}<g stroke="#294b3b" stroke-width="1.5">${ledger}</g>${n.sharp?`<text x="${x-27}" y="${y+6}" font-size="23">♯</text>`:''}<ellipse cx="${x}" cy="${y}" rx="10" ry="7" transform="rotate(-20 ${x} ${y})" fill="#244d40"/><line x1="${x+(y<98?-9:9)}" x2="${x+(y<98?-9:9)}" y1="${y}" y2="${y+(y<98?43:-43)}" stroke="#244d40" stroke-width="2"/>${showFinger?`<text class="finger-mark" x="${x}" y="177" text-anchor="middle" font-size="23" fill="#317347">${n.finger}</text>`:''}<text x="${x}" y="${showFinger?200:184}" text-anchor="middle" font-size="14" fill="${attempted&&!attempted.correct?'#a33c2f':'#365a39'}">${phraseFinished?(attempted.correct?'✓':'✕'):i+1}</text></g>`
 }).join('');
 return `<svg viewBox="0 0 ${width} 210" role="img" aria-label="Frase de ${phrase.length} notas. ${phraseFinished?'Concluída':'Identifique a nota '+(phraseIndex+1)}"><g stroke="#a2ad9d">${[70,84,98,112,126].map(y=>`<line x1="28" x2="460" y1="${y}" y2="${y}"/>`).join('')}</g><text x="40" y="132" font-family="serif" font-size="87" fill="#294b3b">𝄞</text>${glyphs}<line x1="460" x2="460" y1="70" y2="126" stroke="#294b3b"/></svg>`
}
function startPhrase(){
 if(done>=10)done=0;update();
 phraseFinished=false;phraseIndex=0;phraseAttempts=[];
 const string=$('#string').value==='all'?Math.floor(Math.random()*4):Number($('#string').value);
 const pool=notes.filter(n=>n.string===string);let index=Math.floor(Math.random()*5);
 phrase=Array.from({length:Number($('#phrase-size').value)||2},(_,i)=>{if(i)index=Math.max(0,Math.min(4,index+[-1,0,1][Math.floor(Math.random()*3)]));return pool[index]});
 renderPhraseQuestion();
}
function renderPhraseQuestion(){
 current=phrase[phraseIndex];answered=false;$('.training-card').classList.remove('answered');$('#next').hidden=true;$('#feedback').textContent='';$('#feedback').className='';$('#hint-text').textContent='';$('#hint').textContent='Posição na pauta';$('#hint').setAttribute('aria-expanded','false');
 $('#question').textContent=$('#mode').value==='finger'?'Qual dedo na nota '+(phraseIndex+1)+'?':'Qual é a nota '+(phraseIndex+1)+'?';$('#counter').textContent=(phraseIndex+1)+' / '+phrase.length;$('#exercise-context').textContent='Frase · corda '+stringNames[current.string];renderExerciseStaff();
 const finger=$('#mode').value==='finger',key=n=>finger?n.id:n.name;
 const pool=notes.filter(n=>n.string===current.string);const options=[current,...shuffle(pool.filter(n=>key(n)!==key(current))).slice(0,3)];
 $('#answers').replaceChildren(...shuffle(options).map(n=>{const b=document.createElement('button');b.dataset.noteId=n.id;b.innerHTML=finger?(n.finger===0?'Corda solta':n.finger+'º dedo'):n.name;b.onclick=()=>answerPhrase(b);return b}));
}
function answerPhrase(button){
 if(phraseFinished||answered)return;answered=true;
 const chosen=notes.find(n=>n.id===button.dataset.noteId);if(!chosen)return;
 phraseAttempts.push({note:current,chosen,correct:$('#mode').value==='finger'?chosen.id===current.id:chosen.name===current.name});
 if(phraseIndex<phrase.length-1){phraseIndex++;renderPhraseQuestion();return}
 phraseFinished=true;
 for(const a of phraseAttempts){stats.total++;done++;if(a.correct){stats.correct++;stats.streak++;stats.errors[a.note.id]=Math.max(0,(stats.errors[a.note.id]||0)-1)}else{stats.streak=0;stats.errors[a.note.id]=(stats.errors[a.note.id]||0)+1}}
 persist();update();$('.training-card').classList.add('answered');$('#answers').replaceChildren();$('#hint-text').textContent='';$('#question').textContent='Frase concluída';$('#counter').textContent=phrase.length+' / '+phrase.length;renderExerciseStaff();
 const correct=phraseAttempts.filter(a=>a.correct).length;$('#feedback').className=correct===phrase.length?'result-correct':'result-wrong';
 $('#feedback').replaceChildren();const title=document.createElement('strong');title.textContent=correct+' de '+phrase.length+' notas certas';$('#feedback').append(title);
 for(const [i,a] of phraseAttempts.entries()){const row=document.createElement('div');row.textContent=`${a.correct?'✓':'✕'} ${i+1}. ${a.note.name}${a.note.octave} · ${a.note.finger===0?'corda solta':a.note.finger+'º dedo'}${a.correct?'':' (você: '+($('#mode').value==='finger'?(a.chosen.finger===0?'corda solta':a.chosen.finger+'º dedo'):a.chosen.name)+')'}`;$('#feedback').append(row)}
 $('#next').textContent='Nova frase →';$('#next').hidden=false;
}
async function playPhrase(){
 stopPhraseAudio();const token=phraseAudioToken;
 for(const n of phrase){if(token!==phraseAudioToken)return;await play(n);if(token!==phraseAudioToken)return;await new Promise(resolve=>setTimeout(resolve,850))}
 if(token===phraseAudioToken&&activeRecording){activeRecording.pause();activeRecording=null}
}
function setExerciseKind(value){
 stopPhraseAudio();isPhrase=value;$('#single-mode').setAttribute('aria-pressed',String(!value));$('#phrase-mode').setAttribute('aria-pressed',String(value));$('#phrase-size-option').hidden=!value;$('#phrase-instruction').hidden=!value;$('#play').textContent=value?'▶ Ouvir frase':'▶ Ouvir nota';next();
}
$('#single-mode').onclick=()=>setExerciseKind(false);$('#phrase-mode').onclick=()=>setExerciseKind(true);$('#phrase-size').onchange=next;
let recordingManifest=null, activeRecording=null, playRequest=0;
const recordingsReady=fetch('./audio/manifest.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('No recordings');return r.json()}).then(m=>{recordingManifest=m;$('#audio-status').textContent='Gravações reais de violino · University of Iowa';return m}).catch(()=>null);
async function play(n){
 const request=++playRequest;
 if(activeRecording){activeRecording.pause();activeRecording=null}
 await recordingsReady;
 if(request!==playRequest)return;
 const entry=recordingManifest?.[n.id];
 if(entry){
  const audio=new Audio(new URL(entry.url,document.baseURI).href);activeRecording=audio;
  try{await audio.play();if(request!==playRequest){audio.pause();return}$('#audio-status').textContent='Violino real · corda '+stringNames[n.string]+' · University of Iowa';return}catch{}
 }
 if(request!==playRequest)return;
 $('#audio-status').textContent='Som sintetizado · gravação indisponível neste momento';
 return synthPlay(n);
}
async function synthPlay(n){try{ctx ||= new (window.AudioContext||window.webkitAudioContext)();await ctx.resume();const t=ctx.currentTime,f=440*2**((n.midi-69)/12);let gain=ctx.createGain();gain.connect(ctx.destination);gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(.16,t+.1);gain.gain.setTargetAtTime(0,t+.9,.15);for(let i=1;i<=9;i++){let o=ctx.createOscillator(),g=ctx.createGain();o.frequency.value=f*i;g.gain.value=1/(i*i*.7);o.connect(g);g.connect(gain);o.start(t);o.stop(t+1.7)}}catch{$('#feedback').textContent='Áudio indisponível neste navegador.'}}
$('#play').onclick=()=>{if(isPhrase)playPhrase();else play(current)};$('#next').onclick=next;$('#hint').onclick=()=>{const show=!$('#hint-text').textContent;$('#hint-text').textContent=show?staffPosition(current):'';$('#hint').textContent=show?'Ocultar posição':'Posição na pauta';$('#hint').setAttribute('aria-expanded',String(show))};$('#mode').onchange=next;$('#string').onchange=()=>{done=0;renderMap();renderStudy();next()};
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>{stopPhraseAudio();document.body.dataset.tab=b.dataset.tab;document.querySelectorAll('nav button').forEach(x=>x.classList.toggle('active',x===b));document.querySelectorAll('nav button').forEach(x=>x.setAttribute('aria-current',x===b?'page':'false'));['practice','map','about'].forEach(id=>$('#'+id).hidden=id!==b.dataset.tab);$('.study-controls').hidden=b.dataset.tab==='about'});
function renderMap(){$('#note-map').replaceChildren(...stringNames.map((s,i)=>{let row=document.createElement('div');row.className='map-row';row.innerHTML=`<strong>${s}<small>${['G3','D4','A4','E5'][i]}</small></strong>`;notes.filter(n=>n.string===i).forEach(n=>{let b=document.createElement('button');b.innerHTML=`${n.name}<small>${n.finger===0?'Solta':n.finger+'º dedo'}</small>`;b.onclick=()=>{stopPhraseAudio();play(n)};row.append(b)});return row}).filter((row,i)=>$('#string').value==='all'||i===Number($('#string').value)));}
$('#reset').onclick=()=>{if(confirm('Zerar o progresso salvo neste navegador?')){stats={total:0,correct:0,streak:0,errors:{}};done=0;persist();next()}};
let installPrompt;window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;$('#install').hidden=false});$('#install').onclick=async()=>{if(installPrompt){await installPrompt.prompt();installPrompt=null;$('#install').hidden=true}};
function renderStudy(){const pool=selectedNotes();$('#study-title').textContent=$('#string').value==='all'?'Consultar notas do treino':'Consultar notas · corda '+stringNames[Number($('#string').value)];$('#study-notes').replaceChildren(...pool.map(n=>{let b=document.createElement('button');b.innerHTML=staff(n,true).replace('viewBox="0 0 480 205"','viewBox="45 5 275 200"')+`<strong>${n.name}${n.octave}</strong><small>${stringNames[n.string]} · ${n.finger===0?'Solta':n.finger+'º dedo'}</small>`;b.onclick=()=>{stopPhraseAudio();play(n)};return b}));}
document.body.dataset.tab='practice';renderMap();renderStudy();
if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});next();
