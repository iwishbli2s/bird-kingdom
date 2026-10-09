import type {AnnualReportState} from './annualTypes';
export function validateAnnualReports(raw:unknown,turn:number):asserts raw is AnnualReportState {
 const fail=()=>{throw new Error('연간 보고 자료가 올바르지 않습니다.');};
 const obj=(v:any)=>{if(!v||typeof v!=='object'||Array.isArray(v))fail();};
 const num=(v:any)=>{if(typeof v!=='number'||!Number.isFinite(v))fail();};
 const integer=(v:any,min=0,max=turn)=>{num(v);if(!Number.isInteger(v)||v<min||v>max)fail();};
 const str=(v:any)=>{if(typeof v!=='string')fail();};
 const arr=(v:any)=>{if(!Array.isArray(v))fail();};
 const date=(v:any)=>{obj(v);integer(v.year,1,999999);integer(v.month,1,12);};
 const a=raw as any;obj(a);obj(a.snapshot);date(a.snapshot.date);integer(a.snapshot.turn,1);integer(a.snapshot.year,1,999999);
 for(const k of ['jurisdictionId','jurisdictionName','countryId','signature'])str(a.snapshot[k]);obj(a.snapshot.values);for(const n of Object.values(a.snapshot.values))num(n);
 for(const k of ['countryIds','regionIds']){arr(a[k]);for(const id of a[k])str(id);}arr(a.snapshot.regionIds);a.snapshot.regionIds.forEach(str);
 integer(a.periodStartTurn,1);if(a.snapshot.turn<a.periodStartTurn)fail();integer(a.eventStartOrder,1,Number.MAX_SAFE_INTEGER);arr(a.summaries);
 const ids=new Set(),years=new Set();let last=0;
 for(const r of a.summaries){obj(r);for(const k of ['id','jurisdictionId','jurisdictionName','headline','description','comparisonLabel'])str(r[k]);integer(r.year,1,999999);integer(r.createdTurn,1);if(r.suppressAutomaticDisplay!==undefined&&typeof r.suppressAutomaticDisplay!=='boolean')fail();if(ids.has(r.id)||years.has(r.year)||r.createdTurn<=last)fail();ids.add(r.id);years.add(r.year);last=r.createdTurn;date(r.startDate);date(r.endDate);arr(r.metrics);arr(r.majorEvents);if(r.metrics.length>8||r.majorEvents.length>6)fail();const keys=new Set();for(const m of r.metrics){obj(m);for(const k of ['key','label','unit'])str(m[k]);for(const k of ['startValue','endValue','absoluteChange'])num(m[k]);if(m.percentageChange!==undefined)num(m.percentageChange);if(keys.has(m.key))fail();keys.add(m.key);if(Math.abs((m.endValue-m.startValue)-m.absoluteChange)>1e-8*Math.max(1,Math.abs(m.absoluteChange)))fail();}for(const e of r.majorEvents){obj(e);for(const k of ['historyId','title','description','category'])str(e[k]);date(e.date);}}
}
