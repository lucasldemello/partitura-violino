const fs=require('fs'),vm=require('vm'),assert=require('assert');
class E{constructor(){this.value='';this.textContent='';this.style={};this.dataset={};this.children=[];this.checked=false;this.classList={add(){},remove(){},toggle(){}}}setAttribute(k,v){this[k]=v}replaceChildren(...a){this.children=a;this.textContent=''}append(x){this.children.push(x)}click(){this.onclick?.()}}
const els={};const get=s=>els[s]||=new E();get('#string').value='all';get('#mode').value='note';get('#phrase-size').value='2';const memory={};
const nav=['practice','map','about'].map(t=>{const e=get('[data-tab="'+t+'"]');e.dataset.tab=t;return e});
const context={fetch:()=>Promise.reject(Error('offline')),console,Math,Array,Number,String,JSON,Date,confirm:()=>false,localStorage:{getItem:k=>memory[k]||null,setItem:(k,v)=>memory[k]=v},window:{addEventListener(){}},navigator:{},document:{body:{dataset:{}},querySelector:get,querySelectorAll:s=>s==='nav button'?nav:s==='#answers button'?get('#answers').children:[],createElement:()=>new E()}};
vm.createContext(context);for(const f of ['app.js','learning.js'])vm.runInContext(fs.readFileSync(require('path').resolve(process.env.ARCO_TEST_ROOT||require('path').resolve(__dirname,'..'),f),'utf8'),context);const run=s=>vm.runInContext(s,context);
assert(!get('#session-home').hidden);get('#continue-session').click();assert(!get('.layout').hidden);
function choose(correct=true){const id=run('current.id');const b=get('#answers').children.find(b=>correct?b.dataset.noteId===id:b.dataset.noteId!==id);assert(b);b.click()}
get('#mode').value='finger';get('#mode').onchange();for(let i=0;i<20;i++){run('next(false)');assert(get('#question').textContent.includes(run('stringNames[current.string]')));assert(get('#answers').children.every(b=>b.dataset.noteId.startsWith(run('String(current.string)')+'-')))}
get('#mode').value='note';get('#mode').onchange();get('#hint').click();let key=run('learningKey(current)');choose();assert.equal(run('learning.records['+JSON.stringify(key)+'].assisted'),1);assert.equal(run('learning.records['+JSON.stringify(key)+'].independent'),0);
run('next(false)');key=run('learningKey(current)');choose(false);assert(!get('#comparison-panel').hidden);assert.equal(run('learning.records['+JSON.stringify(key)+'].wrong'),1);
while(run('studySession.results.length')<10){run('next(false)');choose()}
get('#next').click();assert(!get('#session-summary').hidden);assert(run('studySession.finished'));assert(get('#session-results').textContent.includes('10 notas'));
get('#review-session').click();assert.equal(run('studySession.target'),4);assert(!get('#show-fingers').checked);assert(!get('#auto-play').checked);assert.equal(get('#answers').children.length,4);
get('#end-session').click();get('#new-session').click();get('#phrase-mode').click();get('#phrase-size').value='4';get('#phrase-size').onchange();assert(!get('#staff').innerHTML.match(/>1<\/text>/));
get('#hint').click();choose(false);choose();choose();choose();assert(run('phraseFinished'));assert(!get('#repeat-phrase').hidden);assert(get('#staff').innerHTML.includes('data-phrase-index'));assert.equal(run('studySession.results.length'),4);assert(run('studySession.results[0].help'));assert(!run('studySession.results[1].help'));
const sequence=run('phrase.map(n=>n.id).join()');get('#repeat-phrase').click();assert.equal(run('phrase.map(n=>n.id).join()'),sequence);assert.equal(run('phraseIndex'),0);
run('next(false)');get('#show-fingers').checked=true;get('#show-fingers').onchange();choose();choose();choose();choose();assert(run('studySession.results.slice(-4).every(r=>r.help)'));
assert(memory['arco-learning-v1']);assert(memory['arco-session-v1']);
run("learning={version:1,serial:10,records:{'note:0-0':{id:'0-0',mode:'note',debt:4,dueAfter:13,dueAt:Date.now()+100000}}};studySession=null");get('#mode').value='note';for(let i=0;i<100;i++)assert.notEqual(run('pickForReview(notes).id'),'0-0');run('learning.serial=13');assert(run("reviewWeight(notes[0])>1"));
console.log('PASS: sessões, revisão espaçada, ambiguidade, comparação, ajuda, frases, repetição, persistência e dados separados');

run("studySession=null;learning={version:1,serial:0,records:{}};isPhrase=false");get('#mode').value='note';run('startSession()');run('play(current)');const audioKey=run('learningKey(current)');choose();assert.equal(run('learning.records['+JSON.stringify(audioKey)+'].assisted'),1);assert(run('learning.records['+JSON.stringify(audioKey)+'].recent[0].audio'));
get('#mode').value='finger';get('#mode').onchange();const fingerKey=run('learningKey(current)');choose();assert(run('learning.records['+JSON.stringify(fingerKey)+'].mode')==='finger');assert(run('learning.records['+JSON.stringify(audioKey)+'].mode')==='note');
get('#phrase-mode').click();choose();const count=run('studySession.results.length');get('#single-mode').click();assert.equal(run('studySession.results.length'),count);
console.log('PASS: áudio como apoio, modos separados e respostas de frase interrompida preservadas');
