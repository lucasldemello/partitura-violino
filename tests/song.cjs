const assert=require('node:assert/strict'),path=require('node:path');
const data=require(path.join(process.env.ARCO_TEST_ROOT||path.resolve(__dirname,'..'),'song-data.js'));
assert.equal(data.bars.length,24);assert.deepEqual(data.bars.map(b=>b.number),[1,2,3,4,5,6,7,8,9,10,11,12,21,22,23,24,33,34,35,36,37,38,39,40]);
assert.equal(data.bars.flatMap(b=>b.notes).length,84);
for(const bar of data.bars){assert.equal(bar.notes.reduce((sum,n)=>sum+n.beats,0),4);assert.ok(bar.notes.every(n=>data.answerIds.includes(n.id)));assert.ok(bar.notes.every(n=>[1,2].includes(n.beats)))}
assert.deepEqual(data.bars.filter(b=>b.repeat).map(b=>b.number),[4]);assert.deepEqual(data.bars.filter(b=>b.fermata).map(b=>b.number),[36,40]);assert.deepEqual(data.bars.filter(b=>b.final).map(b=>b.number),[40]);
assert.deepEqual(data.bars[0].notes,[{id:'2-0',beats:1},{id:'2-0',beats:1},{id:'3-0',beats:1},{id:'3-0',beats:1}]);
assert.deepEqual(data.bars[19].notes,[{id:'2-2',beats:1},{id:'2-2',beats:1},{id:'2-1',beats:2}]);
console.log('PASS song: selected24 measures,84 notes,4 beats,valid recordings,repeat/fermatas/final');
