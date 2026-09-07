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
  function riderResult(scores, panel, runCount = 2) {
    const latest = new Map();
    for (const s of scores) {
      if (s.submitted && panel.includes(s.judgeId) && Number.isInteger(s.run)
          && s.run >= 1 && s.run <= runCount
          && typeof s.total === 'number' && Number.isFinite(s.total) && s.total >= 0) {
        latest.set(s.judgeId + ':' + s.run,s.total);
      }
    }
    const marks = panel.map(id => {
      const runs = Array.from({length:runCount}, (_, index) => latest.get(id + ':' + (index + 1))).filter(value => value !== undefined);
      return runs.length ? Math.max(...runs) : null;
    });
    return {...aggregate(marks,panel.length), marks, received:marks.filter(v=>v!==null).length};
  }
  const api = {aggregate,riderResult};
  if (typeof module !== 'undefined') module.exports=api;
  else root.ScootScoring=api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
