import {initializeAnnualReports,collectAnnualReport} from './annual';
import {updateStateRelations,updateStatePoliticalAI} from './stateRelations';
import {updateNPCFederalStrategy} from './federalStrategy';
import {createPlayerOrigin,emptyAchievementState,withAchievementMonth} from './achievements';
import {initialEconomyProfiles} from './economyConfig';
import {scheduleTutorial,tutorialAdvanceBlock} from './tutorial';
import {validateDifficulty,jurisdictionDifficulty,type Difficulty} from './difficulty';
import {createGameRandom,withGameRandom} from './randomState';
import {synchronizePolicySchedules} from './policySchedule';
import { collectHistory } from './history';
import { updateDomesticAI } from './ai';
import { synchronizeGovernmentAI } from './aiState';
import { getCrisisIndustryModifiers, updateWorldCrises, applyCrisisSpeciesPressure, updateLeaderRisk } from './crisis';
import { updateWorldTechnology } from './technology';
import { getTechnologyIndustryModifiers } from './technologyEffects';
import { updateCasusBelli } from './casusBelli';
import { updateWorldMilitary } from './military';
import { updateWorldWars } from './warfare';
import { applyMobilizationCosts } from './warfareEffects';
import { updateWorldDiplomacy } from './diplomacy';
import { getDiplomaticTradeModifiers } from './diplomacyEffects';
import { updateWorldConflicts } from './conflict';
import { updateWorldSecession } from './secession';
import { createEventState, generateWorldEvents, tickEventState } from './events';
import { advancePoliticalCareer, createPoliticalCareer, resolveElection } from './election';
import { updateWorldGovernance } from './governance';
import { updateWorldSocial } from './social';
import { countries, regions } from './data';
import { appendFirstBorrowingLogs, appendGameLog } from './logs';
import { createInitialWorldState } from './world';
import { updateWorldEconomy } from './economy';
import { getTaxIndustryModifiers, updateWorldFiscal } from './fiscal';
import { combineIndustryModifiers, getBudgetIndustryModifiers } from './budget';
import { updateWorldPopulation } from './population';
import { updateWorldSpeciesPolitics } from './speciesPolitics';
import { createRandomSeed, createSeededRandom } from './random';
import type { StartingCountryId, GameDate, GameState, PlayerState, RegionId } from './types';
import { calculateBaseMonthlyMortalityRisk, calculateMonthlyMortalityRisk, rollPlayerDeath, STARTING_AGE_MONTHS, validateMortalityRisk } from './mortality';

export function formatDate(date: GameDate): string { return `${date.year}년 ${date.month}월`; }

function createGameCore(countryId: StartingCountryId, regionId: RegionId | null = null, seed?:number, difficulty:Difficulty='normal'): GameState {
  validateDifficulty(difficulty);
  const country = countries.find((item) => item.id === countryId);
  if (!country) throw new Error('유효하지 않은 국가입니다.');
  if (country.regionIds.length > 0 && (!regionId || !country.regionIds.includes(regionId))) {
    throw new Error('연방에 속한 주를 선택해야 합니다.');
  }
  if (country.regionIds.length === 0 && regionId !== null) throw new Error('공화국은 국가 전체를 운영합니다.');
  if (regionId && !regions.some((region) => region.id === regionId && region.initialOwnerCountryId === countryId)) {
    throw new Error('유효하지 않은 주입니다.');
  }
  const risk = calculateBaseMonthlyMortalityRisk(STARTING_AGE_MONTHS);
  const game: GameState = {
    difficulty,random:createGameRandom(seed),policyScheduleEnabled:true,date: { year: 2030, month: 1 }, turn: 1, gameOverReason: null, world: {...createInitialWorldState(),federalPolitics:{}}, logs: [], events: createEventState(),
    player: {
      leaderRisk:{situationalRisk:0,disasterExposure:0,diseaseExposure:0,conflictExposure:0,politicalRisk:0,mortalityModifierLastMonth:0,factors:[]},temporaryLeaderRiskModifiers:[],
      career: createPoliticalCareer(regionId ? 'governor' : 'president'),
      controlledCountryId: countryId, controlledRegionId: regionId, ageMonths: STARTING_AGE_MONTHS,
      baseMonthlyMortalityRisk: risk, currentMortalityRisk: risk, alive: true, deathDate: null,
    },
  };
  return appendGameLog({...game,world:synchronizeGovernmentAI(game.world)}, { message: '새로운 정부 운영이 시작되었습니다.', category: 'system', type: 'start' });
}

export function nextMonth(date: GameDate): GameDate {
  return date.month === 12 ? { year: date.year + 1, month: 1 } : { year: date.year, month: date.month + 1 };
}

export interface AdvanceMonthOptions {
  strategicAI?:boolean;
  /** Test-only observer routing; no player-specific information enters strategic scoring. */
  autonomousWorld?:boolean;
  /** Isolated regression/benchmark mode; normal games always enable domestic AI. */
  domesticAI?:boolean;
  crisisRandom?:()=>number;
  warRandom?:()=>number;
  mortalityRandom?: () => number;
  economyRandom?: () => number;
  electionRandom?: () => number;
  eventOccurrenceRandom?: () => number;
  eventOutcomeRandom?: () => number;
  secessionRandom?: () => number;
  conflictRandom?: () => number;
  /** 기존 사망 RNG API 호환. 경제 계산에는 사용하지 않습니다. */
  random?: () => number;
  mortalityRiskOverride?: number;
}

export function advanceGameDate(game: GameState): GameState {
  return { ...game, date: nextMonth(game.date), turn: game.turn + 1 };
}

export function updatePlayerAge(player: PlayerState): PlayerState {
  return { ...player, ageMonths: player.ageMonths + 1 };
}

export function resolvePlayerMortality(game: GameState, options: AdvanceMonthOptions = {}): GameState {
  if (!game.player.alive || game.gameOverReason) return game;
  const baseMonthlyMortalityRisk = calculateBaseMonthlyMortalityRisk(game.player.ageMonths);
  const currentMortalityRisk = validateMortalityRisk(options.mortalityRiskOverride ?? calculateMonthlyMortalityRisk(game));
  const died = rollPlayerDeath(currentMortalityRisk, options.mortalityRandom ?? options.random);
  return { ...game, gameOverReason: died ? 'death' : null, player: { ...game.player, baseMonthlyMortalityRisk, currentMortalityRisk,
    alive: !died, deathDate: died ? { ...game.date } : null } };
}

// 각 단계는 입력을 변경하지 않고 다음 상태를 반환합니다.
function advanceMonthCore(game: GameState, options: AdvanceMonthOptions = {}): GameState {
  if (!game.player.alive || game.gameOverReason) return game;
  if (game.events.pendingEvent||!options.autonomousWorld&&(game.world.foreignProposals?.some(p=>p.targetId===game.player.controlledCountryId)||game.world.warfare?.allyRequests.some(r=>r.status==='pending'&&r.allyCountryId===game.player.controlledCountryId))) return game;
  let next = advanceGameDate(tickEventState(game));
  next = { ...next, player: updatePlayerAge(next.player) };
  const economyRandom = options.economyRandom ?? createSeededRandom(createRandomSeed());
  const previousWorld = next.world;
  // 연방의 세율·예산은 자체 재정 결산에만 사용합니다. 주 경제에 추가 적용하지 않습니다.
  // 각 주와 독립 경제주체는 자신의 현재 세율·예산으로 경제 modifier를 생성합니다.
  next = { ...next, world: updateWorldEconomy(previousWorld, {
    random: economyRandom, referenceSharesFor:(kind,id)=>initialEconomyProfiles[id]?.shares??initialEconomyProfiles[kind==='region'?(next.world.countries[next.world.regions[id].ownerCountryId]?.identity?.originCountryId??next.world.regions[id].ownerCountryId):(next.world.countries[id]?.identity?.originCountryId??id)]?.shares, shockMultiplierFor:(kind,id)=>jurisdictionDifficulty(next,{kind,id}).economicShock, modifiersFor: (kind, id) => {
      const fiscal = previousWorld[kind === 'country' ? 'countries' : 'regions'][id].fiscal;
      return combineIndustryModifiers(getCrisisIndustryModifiers(previousWorld,{kind,id},jurisdictionDifficulty(next,{kind,id}).crisisDamage),getTaxIndustryModifiers(fiscal), getBudgetIndustryModifiers(fiscal),getDiplomaticTradeModifiers(previousWorld,kind==='country'?id:previousWorld.regions[id].ownerCountryId),getTechnologyIndustryModifiers(previousWorld[kind==='country'?'countries':'regions'][id].technology));
    },
  }) };
  next = { ...next, world: updateWorldFiscal(next.world) };
  next=updateWorldTechnology(next);
  next=updateWorldCrises(next,options.crisisRandom??createSeededRandom(createRandomSeed()));
  // 인구는 월 진입 시점의 사회 상태를 읽고, 종족정치는 아래에서 새 사회 상태를 읽습니다.
  next = { ...next, world: updateWorldPopulation(next.world,previousWorld,(kind,id)=>jurisdictionDifficulty(next,{kind,id}).crisisDamage) };
  next = { ...next, world: updateWorldSocial(next.world,previousWorld,(kind,id)=>jurisdictionDifficulty(next,{kind,id}).crisisDamage) };
  next = { ...next, world: updateWorldSpeciesPolitics(next.world) };
  next={...next,world:applyCrisisSpeciesPressure(next.world,previousWorld)};
  // 종족정치는 이전 통합도를 읽었습니다. 새 거버넌스는 다음 달에 피드백합니다.
  next = { ...next, world: updateWorldGovernance(next.world) };
  next = updateStateRelations(next);
  next = updateWorldSecession(next);
  next = updateWorldConflicts(next,options.conflictRandom);
  next = updateCasusBelli(next);
  next = {...next,world:applyMobilizationCosts(updateWorldMilitary(next.world))};
  next = updateWorldWars(next,options.warRandom);
  next = {...next,world:updateWorldDiplomacy(next.world,options.strategicAI!==false)};
  next = updateLeaderRisk(next);
  next = advancePoliticalCareer(next);
  next = resolveElection(next, options.electionRandom);
  const election = next.player.career.lastElection;
  if (election?.turn === next.turn) next = appendGameLog(next, {
    category: 'political', type: 'event', message: election.won ? `재선에 성공하여 제${next.player.career.termNumber}기 임기를 시작했습니다.` : '선거에서 패배하여 집권이 종료되었습니다.',
  });
  if (!next.gameOverReason) next = resolvePlayerMortality(next, options);
  next = appendFirstBorrowingLogs(next, game.world);
  if (next.gameOverReason === 'election_defeat') return next;
  next = appendGameLog(next, {
    message: next.gameOverReason === 'death' ? '플레이어가 사망하여 정부 운영이 종료되었습니다.' : '한 달이 경과했습니다.',
    category: 'system', type: next.gameOverReason === 'death' ? 'death' : 'month',
  });
  if(next.gameOverReason)return next;
  next=generateWorldEvents(next,options);
  if(options.domesticAI!==false)next=updateDomesticAI(next,{autonomousWorld:options.autonomousWorld});
  if(options.strategicAI!==false)next=updateStatePoliticalAI(next,options.autonomousWorld);
  if(options.strategicAI!==false)next=updateNPCFederalStrategy(next,options.autonomousWorld);
  return options.strategicAI===false?next:updateStrategicAI(next,{autonomousWorld:options.autonomousWorld});
}
import { updateStrategicAI } from './strategicAI';

export function createGame(...args:Parameters<typeof createGameCore>):GameState { const next=createGameCore(...args); const archived=synchronizePolicySchedules(next,collectHistory(next,next)); return {...archived,player:{...archived.player,origin:createPlayerOrigin(archived)},achievements:emptyAchievementState(archived),annual:initializeAnnualReports(archived)}; }

export function advanceMonth(...args:Parameters<typeof advanceMonthCore>):GameState { if(tutorialAdvanceBlock(args[0])||!args[0].player.alive||args[0].gameOverReason||args[0].events.pendingEvent||!args[1]?.autonomousWorld&&(args[0].world.foreignProposals?.some(p=>p.targetId===args[0].player.controlledCountryId)||args[0].world.warfare?.allyRequests.some(r=>r.status==='pending'&&r.allyCountryId===args[0].player.controlledCountryId)))return args[0];
return withGameRandom(args[0],(g,r)=>{const o=args[1]??{};const next=withAchievementMonth(()=>advanceMonthCore(g,{...o,economyRandom:o.economyRandom??r('economy'),mortalityRandom:o.mortalityRandom??o.random??r('mortality'),electionRandom:o.electionRandom??r('election'),eventOccurrenceRandom:o.eventOccurrenceRandom??r('eventOccurrence'),eventOutcomeRandom:o.eventOutcomeRandom??r('eventOutcome'),secessionRandom:o.secessionRandom??r('secession'),conflictRandom:o.conflictRandom??r('conflict'),warRandom:o.warRandom??r('war'),crisisRandom:o.crisisRandom??r('crisis')}));return collectAnnualReport(g,synchronizePolicySchedules(g,collectHistory(g,scheduleTutorial(next),true)));}); }





