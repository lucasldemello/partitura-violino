(function(root){
 const defaults=()=>({version:1,strings:[1],count:2});
 function prefs(raw){try{const s=typeof raw==='string'?JSON.parse(raw):raw;if(s?.version!==1)return defaults();const strings=[...new Set((s.strings||[]).filter(x=>Number.isInteger(x)&&x>=0&&x<=3))].sort();return {version:1,strings:strings.length?strings:[1],count:[2,3,4,5].includes(s.count)?s.count:2}}catch{return defaults()}}
 function pool(notes,settings){const s=prefs(settings),byMidi=new Map();for(const n of notes.filter(n=>s.strings.includes(n.string)&&n.finger<s.count)){if(!byMidi.has(n.midi))byMidi.set(n.midi,{...n,fingerings:[]});byMidi.get(n.midi).fingerings.push({id:n.id,string:n.string,finger:n.finger})}for(const entry of byMidi.values())entry.fingerings=notes.filter(n=>s.strings.includes(n.string)&&n.midi===entry.midi).map(n=>({id:n.id,string:n.string,finger:n.finger}));return [...byMidi.values()].sort((a,b)=>a.midi-b.midi)}
 function ledger(p){const result=[];for(let i=-2;i>=p;i-=2)result.push(i);for(let i=10;i<=p;i+=2)result.push(i);return result}
 function where(p){if(p>=0&&p<=8)return p%2===0?`${p/2+1}ª linha`:`${(p+1)/2}º espaço`;if(p===-1)return 'espaço logo abaixo da pauta';if(p< -1)return p%2===0?`${-p/2}ª linha suplementar inferior`:`espaço abaixo da ${(-p-1)/2}ª linha suplementar inferior`;if(p===9)return 'espaço logo acima da pauta';return p%2===0?`${(p-8)/2}ª linha suplementar superior`:`espaço acima da ${(p-9)/2}ª linha suplementar superior`}
 function correct(note,position,sharp){return note.step-30===position&&note.sharp===sharp}
 function round(pool,random=Math.random){const ids=[...pool,...pool].map(n=>n.id);for(let i=ids.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[ids[i],ids[j]]=[ids[j],ids[i]]}return ids}
 const api={round,defaults,prefs,pool,ledger,where,correct,min:-5,max:11};root.ArcoReadingModel=api;if(typeof module==='object')module.exports=api;
})(typeof globalThis==='object'?globalThis:this);
