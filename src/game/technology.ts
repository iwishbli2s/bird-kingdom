import { collectHistory } from './history';
import { controlledGovernmentId, getGovernment } from './government';
import { technologyConfig as config, technologyDomains, initialTechnologyLevels, researchPriorities } from './technologyConfig';
import { technologyDefinitions, technologyDefinition } from './technologyDefinitions';
import { aggregateTechnologyStates, getTechnologyBonuses } from './technologyEffects';
import { countriesAtWar } from './military';
import { hasSanctions } from './diplomacy';
import { controlledRegionId, countryInfo, regionInfo } from './runtime';
import { appendGameLog } from './logs';
import type { CountryRuntimeState, GameState, Jurisdiction, TechnologyDomain, TechnologyState, WorldState } from './types';
const clamp=(n:number,min=0,max=100)=>Math.min(max,Math.max(min,n));
export function researchPriority(id:string,primary?:string):TechnologyDomain[]{const key=primary??id.split('-')[0];return researchPriorities[key]??researchPriorities.sparrow;}
export function createTechnologyState(id:string):TechnologyState {
 const levels=initialTechnologyLevels[id]??initialTechnologyLevels.sparrow;
 const unlocked=technologyDefinitions.filter(t=>t.resultLevel<=levels[technologyDomains.indexOf(t.domain)]).map(t=>t.id);
 return fillResearchSlots({domains:Object.fromEntries(technologyDomains.map((d,i)=>[d,{level:levels[i],progress:0,currentResearchId:null}])) as TechnologyState['domains'],unlockedTechnologies:unlocked,baselineUnlockedTechnologies:[...unlocked],researchCapacity:0,innovationEfficiency:0,researchProgress:{}},researchPriority(id));
}
export function researchBlock(t:TechnologyState,id:string):string|null {
 const def=technologyDefinition(id);if(t.unlockedTechnologies.includes(id))return '이미 확보한 기술입니다.';
 if(t.domains[def.domain].level<def.requiredLevel)return '분야 수준 Lv.'+def.requiredLevel+'이 필요합니다.';
 if(def.prerequisites.some(id=>!t.unlockedTechnologies.includes(id)))return '선행기술: '+def.prerequisites.filter(id=>!t.unlockedTechnologies.includes(id)).map(id=>technologyDefinition(id).name).join(', ');
 if(!t.domains[def.domain].currentResearchId&&technologyDomains.filter(d=>t.domains[d].currentResearchId).length>=config.slots)return '연구 슬롯 3개가 모두 사용 중입니다.';
 return null;
}
export function fillResearchSlots(t:TechnologyState,priority:TechnologyDomain[]):TechnologyState {
 const next=structuredClone(t);for(const domain of priority){if(next.domains[domain].currentResearchId)continue;if(technologyDomains.filter(d=>next.domains[d].currentResearchId).length>=config.slots)break;const def=technologyDefinitions.find(d=>d.domain===domain&&!researchBlock(next,d.id));if(def)next.domains[domain]={...next.domains[domain],currentResearchId:def.id,progress:next.researchProgress[def.id]??0};}return next;
}
export function calculateInnovationEfficiency(r:CountryRuntimeState,t:TechnologyState):number {return clamp((r.social?.education??50)*.65+(r.governance?.stability??50)*.25+t.domains.information.level*1);}
export function calculateResearchCapacity(r:CountryRuntimeState,t:TechnologyState=r.technology!):number {
 const budget=Math.max(0,r.fiscal.budgetPolicy.research),education=r.social?.education??50,stability=r.governance?.stability??50;
 const base=(4+budget*4+Math.min(15,Math.sqrt(Math.max(0,r.economy.gdp)/100)*2)+Math.min(18,Math.log1p(Math.max(0,r.economy.industries.advanced.output))*2))*(.25+education/100)*(.7+stability*.006);
 const pressure=1-Math.min(.35,Math.max(0,(r.military?.mobilization??15)-20)*.003+(r.military?.fatigue??0)*.001);
 return clamp(base*pressure*(1+getTechnologyBonuses(t).research));
}
export function synchronizeTechnology(world:WorldState):WorldState {
 const regions=Object.fromEntries(Object.entries(world.regions).map(([id,r])=>{const t=r.technology??createTechnologyState(id);return [id,{...r,technology:r.technology?t:{...t,researchCapacity:calculateResearchCapacity(r,t),innovationEfficiency:calculateInnovationEfficiency(r,t)}}];}));
 const countries=Object.fromEntries(Object.entries(world.countries).map(([id,r])=>{const members=Object.values(regions).filter(x=>x.ownerCountryId===id&&x.simulationRole!=='administrative');return [id,{...r,technology:r.simulationMode==='aggregate_regions'?aggregateTechnologyStates(members):r.technology??{...createTechnologyState(id),researchCapacity:calculateResearchCapacity(r,createTechnologyState(id)),innovationEfficiency:calculateInnovationEfficiency(r,createTechnologyState(id))}}];}));return {...world,regions,countries};
}
export function technologyDiffusion(world:WorldState,owner:string,domain:TechnologyDomain,level:number):number {
 let best=0;for(const r of Object.values(world.diplomacy?.relations??{})){if(r.countryA!==owner&&r.countryB!==owner)continue;const other=r.countryA===owner?r.countryB:r.countryA;if(hasSanctions(r)||countriesAtWar(world,owner,other)||r.tradeLevel<60||r.relations<40||!r.migratoryPassageAgreement)continue;if((world.countries[other]?.technology?.domains[domain].level??0)>=level+2)best=config.diffusion;}return best;
}
export function progressResearch(t:TechnologyState,points:number,bonus:(d:TechnologyDomain)=>number=()=>0):{technology:TechnologyState;unlocked:string[]} {
 if(!Number.isFinite(points)||points<0)throw new RangeError('연구점수는 유한한 양수 또는 0입니다.');const next=structuredClone(t),active=technologyDomains.filter(d=>t.domains[d].currentResearchId),unlocked:string[]=[];
 for(const domain of active){const id=t.domains[domain].currentResearchId!,def=technologyDefinition(id);const amount=(t.researchProgress[id]??t.domains[domain].progress)+points/active.length/def.researchCost*100*(1+bonus(domain));
 if(amount>=100){next.unlockedTechnologies=[...new Set([...next.unlockedTechnologies,id])];next.researchProgress[id]=100;next.domains[domain]={level:Math.max(next.domains[domain].level,def.resultLevel),progress:0,currentResearchId:null};unlocked.push(id);const following=technologyDefinitions.find(d=>d.domain===domain&&!researchBlock(next,d.id));if(following)next.domains[domain]={...next.domains[domain],currentResearchId:following.id,progress:next.researchProgress[following.id]??0};}
 else {next.researchProgress[id]=clamp(amount);next.domains[domain].progress=clamp(amount);}}
 // 완료 후 잉여 점수는 소멸합니다. 한 달에 연쇄 해금하지 않습니다.
 return {technology:next,unlocked};
}
export function setGovernmentResearch(game:GameState,governmentId:string,domain:TechnologyDomain,id:string|null,options:{log?:boolean}={}):GameState {
 const isPlayer=governmentId===controlledGovernmentId(game);
 if(game.gameOverReason||!game.player.alive||(isPlayer&&(game.events.pendingEvent||game.world.warfare?.allyRequests.some(r=>r.status==='pending'&&r.allyCountryId===game.player.controlledCountryId))))throw new Error('현재 연구를 변경할 수 없습니다.');
 const descriptor=getGovernment(game.world,governmentId);if(descriptor.federal)throw new Error('집계 정부에는 독립 연구 슬롯이 없습니다.');
 const j=descriptor.jurisdiction,r=j.kind==='region'?game.world.regions[j.id]:game.world.countries[j.id],t=structuredClone(r.technology!);
 if(id){if(technologyDefinition(id).domain!==domain)throw new Error('분야가 일치하지 않습니다.');const block=researchBlock(t,id);if(block)throw new Error(block);}
 t.domains[domain]={...t.domains[domain],currentResearchId:id,progress:id?t.researchProgress[id]??0:0};
 const world=j.kind==='region'?{...game.world,regions:{...game.world.regions,[j.id]:{...game.world.regions[j.id],technology:t}}}:{...game.world,countries:{...game.world.countries,[j.id]:{...game.world.countries[j.id],technology:t}}};
 const next={...game,world:synchronizeTechnology(world)};return options.log===false?next:appendGameLog(next,{category:'political',type:'event',message:id?'우선 연구 지정: '+technologyDefinition(id).name:'연구 중단 · 누적 진척은 보존됩니다.'});
}
function updateWorldTechnologyCore(game:GameState):GameState {
 const snapshot=synchronizeTechnology(game.world),playerRegion=controlledRegionId(game);let world=snapshot,next=game;
 const jurisdictions:Jurisdiction[]=[...Object.values(snapshot.regions).filter(r=>r.simulationRole!=='administrative').map(r=>({kind:'region' as const,id:r.id})),...Object.values(snapshot.countries).filter(r=>r.simulationMode!=='aggregate_regions').map(r=>({kind:'country' as const,id:r.id}))];
 for(const j of jurisdictions){const r=j.kind==='region'?snapshot.regions[j.id]:snapshot.countries[j.id],owner=j.kind==='region'?snapshot.regions[j.id].ownerCountryId:j.id,isPlayer=j.kind==='region'?j.id===playerRegion:!playerRegion&&j.id===game.player.controlledCountryId;
 const t=isPlayer?r.technology!:fillResearchSlots(r.technology!,researchPriority(j.id,j.kind==='region'?snapshot.regions[j.id].regionIdentity?.primarySpeciesId:snapshot.countries[j.id].identity?.primarySpeciesId));
 const runtime={...r,military:snapshot.countries[owner].military},researchCapacity=calculateResearchCapacity(runtime,t),innovationEfficiency=calculateInnovationEfficiency(runtime,t);
 const result=progressResearch({...t,researchCapacity,innovationEfficiency},researchCapacity,d=>technologyDiffusion(snapshot,owner,d,t.domains[d].level));
 world=j.kind==='region'?{...world,regions:{...world.regions,[j.id]:{...world.regions[j.id],technology:result.technology}}}:{...world,countries:{...world.countries,[j.id]:{...world.countries[j.id],technology:result.technology}}};
 for(const id of result.unlocked){const definition=technologyDefinition(id),name=j.kind==='region'?regionInfo(game,j.id)!.name:countryInfo(game,j.id).name;const entry={id:'technology-'+game.turn+'-'+j.id+'-'+id,date:{...game.date},jurisdictionId:j.id,jurisdictionName:name,technologyId:id,technologyName:definition.name};world={...world,technologyHistory:[entry,...(world.technologyHistory??[])]};next={...next,events:{...next.events,history:[{id:entry.id,eventId:'technology-discovery',date:{...game.date},turn:game.turn,jurisdiction:{...j},jurisdictionName:name,severity:1,title:definition.name+' 실용화',category:'economy',choiceId:'completed',choiceLabel:'연구 완료',playerChoice:isPlayer},...next.events.history]}};next=appendGameLog(next,{category:'event',type:'event',message:name+'이 '+definition.name+' 기술을 실용화했습니다.'});}}
 return {...next,world:synchronizeTechnology(world)};
}

export function setResearch(game:GameState,domain:TechnologyDomain,id:string|null):GameState {return setGovernmentResearch(game,controlledGovernmentId(game),domain,id);}

export function updateWorldTechnology(...args:Parameters<typeof updateWorldTechnologyCore>):GameState { return collectHistory(args[0],updateWorldTechnologyCore(...args)); }

