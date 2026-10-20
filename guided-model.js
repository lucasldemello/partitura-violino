/* A separate learning path: no legacy error debt enters these rounds. */
(function(root){
 const ids=['1-0','1-1','1-2','1-3','1-4'];
 function fresh(){return {version:1,stage:2,visited:2,phase:'home',intro:0,queue:[],index:0,results:[],history:{},supported:false,autoAudio:false}}
 function restore(raw){try{const s=JSON.parse(raw);if(s?.version!==1||![2,3,4,5].includes(s.stage))return fresh();const clean={...fresh(),stage:s.stage,visited:Math.max(s.stage,Math.min(5,Number(s.visited)||2)),autoAudio:s.autoAudio===true,history:{}};for(const id of ids)if(Array.isArray(s.history?.[id]))clean.history[id]=s.history[id].slice(-12).filter(x=>typeof x.correct==='boolean'&&typeof x.supported==='boolean');return clean}catch{return fresh()}}
 function active(s){return ids.slice(0,s.stage)}
 function introduce(s,stage=s.stage){s.stage=stage;s.visited=Math.max(s.visited,stage);s.phase='present';s.intro=stage===2?0:stage-1;s.results=[];s.supported=false}
 function round(s,random=Math.random){const pool=active(s).flatMap(id=>Array(s.stage===2?3:2).fill(id));s.queue=[];while(pool.length){let candidates=pool.map((id,i)=>({id,i})).filter(x=>!(s.queue.length>=2&&s.queue.at(-1)===x.id&&s.queue.at(-2)===x.id));if(!candidates.length)candidates=pool.map((id,i)=>({id,i}));const pick=candidates[Math.floor(random()*candidates.length)];s.queue.push(pick.id);pool.splice(pick.i,1)}s.index=0;s.results=[];s.supported=false;s.phase='quiz'}
 function answer(s,chosen){if(s.phase!=='quiz'||!active(s).includes(chosen))return null;const id=s.queue[s.index],r={id,chosen,correct:id===chosen,supported:s.supported,independent:s.index===0||s.queue[s.index-1]!==id};s.results.push(r);s.history[id]=[...(s.history[id]||[]),r].slice(-12);s.phase='feedback';return r}
 function next(s){s.index++;s.supported=false;s.phase=s.index>=s.queue.length?'summary':'quiz'}
 function ready(s){return active(s).every(id=>{const recent=(s.history[id]||[]).slice(-2);return recent.length===2&&recent.every(r=>r.correct&&!r.supported&&r.independent!==false)})}
 const api={ids,fresh,restore,active,introduce,round,answer,next,ready};root.ArcoGuided=api;if(typeof module==='object')module.exports=api;
})(typeof globalThis==='object'?globalThis:this);
