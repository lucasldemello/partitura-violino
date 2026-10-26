const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const base=process.env.ARCO_TEST_ROOT||path.resolve(__dirname,'..'),M=require(path.join(base,'reading-model.js'));
const context={};vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(base,'app.js'),'utf8').split('let saved;')[0]+';globalThis.fixture=notes',context);const notes=JSON.parse(JSON.stringify(context.fixture));
assert.deepEqual(M.defaults(),{version:1,strings:[1],count:2});assert.deepEqual(M.pool(notes,M.defaults()).map(n=>n.id),['1-0','1-1']);
for(let string=0;string<4;string++){const p=M.pool(notes,{version:1,strings:[string],count:5});assert.equal(p.length,5);assert.ok(p.every(n=>n.string===string));}
const mixed=M.pool(notes,{version:1,strings:[1,2],count:5});assert.equal(mixed.length,9);assert.equal(mixed.filter(n=>n.midi===69).length,1);assert.equal(mixed.find(n=>n.midi===69).fingerings.length,2);
assert.equal(M.pool(notes,{version:1,strings:[0,1,2,3],count:5}).length,17);
const sharp=notes.find(n=>n.id==='1-2');assert.ok(M.correct(sharp,sharp.step-30,true));assert.ok(!M.correct(sharp,sharp.step-30,false));assert.ok(!M.correct(sharp,sharp.step-31,true));
assert.deepEqual(M.ledger(-5),[-2,-4]);assert.deepEqual(M.ledger(11),[10]);assert.deepEqual(M.ledger(-1),[]);assert.deepEqual(M.ledger(8),[]);
assert.equal(notes.find(n=>n.id==='0-0').step-30,M.min);assert.equal(notes.find(n=>n.id==='3-4').step-30,M.max);
assert.deepEqual(M.prefs(JSON.stringify({version:1,strings:[2,1,2,9],count:5})),{version:1,strings:[1,2],count:5});assert.deepEqual(M.prefs('{bad'),M.defaults());assert.deepEqual(M.prefs({version:1,strings:[],count:99}),M.defaults());
console.log('PASS reading:4strings,default2,pitch dedup,shared fingering,accidentals,ledger ranges,preferences');
for(let count=2;count<=5;count++){const pool=M.pool(notes,{version:1,strings:[1],count});const round=M.round(pool,()=>0);assert.equal(round.length,count*2);for(const n of pool)assert.equal(round.filter(id=>id===n.id).length,2);assert.ok(round.every(id=>id.startsWith('1-')))}
console.log('PASS reading finite rounds:4/6/8/10 items,each selected note twice');
