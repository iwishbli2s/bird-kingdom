import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createGame,advanceMonth} from '../src/game/engine';
import {createSaveData,serializeSave,deserializeSave,loadGame,saveMigrations,assertJsonSafe,saveConfig} from '../src/game/save';
import {saveToSlot,loadFromSlot,importToSlot,autosaveDue,type SaveStorage} from '../src/game/saveStorage';
import {randomStreamNames,withGameRandom} from '../src/game/randomState';
import {setControlledTaxPolicy,setGovernmentTaxPolicy} from '../src/game/taxPolicy';
import {setControlledBudgetPolicy,setGovernmentBudgetPolicy} from '../src/game/budgetPolicy';
import {controlledGovernmentId,governmentDescriptors,getGovernment} from '../src/game/government';
import {policyChangeBlock,emergencyBudgetAvailable} from '../src/game/policySchedule';
import {createBreakawayCountry} from '../src/game/secession';
import {resolveConflictOutcome,applyConflictAction} from '../src/game/conflict';
import {transferWarTerritory} from '../src/game/warfareEffects';
import {startCrisis} from '../src/game/crisis';
import {addCasusBelli} from '../src/game/casusBelli';
import {declareWar} from '../src/game/warfare';
import {generateWorldEvents,getEventDefinition,resolvePendingEvent} from '../src/game/events';
import {queueForeignProposal} from '../src/game/strategicCommands';
import {setGovernmentResearch} from '../src/game/technology';
import {setMobilizationTarget} from '../src/game/military';
import {updateDomesticAI} from '../src/game/ai';
import type {GameState} from '../src/game/types';
import type {StoredSave} from '../src/game/saveTypes';

const fresh=()=>createGame('sparrow',undefined,41027);
const copy=(g:GameState)=>deserializeSave(serializeSave(createSaveData(g,'test'))).game;
const safe={autonomousWorld:true,mortalityRiskOverride:0,electionRandom:()=>0};
const quiet={...safe,domesticAI:false,strategicAI:false,eventOccurrenceRandom:()=>.99999,crisisRandom:()=>.99};
function step(g:GameState,n:number,options=safe){for(let i=0;i<n;i++)g=advanceMonth(g,options);return g;}
function child(g=fresh(),disputed=false){const r=g.world.regions['eagle-state'];Object.assign(r.speciesPolitics.eagle,{satisfaction:10,autonomyDemand:95,independenceSentiment:95});r.governance.integration=20;Object.assign(r.secession!.eagle,{phase:disputed?'unilateral_crisis':'transition',monthsActive:30,monthsInPhase:6,lastRefusalTurn:g.turn,lastReferendumResult:{date:g.date,passed:true,yesShare:90}});return createBreakawayCountry(g,{kind:'region',id:r.id},'eagle',disputed);}
function war(g=fresh()){g=addCasusBelli(g,'sparrow','pigeon','territorial_dispute','duck-state');return declareWar(g,'sparrow',Object.keys(g.world.warfare!.casusBelli)[0],'border_claim',true,true);}
function pending(){const g=fresh();g.world.countries.sparrow.economy.growth=-8;g.world.countries.sparrow.economy.unemployment=24;const next=generateWorldEvents(g,{strategicAI:false,domesticAI:false,eventOccurrenceRandom:()=>0,eventOutcomeRandom:()=>.5});assert.ok(next.events.pendingEvent);return next;}
class MemoryStorage implements SaveStorage {values=new Map<string,StoredSave>();fail=false;async list(){return [...this.values.values()].map(({json,...s})=>s);}async get(id:string){return this.values.get(id)??null;}async put(value:StoredSave){if(this.fail)throw new Error('저장 공간 부족');this.values.set(value.slotId,structuredClone(value));}async remove(id:string){this.values.delete(id);}}
const tax=(g:GameState,id=controlledGovernmentId(g),add=1)=>{const j=getGovernment(g.world,id).jurisdiction,r=j.kind==='region'?g.world.regions[j.id]:g.world.countries[j.id];return {...r.fiscal.taxPolicy,incomeTaxRate:r.fiscal.taxPolicy.incomeTaxRate+add};};
const budget=(g:GameState,id=controlledGovernmentId(g),add=.1)=>{const j=getGovernment(g.world,id).jurisdiction,r=j.kind==='region'?g.world.regions[j.id]:g.world.countries[j.id];return {...r.fiscal.budgetPolicy,healthcare:r.fiscal.budgetPolicy.healthcare+add};};

test('저장 전체 초기 세계 JSON roundtrip',()=>assert.deepEqual(copy(fresh()),JSON.parse(JSON.stringify(fresh()))));
test('저장 clone은 입력을 공유하지 않음',()=>{const g=fresh(),b=copy(g);b.world.countries.sparrow.economy.gdp=1;assert.notEqual(g.world.countries.sparrow.economy.gdp,1);});
test('세이브 생성 version1 및 메타 날짜',()=>{const d=createSaveData(fresh(),'manual-1','국가',undefined,'2026-10-07T00:00:00Z');assert.equal(d.saveVersion,saveConfig.version);assert.equal(d.metadata.name,'국가');assert.equal(d.createdAt,d.updatedAt);assert.equal(d.metadata.countryCount,2);});
test('주지사 메타 실제 운영국/직위',()=>{const d=createSaveData(createGame('pigeon','owl-state'),'manual-1');assert.equal(d.metadata.playerOffice,'governor');assert.equal(d.metadata.playerRegionName,'부엉이주');assert.ok(d.metadata.playerCountryName.includes('비둘기'));});
test('덮어쓰기 생성일 유지 수정일 갱신',()=>{const a=createSaveData(fresh(),'manual-1',undefined,undefined,'2026-01-01'),b=createSaveData(step(fresh(),1,quiet),'manual-1',undefined,a,'2026-02-01');assert.equal(b.createdAt,a.createdAt);assert.notEqual(b.updatedAt,a.updatedAt);});
test('게임 객체 저장 과정 불변',()=>{const g=fresh(),text=JSON.stringify(g);createSaveData(g,'manual-1');assert.equal(JSON.stringify(g),text);});
test('기술 기록 없는 시작 세계 저장 허용',()=>assert.equal(copy(fresh()).world.technologyHistory,undefined));
test('사건창 그대로 복원 및 선택 가능',()=>{const g=pending(),b=copy(g);assert.deepEqual(b.events.pendingEvent,g.events.pendingEvent);const id=getEventDefinition(b.events.pendingEvent!.eventId).choices[0].id;assert.deepEqual(resolvePendingEvent(b,id),JSON.parse(JSON.stringify(resolvePendingEvent(g,id))));});
test('미결 외교 제안 복원 월진행 차단',()=>{const g=queueForeignProposal(fresh(),{kind:'treaty',actorId:'pigeon',targetId:'sparrow',action:'trade',summary:'무역 제안'}),b=copy(g);assert.deepEqual(b.world.foreignProposals,g.world.foreignProposals);assert.equal(advanceMonth(b),b);});
test('동적국가 영토 종족 AI 일괄복원',()=>assert.deepEqual(copy(child()),JSON.parse(JSON.stringify(child()))));
test('중앙국 분리 동적 지역도 전체 복원',()=>{const g=fresh(),r=g.world.countries.sparrow;Object.assign(r.secession!.crow,{phase:'transition',monthsInPhase:6,lastReferendumResult:{date:g.date,passed:true,yesShare:90}});const a=createBreakawayCountry(g,{kind:'country',id:'sparrow'},'crow'),b=copy(a);assert.ok(b.world.regions['crow-nest-1'].regionIdentity!.isDynamic);assert.deepEqual(b,JSON.parse(JSON.stringify(a)));});
test('연방 주 저장 실제 주 및 관할 정책 복원',()=>{let g=createGame('pigeon','owl-state',41);g=setControlledTaxPolicy(g,tax(g));const b=copy(g);assert.equal(b.player.controlledRegionId,'owl-state');assert.ok(policyChangeBlock(b,'region:owl-state','tax'));});
test('정책 비정수 deadline 손상 거부',()=>{const g=fresh();g.policySchedules!['country:sparrow'].budgetNextChangeTurn=1.5;assert.throws(()=>copy(g));});
test('세계 전쟁·위기·외교 자료 없는 손상 거부',()=>{for(const key of ['warfare','crises','diplomacy'] as const){const g=fresh();delete g.world[key];assert.throws(()=>copy(g));}});
test('내부분쟁 unresolved 복원',()=>{const g=child(fresh(),true);assert.deepEqual(copy(g).world.internalConflicts,g.world.internalConflicts);});
test('전쟁 전선 참가국 복원',()=>{const g=war();assert.deepEqual(copy(g).world.warfare,g.world.warfare);});
test('위기와 nextId 복원',()=>{const g=startCrisis(fresh(),{kind:'country',id:'sparrow'},'great_storm',95);assert.deepEqual(copy(g).world.crises,g.world.crises);});
test('소멸국 archive 복원',()=>{let g=child();g=transferWarTerritory(g,['eagle-state'],'sparrow');assert.ok(copy(g).history!.countries['eagle-republic-1'].dissolvedDate);});
test('소멸 국가 ID 재사용 방지 save/load 이후',()=>{let g=child();g=transferWarTerritory(g,['eagle-state'],'pigeon');g=child(copy(g));assert.ok(g.world.countries['eagle-republic-2']);assert.ok(g.history!.countries['eagle-republic-1']);});
test('crisis ID save/load 이후 증가',()=>{let g=startCrisis(fresh(),{kind:'country',id:'sparrow'},'great_storm',95);g=startCrisis(copy(g),{kind:'region',id:'duck-state'},'wetland_drought',85);assert.equal(g.world.crises!.nextId,3);assert.ok(g.world.crises!.activeCrises['crisis-2']);});
test('사망 저장은 계속 ended 월진행 금지',()=>{const g=advanceMonth(fresh(),{...quiet,mortalityRiskOverride:1}),b=copy(g);assert.equal(createSaveData(b,'x').metadata.playStatus,'game_over');assert.equal(b.gameOverReason,'death');assert.equal(advanceMonth(b),b);assert.ok(b.history!.career.endDate);});
test('선거패배 저장은 종료 상태 복원',()=>{const g=fresh();g.player.career.monthsInCurrentTerm=47;const b=copy(advanceMonth(g,{...quiet,electionRandom:()=>.999999}));assert.equal(b.gameOverReason,'election_defeat');assert.equal(advanceMonth(b),b);});
test('잘못된 JSON 오류 안내',()=>assert.throws(()=>deserializeSave('{bad'),/JSON/));
test('미래버전 로드 거부',()=>{const d=createSaveData(fresh(),'x');d.saveVersion=99;assert.throws(()=>deserializeSave(JSON.stringify(d)),/새로운 버전/);});
test('미지원 구버전 로드 거부',()=>{const d=createSaveData(fresh(),'x');d.saveVersion=0;assert.throws(()=>deserializeSave(JSON.stringify(d)),/이전 저장 버전/);});
test('migration 한 단계씩 적용 후검증',()=>{const d=createSaveData(fresh(),'x');saveMigrations[0]=raw=>({...raw as any,saveVersion:1});try{assert.equal(deserializeSave(JSON.stringify({...d,saveVersion:0})).saveVersion,saveConfig.version);}finally{delete saveMigrations[0];}});
test('migration 버전 진행없는 함수 거부',()=>{const d=createSaveData(fresh(),'x');saveMigrations[0]=raw=>raw;try{assert.throws(()=>deserializeSave(JSON.stringify({...d,saveVersion:0})));}finally{delete saveMigrations[0];}});
const badPaths=['game.date.month','game.turn','game.player.career','game.player.ageMonths','game.player.alive','game.player.controlledCountryId','game.random.economy.state','game.policySchedules.country:sparrow.taxNextChangeTurn','game.world.countries.sparrow.economy.gdp','game.world.countries.sparrow.economy.industries.agriculture','game.world.countries.sparrow.fiscal.budgetPolicy','game.world.countries.sparrow.fiscal.taxPolicy','game.world.countries.sparrow.fiscal.revenue','game.world.countries.sparrow.technology.domains.medicine','game.world.countries.sparrow.governance','game.world.countries.sparrow.social','game.world.countries.sparrow.population','game.world.regions.eagle-state.ownerCountryId','game.world.regions.eagle-state.social','game.world.regions.eagle-state.technology','game.world.governmentAI.country:sparrow','game.world.strategicAI','game.world.diplomacy.relations','game.world.warfare.wars','game.world.crises.nextId','game.world.foreignProposals','game.history.timeline','game.history.nextHistoricalEventId','game.events.activeEffects','game.logs','metadata.turn','metadata.gameDate.month','metadata.playStatus','metadata.countryCount','updatedAt'];
for(const path of badPaths)test('손상 자료 필드 거부 '+path,()=>{const d:any=createSaveData(fresh(),'x'),parts=path.split('.');let target=d;for(const p of parts.slice(0,-1))target=target[p];target[parts.at(-1)!]=null;assert.throws(()=>deserializeSave(JSON.stringify(d)));});
for(const value of [NaN,Infinity,new Date(),new Map(),new Set(),()=>0])test('JSON 불가 자료 거부 '+String(value),()=>assert.throws(()=>assertJsonSafe({value})));
test('prototype pollution 키 거부',()=>assert.throws(()=>deserializeSave(serializeSave(createSaveData(fresh(),'x')).replace('"saveVersion":'+saveConfig.version,'"__proto__":{},"saveVersion":'+saveConfig.version))));
test('개발 legacy cadence 저장 거부',()=>assert.throws(()=>copy({...fresh(),policyScheduleEnabled:false})));
test('메타 실제 날짜 불일치 거부',()=>{const d=createSaveData(fresh(),'x');d.metadata.gameDate.month=2;assert.throws(()=>loadGame(d));});
test('사건이 참조하는 존재하지 않는 국가 거부',()=>{const g=pending();g.events.pendingEvent!.jurisdiction={kind:'country',id:'missing'};assert.throws(()=>copy(g));});
test('활성 위기 잘못된 다음 ID 거부',()=>{const g=startCrisis(fresh(),{kind:'country',id:'sparrow'},'great_storm',95);g.world.crises!.nextId=1;assert.throws(()=>copy(g));});
for(const slot of ['manual-1','manual-2','manual-3','manual-4','manual-5','auto','quick'])test('저장 슬롯 CRUD '+slot,async()=>{const s=new MemoryStorage();await saveToSlot(s,slot,fresh());assert.equal((await s.list()).length,1);assert.deepEqual(await loadFromSlot(s,slot),JSON.parse(JSON.stringify(fresh())));await s.remove(slot);assert.equal((await s.list()).length,0);});
test('슬롯 잘못된 ID 거부',async()=>assert.rejects(saveToSlot(new MemoryStorage(),'manual-6',fresh())));
test('비어있는 슬롯 안내',async()=>assert.rejects(loadFromSlot(new MemoryStorage(),'manual-1'),/비어/));
test('quota실패 이전 저장 유지',async()=>{const s=new MemoryStorage();await saveToSlot(s,'manual-1',fresh());const before=s.values.get('manual-1');s.fail=true;await assert.rejects(saveToSlot(s,'manual-1',step(fresh(),2,quiet)));assert.deepEqual(s.values.get('manual-1'),before);});
test('JSON import/export 실제 새 저장 복원',async()=>{const s=new MemoryStorage(),g=child();await importToSlot(s,'manual-2',serializeSave(createSaveData(g,'x')));assert.deepEqual(await loadFromSlot(s,'manual-2'),JSON.parse(JSON.stringify(g)));});
test('손상 파일 가져오기 슬롯 보존',async()=>{const s=new MemoryStorage();await saveToSlot(s,'manual-1',fresh());const old=s.values.get('manual-1');await assert.rejects(importToSlot(s,'manual-1','{}'));assert.deepEqual(s.values.get('manual-1'),old);});
test('수동 여러 슬롯 독립 보존',async()=>{const s=new MemoryStorage();await saveToSlot(s,'manual-1',fresh());await saveToSlot(s,'manual-2',step(fresh(),3,quiet));assert.equal((await loadFromSlot(s,'manual-1')).turn,1);assert.equal((await loadFromSlot(s,'manual-2')).turn,4);});
test('저장 크기 UTF8 bytes 정확',async()=>{const s=new MemoryStorage();const slot=await saveToSlot(s,'quick',fresh());assert.ok(slot.bytes>slot.characters);assert.equal(slot.bytes,new TextEncoder().encode(s.values.get('quick')!.json).length);});
test('연간 January에만 autosave',()=>{const g=step(fresh(),11,quiet),b=step(g,1,quiet);assert.equal(autosaveDue(g,b),true);assert.equal(autosaveDue(null,b),false);assert.equal(autosaveDue(b,b),false);assert.equal(autosaveDue(b,step(b,1,quiet)),false);});
test('120개월 실제 RNG 기본값 저장연속성',()=>{const g=fresh(),a=step(g,120),b=step(copy(step(g,60)),60);assert.equal(a.turn,121);assert.deepEqual(JSON.parse(JSON.stringify(a)),b);});
test('기본 사망/선거 난수도 저장 뒤 동일 종료',()=>{const g=fresh(),a=step(g,120,{}),b=step(copy(step(g,60,{})),60,{});assert.deepEqual(JSON.parse(JSON.stringify(a)),b);});
test('전쟁 위기 신생국 실제 RNG 연속성',()=>{const g=startCrisis(war(child()),{kind:'country',id:'sparrow'},'great_storm',95);assert.deepEqual(JSON.parse(JSON.stringify(step(g,24))),step(copy(step(g,12)),12));});
for(const name of randomStreamNames)test('독립 RNG 단일 스트림 진행 '+name,()=>{const g=fresh(),a=withGameRandom(g,(working,r)=>{r(name)();return working;});for(const other of randomStreamNames)assert.equal(a.random![other].state===g.random![other].state,other!==name);assert.deepEqual(copy(a).random,a.random);});
test('주입 RNG는 해당 저장 스트림 진행 안 함',()=>{const g=fresh(),a=advanceMonth(g,{...quiet,economyRandom:()=>.5,mortalityRandom:()=>.99});assert.deepEqual(a.random!.economy,g.random!.economy);assert.deepEqual(a.random!.mortality,g.random!.mortality);});
test('미결 상태 월거부시 RNG도 불변',()=>{const g=pending();assert.equal(advanceMonth(g),g);});
test('RNG seed deterministic 모든 스트림',()=>assert.deepEqual(fresh().random,fresh().random));
test('상이한 seed 세계 난수 구별',()=>assert.notDeepEqual(fresh().random,createGame('sparrow',undefined,41028).random));

test('세율 시작 허용 변경 후 잠금3',()=>{const g=setControlledTaxPolicy(fresh(),tax(fresh()));assert.equal(g.policySchedules!['country:sparrow'].taxNextChangeTurn,4);assert.throws(()=>setControlledTaxPolicy(g,tax(g)),/3개월/);});
test('세율 2개월잠금 정확3개월 해제',()=>{let g=setControlledTaxPolicy(fresh(),tax(fresh()));g=step(g,2,quiet);assert.throws(()=>setControlledTaxPolicy(g,tax(g)));g=step(g,1,quiet);assert.doesNotThrow(()=>setControlledTaxPolicy(g,tax(g)));});
test('예산 변경 후 정확12개월',()=>{let g=setControlledBudgetPolicy(fresh(),budget(fresh()));assert.equal(g.policySchedules!['country:sparrow'].budgetNextChangeTurn,13);g=step(g,11,quiet);assert.throws(()=>setControlledBudgetPolicy(g,budget(g)),/12개월/);g=step(g,1,quiet);assert.doesNotThrow(()=>setControlledBudgetPolicy(g,budget(g)));});
test('저장 불러오기 세율 잠금 우회불가',()=>{const g=copy(setControlledTaxPolicy(fresh(),tax(fresh())));assert.throws(()=>setControlledTaxPolicy(g,tax(g)),/3개월/);});
test('저장 불러오기 예산 잠금 우회불가',()=>{const g=copy(setControlledBudgetPolicy(fresh(),budget(fresh())));assert.throws(()=>setControlledBudgetPolicy(g,budget(g)),/12개월/);});
test('같은 정책 재적용은 cooldown연장 안함',()=>{const g=setControlledTaxPolicy(fresh(),tax(fresh()));const p=g.world.countries.sparrow.fiscal.taxPolicy;assert.equal(setControlledTaxPolicy(g,p),g);const b=setControlledBudgetPolicy(fresh(),budget(fresh()));assert.equal(setControlledBudgetPolicy(b,b.world.countries.sparrow.fiscal.budgetPolicy),b);});
test('정부별 독립 잠금',()=>{let g=setGovernmentTaxPolicy(fresh(),'region:eagle-state',tax(fresh(),'region:eagle-state'));assert.equal(policyChangeBlock(g,'region:duck-state','tax'),null);assert.ok(policyChangeBlock(g,'region:eagle-state','tax'));g=setGovernmentTaxPolicy(g,'region:duck-state',tax(g,'region:duck-state'));assert.ok(policyChangeBlock(g,'region:duck-state','tax'));});
test('미결 사건 정책 변경 불가 저장후에도',()=>{const g=copy(pending());assert.throws(()=>setControlledTaxPolicy(g,tax(g)),/사건/);assert.throws(()=>setControlledBudgetPolicy(g,budget(g)),/사건/);});
test('심각한 위기 긴급 예산 수정1회 허용',()=>{let g=setControlledBudgetPolicy(fresh(),budget(fresh()));g=startCrisis(g,{kind:'country',id:'sparrow'},'great_storm',95);assert.ok(emergencyBudgetAvailable(g,'country:sparrow'));g=setControlledBudgetPolicy(g,budget(g),true);assert.equal(g.policySchedules!['country:sparrow'].emergencyNextChangeTurn,7);assert.throws(()=>setControlledBudgetPolicy(g,budget(g),true),/6개월/);});
test('위기없으면 긴급 수정 불가',()=>assert.throws(()=>setControlledBudgetPolicy(fresh(),budget(fresh()),true),/긴급/));
test('경미 위기 긴급 수정 불가',()=>{const g=startCrisis(fresh(),{kind:'country',id:'sparrow'},'great_storm',50);assert.equal(emergencyBudgetAvailable(g,'country:sparrow'),false);});
test('다른 정부 위기 긴급 수정 우회불가',()=>{const g=startCrisis(fresh(),{kind:'region',id:'duck-state'},'great_storm',95);assert.equal(emergencyBudgetAvailable(g,'country:sparrow'),false);assert.equal(emergencyBudgetAvailable(g,'region:eagle-state'),false);});
test('전쟁 긴급 수정 가능 및 저장후 cooldown유지',()=>{let g=war();g=setControlledBudgetPolicy(g,budget(g),true);g=copy(g);assert.throws(()=>setControlledBudgetPolicy(g,budget(g),true),/6개월/);});
test('신생국 전정부 일정 상속 새나라 최소6개월',()=>{let g=fresh();g=setGovernmentBudgetPolicy(g,'region:eagle-state',budget(g,'region:eagle-state'));g=child(g);assert.equal(g.policySchedules!['country:eagle-republic-1'].budgetNextChangeTurn,13);assert.throws(()=>setGovernmentBudgetPolicy(g,'country:eagle-republic-1',budget(g,'country:eagle-republic-1')));});
test('신생국 기본 예산6 tax3 지연',()=>{const g=child();assert.equal(g.policySchedules!['country:eagle-republic-1'].budgetNextChangeTurn,7);assert.equal(g.policySchedules!['country:eagle-republic-1'].taxNextChangeTurn,4);assert.equal(g.policySchedules!['region:eagle-state'],undefined);});
test('재통합 지역 일정 상속 및 소멸 일정 제거',()=>{let g=child(fresh(),true);g=applyConflictAction(g,'internal-1','negotiate');g=resolveConflictOutcome(g,'internal-1','negotiated_reintegration');assert.equal(g.policySchedules!['country:eagle-republic-1'],undefined);assert.equal(g.policySchedules!['region:eagle-state'].budgetNextChangeTurn,7);assert.throws(()=>setGovernmentBudgetPolicy(g,'region:eagle-state',budget(g,'region:eagle-state')));});
test('흡수된 행정지역 정부 일정 제거',()=>{const g=transferWarTerritory(child(),['eagle-state'],'sparrow');assert.ok(!g.policySchedules!['country:eagle-republic-1']);assert.ok(!g.policySchedules!['region:eagle-state']);});
test('AI도 세율3개월 API 제한 적용',()=>{let g=fresh();g=setGovernmentTaxPolicy(g,'region:duck-state',tax(g,'region:duck-state'));assert.throws(()=>setGovernmentTaxPolicy(g,'region:duck-state',tax(g,'region:duck-state'),{log:false}),/3개월/);});
test('AI도 연간 예산 제한 동일',()=>{let g=fresh();g=setGovernmentBudgetPolicy(g,'region:duck-state',budget(g,'region:duck-state'));assert.throws(()=>setGovernmentBudgetPolicy(g,'region:duck-state',budget(g,'region:duck-state'),{log:false}),/12개월/);});
test('AI 반복 월판단 잠긴 세율 예산 그대로',()=>{let g=fresh();g=setGovernmentTaxPolicy(g,'region:duck-state',tax(g,'region:duck-state'));g=setGovernmentBudgetPolicy(g,'region:duck-state',budget(g,'region:duck-state'));const r=g.world.regions['duck-state'];const next=updateDomesticAI(g);assert.deepEqual(next.world.regions['duck-state'].fiscal.taxPolicy,r.fiscal.taxPolicy);assert.deepEqual(next.world.regions['duck-state'].fiscal.budgetPolicy,r.fiscal.budgetPolicy);});
test('연구 우선순위 월내 변경 가능 정책잠금 무관',()=>{let g=setControlledBudgetPolicy(fresh(),budget(fresh()));g=setGovernmentResearch(g,'country:sparrow','medicine',null);assert.doesNotThrow(()=>setGovernmentResearch(g,'country:sparrow','medicine',null));});
test('동원 변경 월내 가능 정책잠금 무관',()=>{let g=setControlledTaxPolicy(fresh(),tax(fresh()));g=setMobilizationTarget(g,12);assert.doesNotThrow(()=>setMobilizationTarget(g,10));});

test('600개월 매12개월 save/load stress 실제 RNG/AI',()=>{let g=fresh();for(let i=0;i<600;i++){g=advanceMonth(g,safe);if((i+1)%12===0){const text=serializeSave(createSaveData(g,'stress'));g=deserializeSave(text).game;assert.ok(Object.values(g.world.countries).every(c=>Number.isFinite(c.economy.gdp)));assert.equal(new Set(g.history!.timeline.map(e=>e.id)).size,g.history!.timeline.length);for(const gov of governmentDescriptors(g.world))assert.ok(g.policySchedules![gov.id]);}}assert.equal(g.turn,601);assert.equal(g.history!.yearlySnapshots.length,50);});
test('2400개월 전체 저장 크기와 load 후120개월',()=>{let g=step(fresh(),2400);assert.equal(g.turn,2401);const text=serializeSave(createSaveData(g,'long'));const h=JSON.stringify(g.history);console.log('SAVE_200_YEARS',JSON.stringify({characters:text.length,bytes:new TextEncoder().encode(text).length,historyCharacters:h.length,historyBytes:new TextEncoder().encode(h).length,countries:Object.keys(g.world.countries).length,snapshots:g.history!.yearlySnapshots.length}));g=step(deserializeSave(text).game,120);assert.equal(g.turn,2521);assert.equal(g.history!.yearlySnapshots.length,210);assert.equal(new Set(g.history!.timeline.map(e=>e.id)).size,g.history!.timeline.length);copy(g);});



