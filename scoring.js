(function (root) {
  'use strict';
  function aggregate(values, count) {
    if (![3, 5].includes(count)) throw new Error('Porota musí mít 3 nebo 5 členů.');
    const valid = values.filter(v => typeof v === 'number' && Number.isFinite(v) && v >= 0);
    if (valid.length !== count || values.length !== count) return {total:null, dropped:[]};
    const sorted = valid.map((value,index)=>({value,index})).sort((a,b)=>a.value-b.value || a.index-b.index);
    const kept = count === 5 ? sorted.slice(1,-1) : sorted;
    return {total:kept.reduce((sum,s)=>sum+s.value,0)/kept.length,
      dropped:count === 5 ? [sorted[0].index,sorted[4].index] : []};
  }
  function riderResult(scores, panel) {
    const latest = new Map();
    for (const s of scores) {
      if (s.submitted && panel.includes(s.judgeId) && [1,2].includes(s.run)
          && typeof s.total === 'number' && Number.isFinite(s.total) && s.total >= 0) {
        latest.set(s.judgeId + ':' + s.run,s.total);
      }
    }
    const marks = panel.map(id => {
      const a=latest.get(id+':1'), b=latest.get(id+':2');
      return a === undefined && b === undefined ? null : Math.max(a ?? -1,b ?? -1);
    });
    return {...aggregate(marks,panel.length), marks, received:marks.filter(v=>v!==null).length};
  }
  const api = {aggregate,riderResult};
  if (typeof module !== 'undefined') module.exports=api;
  else root.ScootScoring=api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
