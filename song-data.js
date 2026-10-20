/* Transcribed from the user's score: selected, uncrossed measures only.
   Fingering is an app suggestion; it is not copied from the printed score. */
(function(root){
 const patterns={
  P:[[['2-0',1],['2-0',1],['3-0',1],['3-0',1]],[['3-1',1],['3-1',1],['3-0',2]],[['2-3',1],['2-3',1],['2-2',1],['2-2',1]],[['2-1',1],['2-1',1],['2-0',2]]],
  Q:[[['3-0',1],['3-0',1],['2-3',1],['2-3',1]],[['2-2',1],['2-2',1],['2-1',2]],[['3-0',1],['3-0',1],['2-3',1],['2-3',1]],[['2-2',1],['2-2',1],['2-1',2]]]
 };
 const bars=[[1,'P'],[5,'Q'],[9,'P'],[21,'P'],[33,'Q'],[37,'P']].flatMap(([start,pattern])=>patterns[pattern].map((events,i)=>({number:start+i,notes:events.map(([id,beats])=>({id,beats})),repeat:start+i===4,fermata:[36,40].includes(start+i),double:start+i===12,final:start+i===40})));
 const data={title:'Brilha, estrelinha',key:'A major',meter:[4,4],bars,answerIds:['2-0','2-1','2-2','2-3','3-0','3-1']};root.ArcoSongData=data;if(typeof module==='object')module.exports=data;
})(typeof globalThis==='object'?globalThis:this);
