const assert=require('node:assert/strict');
const path=require('node:path');
const M=require(path.join(process.env.ARCO_TEST_ROOT||path.resolve(__dirname,'..'),'guided-model.js'));
const s=M.fresh();assert.equal(s.stage,2);assert.equal(s.phase,'home');
for(let stage=2;stage<=5;stage++){
 M.introduce(s,stage);assert.equal(s.phase,'present');assert.equal(s.intro,stage===2?0:stage-1);
 M.round(s);assert.equal(s.queue.length,stage===2?6:stage*2);
 for(const id of M.active(s))assert.equal(s.queue.filter(x=>x===id).length,stage===2?3:2);
 assert.ok(s.queue.every(id=>id.startsWith('1-')));
 // Immediate repetitions can occur, but are not independent evidence.
 assert.equal(M.answer(s,'0-0'),null);
 while(s.phase==='quiz'){M.answer(s,s.queue[s.index]);M.next(s)}
 assert.equal(s.phase,'summary');for(const id of M.active(s))s.history[id]=[{correct:true,supported:false},{correct:true,supported:false}];assert.ok(M.ready(s));
 M.round(s);s.supported=true;M.answer(s,s.queue[0]);assert.ok(!M.ready(s),'support must invalidate recommendation');
 M.next(s);M.answer(s,M.active(s).find(id=>id!==s.queue[s.index]));assert.ok(!M.ready(s),'latest wrong must not be ignored');assert.equal(s.stage,stage);
}
M.round(s);s.queue[1]=s.queue[0];M.answer(s,s.queue[0]);M.next(s);M.answer(s,s.queue[1]);assert.equal(s.results.at(-1).independent,false);assert.ok(!M.ready(s));
const restored=M.restore(JSON.stringify(s));assert.equal(restored.stage,5);assert.equal(restored.visited,5);assert.equal(restored.phase,'home');assert.deepEqual(restored.history,s.history);
assert.deepEqual(M.restore('{oops'),M.fresh());assert.deepEqual(M.restore('{"version":1,"stage":20}'),M.fresh());
console.log('Guided path: balanced rounds, isolated string, support, recent errors, progression and reload passed.');

assert.equal(M.restore(JSON.stringify({...M.fresh(),stage:2,visited:5,returnStage:5})).stage,5,'experiment reload restores advanced stage');
