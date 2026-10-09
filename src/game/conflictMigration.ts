/** Version 2 predates voluntary invasions: missing legitimacy always means justified. */
export function migrateConflictSave(raw:Record<string,any>):Record<string,any> {
  const game=raw.game,world=game?.world,state=world?.warfare,history=game?.history;
  if(!game||!state||!history||!state.wars||typeof state.wars!=='object'||Array.isArray(state.wars)||!history.wars||typeof history.wars!=='object'||Array.isArray(history.wars))return {...raw,saveVersion:3}; // Existing validator rejects missing structures.
  const legacy=(w:any)=>{
    const metadata=history.timeline?.find((e:any)=>e.metadata?.warId===(w.id??w.warId))?.metadata;
    return {...w,legitimacy:w.legitimacy??'justified',...(w.casusBelliType?{}:metadata?.casusBelliType?{casusBelliType:metadata.casusBelliType}:{})};
  };
  const wars=Object.fromEntries(Object.entries(state.wars??{}).map(([id,w])=>[id,legacy(w)]));
  const archived=Object.fromEntries(Object.entries(history.wars??{}).map(([id,w])=>[id,legacy(w)]));
  const records=state.aggressionHistory===undefined?Object.values(wars).map((w:any)=>({warId:w.id,attackerCountryId:w.primaryAttacker,defenderCountryId:w.primaryDefender,startedDate:{...w.startedDate},legitimacy:w.legitimacy,elapsedMonths:Math.max(0,(game.date.year-w.startedDate.year)*12+game.date.month-w.startedDate.month)})):state.aggressionHistory;
  return {...raw,saveVersion:3,game:{...game,world:{...world,warfare:{...state,wars,aggressionHistory:records}},history:{...history,wars:archived}}};
}
