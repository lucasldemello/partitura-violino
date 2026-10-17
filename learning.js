/* Learning records are separate from legacy aggregate statistics. */
let learning={version:1,serial:0,records:{}};
let studySession=null,attemptHelp=false,attemptAudio=false,phraseHelp=false,phraseHeard=false,reviewOptions=null;
try{const data=JSON.parse(localStorage.getItem('arco-learning-v1'));if(data?.version===1)learning=data;studySession=JSON.parse(localStorage.getItem('arco-session-v1'))}catch{}
const skill=()=>$('#mode').value;
const learningKey=(n,mode=skill())=>mode+':'+n.id;
function saveLearning(){try{localStorage.setItem('arco-learning-v1',JSON.stringify(learning));localStorage.setItem('arco-session-v1',JSON.stringify(studySession))}catch{}}
function recordFor(n,mode=skill()){return learning.records[learningKey(n,mode)]}
function recordAttempt(n,chosen,correct,help,audio,legacy=false){
 if(legacy){stats.total++;done++;if(correct){stats.correct++;stats.streak++}else stats.streak=0;persist()}
 const key=learningKey(n),r=learning.records[key]||{id:n.id,mode:skill(),attempts:0,wrong:0,independent:0,assisted:0,debt:0,recent:[],confusions:{}};
 learning.serial++;r.attempts++;r.lastAt=Date.now();
 const supported=help||audio;
 if(!correct){r.wrong++;r.debt=Math.min(8,r.debt+2);r.confusions[chosen.id]=(r.confusions[chosen.id]||0)+1}
 else if(supported){r.assisted++;r.debt=Math.max(1,r.debt)}
 else{r.independent++;r.debt=Math.max(0,r.debt-1)}
 r.recent.push({correct,help,audio,at:r.lastAt});r.recent=r.recent.slice(-8);
 r.dueAfter=learning.serial+3;r.dueAt=Date.now()+(correct&&!supported?86400000:3600000);
 learning.records[key]=r;
 if(studySession&&!studySession.finished)studySession.results.push({id:n.id,mode:skill(),correct,help,audio,chosen:chosen.id});
 saveLearning();renderLearningProgress();
}
const originalSelectedNotes=selectedNotes;
selectedNotes=function(){if(studySession?.reviewIds?.length&&!studySession.finished)return notes.filter(n=>studySession.reviewIds.some(id=>notes.find(x=>x.id===id)?.string===n.string));return originalSelectedNotes()};
reviewWeight=function(n){const r=recordFor(n);if(!r)return 1;if(learning.serial<r.dueAfter&&Date.now()<r.dueAt)return 1;return 1+Math.min(r.debt,4)};
pickForReview=function(pool){
 const eligible=pool.filter(n=>{const r=recordFor(n);return !r||!r.debt||learning.serial>=r.dueAfter||Date.now()>=r.dueAt});if(eligible.length)pool=eligible;
 const focus=studySession?.reviewIds?.length?pool.filter(n=>studySession.reviewIds.includes(n.id)):[];if(focus.length&&Math.random()<.5)return focus[Math.floor(Math.random()*focus.length)];
 const due=pool.filter(n=>{const r=recordFor(n);return r&&r.debt>0&&(learning.serial>=r.dueAfter||Date.now()>=r.dueAt)});
 // Alternate targeted revision with consolidation; a due item is never the entire session.
 const candidates=due.length&&learning.serial%2===0?due:pool;
 let roll=Math.random()*candidates.reduce((sum,n)=>sum+reviewWeight(n),0);
 for(const n of candidates){roll-=reviewWeight(n);if(roll<0)return n}return candidates.at(-1);
};
function noteLabel(n){return n.name+n.octave+' · '+stringNames[n.string]}
function positionExplanation(a,b){
 if(a.step===b.step&&a.sharp!==b.sharp)return `${a.name}${a.octave} e ${b.name}${b.octave} ocupam a mesma posição. O ♯ eleva a nota em meio tom.`;
 return `${a.name}${a.octave}: ${staffPosition(a)}. ${b.name}${b.octave}: ${staffPosition(b)}.`;
}
function showComparison(target,chosen,container){
 container.replaceChildren();const text=document.createElement('p');text.textContent=skill()==='finger'?`Na corda ${stringNames[target.string]}, ${target.name}${target.octave} usa ${target.finger===0?'a corda solta': 'o '+target.finger+'º dedo'}. Você escolheu ${chosen.finger===0?'corda solta':chosen.finger+'º dedo'}.`:positionExplanation(target,chosen);container.append(text);
 const row=document.createElement('div');row.className='comparison';
 for(const [n,label] of [[target,'Correta'],[chosen,'Sua resposta']]){const b=document.createElement('button');b.innerHTML=staff(n,skill()==='finger').replace('0 0 480 205','45 5 275 200')+`<small>${label}</small><strong>${n.name}${n.octave}</strong>`;b.onclick=()=>{stopPhraseAudio();play(n)};row.append(b)}container.append(row);
}
function clearAttemptSupport(){attemptHelp=false;attemptAudio=false}
const baseRender=renderExerciseStaff;
renderExerciseStaff=function(){baseRender();if(!answered&&(!isPhrase||!phraseFinished)&&$('#show-fingers').checked&&skill()==='note'){attemptHelp=true;if(isPhrase)phraseHelp=true}
 if(isPhrase&&phraseFinished){document.querySelectorAll('#staff [data-phrase-index]').forEach(el=>{const select=()=>inspectPhraseNote(Number(el.dataset.phraseIndex));el.onclick=select;el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select()}}})}
};
const baseNext=next;
next=function(auto=true){
 if(studySession&&!studySession.finished&&studySession.results.length>=studySession.target){finishSession();return}
 clearAttemptSupport();phraseHelp=false;phraseHeard=false;if(!isPhrase)phraseFinished=false;$('#comparison-panel').hidden=true;$('#repeat-phrase').hidden=true;
 baseNext(auto);if(studySession){studySession.mode=skill();studySession.kind=isPhrase;studySession.size=$('#phrase-size').value;saveLearning()}
 if(!isPhrase){$('#question').textContent=skill()==='finger'?`Na corda ${stringNames[current.string]}, qual dedo?`:'Qual é esta nota?';$('#exercise-context').textContent='Corda '+stringNames[current.string]}
 renderSessionCount();
};
const baseSingle=answerSingle;
answerSingle=function(button,correct){if(answered)return;const chosen=notes.find(n=>n.id===button.dataset.noteId)||current;
 const helped=attemptHelp,heard=attemptAudio;baseSingle(button,correct);recordAttempt(current,chosen,correct,helped,heard);
 if(correct)$('#feedback').textContent=helped||heard?'Você acertou com apoio. Vamos praticar esta nota sem apoio mais tarde.':'Você acertou sem apoio.';
 else{const panel=$('#comparison-panel');panel.hidden=false;showComparison(current,chosen,panel)}
 $('#next').textContent=studySession?.results.length>=studySession?.target?'Ver resumo →':'Próxima nota →';renderSessionCount();
};
const basePhraseQuestion=renderPhraseQuestion;
renderPhraseQuestion=function(){clearAttemptSupport();basePhraseQuestion();if(phraseHelp)attemptHelp=true;if(phraseHeard)attemptAudio=true;renderSessionCount()};
const baseAnswerPhrase=answerPhrase;
answerPhrase=function(button){if(phraseFinished||answered)return;const before=phraseAttempts.length,help=attemptHelp||phraseHelp,audio=attemptAudio||phraseHeard;
 baseAnswerPhrase(button);
 if(phraseAttempts.length>before){phraseAttempts[before].help=help;phraseAttempts[before].audio=audio;const a=phraseAttempts[before];recordAttempt(a.note,a.chosen,a.correct,help,audio,true);update();renderSessionCount()}
 if(phraseFinished){
 $('#feedback').textContent=`${phraseAttempts.filter(a=>a.correct).length} de ${phrase.length} certas. Toque numa nota da pauta para conferir e ouvir.`;
 $('#repeat-phrase').hidden=false;$('#next').textContent=studySession?.results.length>=studySession?.target?'Ver resumo →':'Nova frase →';renderExerciseStaff();renderSessionCount()}
};
function inspectPhraseNote(index){const a=phraseAttempts[index];if(!a)return;stopPhraseAudio();play(a.note);const panel=$('#comparison-panel');panel.hidden=false;if(a.correct){panel.textContent=`✓ ${noteLabel(a.note)} · ${a.note.finger===0?'solta':a.note.finger+'º dedo'} · ${staffPosition(a.note)}`}else showComparison(a.note,a.chosen,panel)}
$('#repeat-phrase').onclick=()=>{stopPhraseAudio();if(studySession?.results.length>=studySession?.target){studySession={mode:skill(),kind:true,size:String(phrase.length),target:10,results:[],reviewIds:null,finished:false,startedAt:Date.now()};saveLearning()}phraseFinished=false;phraseIndex=0;phraseAttempts=[];phraseHelp=true;phraseHeard=false;$('#comparison-panel').hidden=true;$('#repeat-phrase').hidden=true;renderPhraseQuestion();if($('#auto-play').checked)playPhrase()};
const basePlay=play;
play=async function(n){if(document.body.dataset.tab==='practice'&&!answered&&(!isPhrase||!phraseFinished)){attemptAudio=true;if(isPhrase)phraseHeard=true}return basePlay(n)};
const baseHint=$('#hint').onclick;
$('#hint').onclick=()=>{if(!$('#hint-text').textContent&&!answered){attemptHelp=true}baseHint()};
function renderSessionCount(){if(!studySession||studySession.finished)return;$('#counter').textContent=isPhrase&&!phraseFinished?`Nota ${phraseIndex+1}/${phrase.length}`:`${Math.min(studySession.results.length+(!answered?1:0),studySession.target)}/${studySession.target}`;$('#session-count').textContent=`Sessão: ${studySession.results.length} de ${studySession.target} notas${studySession.results.length>studySession.target?' · frase completa':''}`}
function restoreReviewOptions(){if(!reviewOptions)return;$('#show-fingers').checked=reviewOptions.fingers;$('#auto-play').checked=reviewOptions.audio;reviewOptions=null}
function startSession(reviewIds=null,mode=skill()){
 restoreReviewOptions();studySession={mode:mode,target:reviewIds?4:10,results:[],reviewIds,finished:false,startedAt:Date.now()};
 if(reviewIds){$('#mode').value=mode;reviewOptions={fingers:$('#show-fingers').checked,audio:$('#auto-play').checked};$('#show-fingers').checked=false;$('#auto-play').checked=false;isPhrase=false;$('#single-mode').setAttribute('aria-pressed','true');$('#phrase-mode').setAttribute('aria-pressed','false');$('#phrase-size-option').hidden=true;$('#phrase-instruction').hidden=true;$('#play').textContent='▶ Ouvir nota'}
 saveLearning();openSession();next(false);
}
function openSession(){if(studySession?.mode)$('#mode').value=studySession.mode;$('#session-home').hidden=true;$('#session-summary').hidden=true;$('.layout').hidden=false;$('.study-controls').hidden=false;$('#end-session').hidden=false}
function finishSession(){stopPhraseAudio();if(!studySession)return;studySession.finished=true;saveLearning();restoreReviewOptions();$('.layout').hidden=true;$('.study-controls').hidden=true;$('#end-session').hidden=true;$('#session-home').hidden=true;$('#session-summary').hidden=false;
 const results=studySession.results,solo=results.filter(r=>r.correct&&!r.help&&!r.audio).length,supported=results.filter(r=>r.correct&&(r.help||r.audio)).length;
 $('#session-results').textContent=`${results.length} notas praticadas: ${solo} sem apoio, ${supported} com apoio e ${results.filter(r=>!r.correct).length} para revisar.`;
 const review=results.filter(r=>!r.correct||r.help||r.audio);const unique=[...new Set(review.filter(r=>r.mode===review[0]?.mode).map(r=>r.id))].slice(0,2);$('#review-session').hidden=!unique.length;$('#review-session').onclick=()=>startSession(unique,review[0]?.mode||skill());renderLearningProgress();
}
function home(){stopPhraseAudio();$('.layout').hidden=true;$('#session-summary').hidden=true;$('#session-home').hidden=false;$('.study-controls').hidden=true;$('#end-session').hidden=true;$('#continue-session').textContent=studySession&&!studySession.finished?'Continuar meu treino':'Começar treino de 10 notas'}
$('#continue-session').onclick=()=>{if(studySession&&!studySession.finished){isPhrase=!!studySession.kind;$('#phrase-size').value=studySession.size||'2';$('#single-mode').setAttribute('aria-pressed',String(!isPhrase));$('#phrase-mode').setAttribute('aria-pressed',String(isPhrase));$('#phrase-size-option').hidden=!isPhrase;$('#phrase-instruction').hidden=!isPhrase;$('#play').textContent=isPhrase?'▶ Ouvir frase':'▶ Ouvir nota';openSession();next(false)}else startSession()};
$('#new-session').onclick=()=>startSession();$('#end-session').onclick=finishSession;$('#close-session').onclick=home;
function renderLearningProgress(){
 const root=$('#learning-progress');root.replaceChildren();
 for(const mode of ['note','finger']){const section=document.createElement('section');const h=document.createElement('h3');h.textContent=mode==='note'?'Leitura das notas':'Digitação';section.append(h);
 const records=Object.values(learning.records).filter(r=>r.mode===mode);const hard=records.filter(r=>r.debt>0).sort((a,b)=>b.debt-a.debt||b.lastAt-a.lastAt).slice(0,3);
 const firm=records.filter(r=>r.recent.length>=5&&r.recent.slice(-5).every(a=>a.correct&&!a.help&&!a.audio));
 const line=document.createElement('p');line.textContent=records.length?`Consistentes nas últimas 5 tentativas sem apoio: ${firm.length?firm.map(r=>noteLabel(notes.find(n=>n.id===r.id))).join(', '):'ainda praticando'}.`:'Ainda sem tentativas neste modo.';section.append(line);
 for(const r of hard){const n=notes.find(n=>n.id===r.id);const b=document.createElement('button');b.textContent='Rever '+noteLabel(n);b.onclick=()=>{document.querySelector('[data-tab="practice"]').click();startSession([n.id],mode)};section.append(b)}
 root.append(section)}
}
const resetOld=$('#reset').onclick;$('#reset').onclick=()=>{const before=stats;resetOld();if(stats!==before){learning={version:1,serial:0,records:{}};studySession=null;saveLearning();renderLearningProgress();home()}};
// Changing settings abandons only an unanswered exercise, preserving session results.
$('#string').onchange=()=>{if(studySession)studySession.reviewIds=null;renderMap();renderStudy();next()};
const originalNav=[...document.querySelectorAll('nav button')].map(b=>[b,b.onclick]);
for(const [button,handler] of originalNav)button.onclick=()=>{if(button.dataset.tab==='map'&&!answered){attemptHelp=true;if(isPhrase)phraseHelp=true}handler();if(button.dataset.tab==='practice'){if(studySession&&!studySession.finished)openSession();else home()}else{$('#end-session').hidden=true;if(button.dataset.tab==='about')renderLearningProgress()}};
$('#next').onclick=()=>next();$('#mode').onchange=()=>{if(studySession){studySession.mode=skill();studySession.reviewIds=null;saveLearning()}next()};$('#phrase-size').onchange=()=>next();
renderLearningProgress();home();
