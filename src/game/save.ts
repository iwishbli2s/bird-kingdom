import {initialStateRelations,statePairKey,federalStateIds,isActiveFederalState} from './stateRelationsModel';
import {migrateConflictSave} from './conflictMigration';
import {casusBelliLabels} from './warfareConfig';
import {migrateAchievementState} from './achievements';
import {validateAchievementFields} from './achievementValidation';
import {validateDifficulty} from './difficulty';
import {validateTutorial} from './tutorial';
import { regionInfo } from './runtime';
import { getEventDefinition } from './events';
import { governmentDescriptors } from './government';
import { historicalCountryName } from './history';
import { randomStreamNames } from './randomState';
import type { GameState, GameDate, WorldState } from './types';
import type { SaveGameData } from './saveTypes';
export const saveConfig = { version: 6, manualSlots: 5, autosaveSlot: 'auto', quickSlot: 'quick', maxImportBytes: 64 * 1024 * 1024 } as const;
function fail(message = '이 저장 파일을 불러올 수 없습니다.'): never { throw new Error(message); }
function obj(v: unknown): asserts v is Record<string, any> { if (!v || typeof v !== 'object' || Array.isArray(v))
    fail(); }
function num(v: unknown, min = -Infinity, max = Infinity) { if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max)
    fail(); }
function integer(v: unknown, min = 0, max = Number.MAX_SAFE_INTEGER) { num(v, min, max); if (!Number.isInteger(v))
    fail(); }
function str(v: unknown) { if (typeof v !== 'string')
    fail(); }
function arr(v: unknown): asserts v is any[] { if (!Array.isArray(v))
    fail(); }
function date(d: unknown): asserts d is GameDate { obj(d); integer(d.year, 1); integer(d.month, 1, 12); }
/** Reject unsupported objects before JSON can silently turn them into strings/null. */
export function assertJsonSafe(value: unknown, depth = 0): void { if (depth > 100)
    fail('저장 자료의 구조가 너무 깊습니다.'); if (value === null || typeof value === 'string' || typeof value === 'boolean')
    return; if (typeof value === 'number') {
    num(value);
    return;
} if (Array.isArray(value)) {
    for (const v of value)
        assertJsonSafe(v, depth + 1);
    return;
} if (typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    for (const [key, v] of Object.entries(value)) {
        if (['__proto__', 'prototype', 'constructor'].includes(key))
            fail();
        if (v !== undefined)
            assertJsonSafe(v, depth + 1);
    }
    return;
} fail('저장할 수 없는 자료가 포함되어 있습니다.'); }
export function validateGameState(raw: unknown): asserts raw is GameState {
    obj(raw);
    date(raw.date);validateDifficulty(raw.difficulty);
    if(raw.tutorial!==undefined){validateTutorial(raw.tutorial);if(raw.tutorial.startedTurn>raw.turn)fail();}
    integer(raw.turn, 1);
    obj(raw.player);
    obj(raw.world);
    obj(raw.world.countries);
    obj(raw.world.regions);
    if(raw.world.federalPolitics!==undefined){
      obj(raw.world.federalPolitics);
      for(const [id,p] of Object.entries(raw.world.federalPolitics) as [string,any][]){
        if(!raw.world.regions[id])fail();obj(p);integer(p.nextActionTurn,0,raw.turn+6);arr(p.history);if(p.history.length>80)fail();
        const seen=new Set<string>();let lastTurn=0;
        for(const h of p.history){obj(h);str(h.id);str(h.parentCountryId);if(h.stateId!==id||h.parentCountryId!=='pigeon'||seen.has(h.id))fail();seen.add(h.id);date(h.date);integer(h.turn,1,raw.turn);if(h.turn<=lastTurn)fail();lastTurn=h.turn;
          if(!['criticize','autonomy','defy','renegotiate','referendum','confront','declare'].includes(h.action)||!['limited','substantial','maximum'].includes(h.level)||!['ignore','negotiate','partial_concession','accept','political_pressure','economic_pressure','hardline_rejection'].includes(h.response))fail();
        }
      }
    }
    if(raw.world.statePolitics===undefined)fail();
    if(raw.world.statePolitics!==undefined){
      const p=raw.world.statePolitics;obj(p);obj(p.relations);arr(p.blocs);obj(p.actionCooldowns);
      if(Object.keys(p.relations).length!==6)fail();
      for(const [key,r] of Object.entries(p.relations) as [string,any][]){obj(r);if(key!==statePairKey(r.stateAId,r.stateBId)||r.stateAId>=r.stateBId||typeof r.active!=='boolean'||r.active!==(isActiveFederalState(raw.world as WorldState,r.stateAId)&&isActiveFederalState(raw.world as WorldState,r.stateBId)))fail();
        for(const field of ['relations','rivalry','cooperation'])num(r[field],0,100);integer(r.actionCooldownUntilTurn,0,raw.turn+3);arr(r.history);arr(r.mediations);if(r.history.length>48||r.mediations.length>48)fail();
        const ids=new Set<string>();for(const h of r.history){obj(h);str(h.id);if(ids.has(h.id)||!([r.stateAId,r.stateBId].includes(h.actorId)&&[r.stateAId,r.stateBId].includes(h.targetId))||h.actorId===h.targetId)fail();ids.add(h.id);date(h.date);integer(h.turn,1,raw.turn);if(!['criticize','counter_policy','mediate','statement','joint_autonomy','cooperate','negotiate'].includes(h.action)||!['ignore','rebut','counterattack','mediation','cooperation','de_escalation'].includes(h.response)||typeof h.accepted!=='boolean')fail();arr(h.reasonCodes);for(const code of h.reasonCodes)str(code);}
        const mediationIds=new Set<string>();for(const m of r.mediations){obj(m);str(m.id);if(mediationIds.has(m.id))fail();mediationIds.add(m.id);date(m.date);integer(m.turn,1,raw.turn);if(!['neutral_mediation','favor_state_a','favor_state_b','ignore','compromise'].includes(m.outcome)||m.favoredStateId!==(m.outcome==='favor_state_a'?r.stateAId:m.outcome==='favor_state_b'?r.stateBId:null))fail();}
      }
      const blocIds=new Set<string>();for(const b of p.blocs){obj(b);str(b.id);if(blocIds.has(b.id))fail();blocIds.add(b.id);if(!['autonomy','fiscal','security','economic','anti_rival'].includes(b.purpose)||typeof b.active!=='boolean')fail();arr(b.memberStateIds);arr(b.originalMemberStateIds);for(const list of [b.memberStateIds,b.originalMemberStateIds])if(new Set(list).size!==list.length||list.some((id:any)=>!federalStateIds.includes(id)))fail();if(b.originalMemberStateIds.length<2||b.memberStateIds.some((id:any)=>!b.originalMemberStateIds.includes(id)))fail();integer(b.createdTurn,1,raw.turn);integer(b.expiresTurn,b.createdTurn+1,b.createdTurn+36);num(b.cohesion,0,100);if(b.endReason!==null)str(b.endReason);if(b.rivalStateId!==null&&(!federalStateIds.includes(b.rivalStateId)||b.memberStateIds.includes(b.rivalStateId)))fail();if(b.active&&(b.memberStateIds.length<2||b.memberStateIds.some((id:any)=>!isActiveFederalState(raw.world as WorldState,id))||b.purpose==='anti_rival'&&(!b.rivalStateId||!isActiveFederalState(raw.world as WorldState,b.rivalStateId))))fail();}
      for(const [id,turn] of Object.entries(p.actionCooldowns)){if(!isActiveFederalState(raw.world as WorldState,id))fail();integer(turn,0,raw.turn+3);}
    }
    obj(raw.events);
    arr(raw.logs);
    arr(raw.events.history);
    arr(raw.events.activeEffects);
    obj(raw.events.cooldowns);
    obj(raw.player.career);
    validateAchievementFields(raw as unknown as GameState);
    integer(raw.player.ageMonths);
    if (typeof raw.player.alive !== 'boolean')
        fail();
    str(raw.player.controlledCountryId);
    if (![null, 'death', 'election_defeat', 'state_defeat'].includes(raw.gameOverReason))
        fail();
    if (!raw.world.countries[raw.player.controlledCountryId])
        fail();
    if (raw.player.controlledRegionId !== null && !raw.world.regions[raw.player.controlledRegionId])
        fail();
    num(raw.player.baseMonthlyMortalityRisk, 0, 1);
    num(raw.player.currentMortalityRisk, 0, 1);
    if (raw.player.deathDate !== null)
        date(raw.player.deathDate);
    if (!['president', 'governor'].includes(raw.player.career.office))
        fail();
    arr(raw.player.career.history);
    for (const k of ['termNumber', 'monthsInCurrentTerm', 'termLengthMonths', 'electionsWon', 'electionsLost'])
        integer(raw.player.career[k]);
    if (raw.gameOverReason === 'death' && (raw.player.alive || raw.player.deathDate === null) || raw.gameOverReason === null && !raw.player.alive)
        fail();
    obj(raw.random);
    for (const id of randomStreamNames) {
        obj(raw.random[id]);
        integer(raw.random[id].seed, 0, 4294967295);
        integer(raw.random[id].state, 0, 4294967295);
    }
    obj(raw.policySchedules);
    if (raw.policyScheduleEnabled === false)
        fail('개발용 정책 규칙을 사용한 자료는 저장할 수 없습니다.');
    const numeric = (r: any, keys: string[]) => { obj(r); for (const key of keys)
        num(r[key]); };
    const fiscal = (f: any) => { numeric(f, ['treasury', 'debt', 'monthlyBalance', 'annualInterestRate']); for (const k of ['taxPolicy', 'baselineTaxPolicy'])
        numeric(f[k], ['incomeTaxRate', 'corporateTaxRate', 'consumptionTaxRate']); for (const k of ['budgetPolicy', 'baselineBudgetPolicy'])
        numeric(f[k], ['defense', 'education', 'healthcare', 'welfare', 'security', 'industrySupport', 'infrastructure', 'research']); numeric(f.revenue, ['incomeTax', 'corporateTax', 'consumptionTax', 'total']); numeric(f.expenditure, ['programTotal', 'interest', 'total']); obj(f.expenditure.categories); };
    const technology = (t: any) => { obj(t); obj(t.domains); for (const k of ['agriculture', 'industry', 'infrastructure', 'medicine', 'information', 'military']) {
        numeric(t.domains[k], ['level', 'progress']);
        if (t.domains[k].currentResearchId !== null)
            str(t.domains[k].currentResearchId);
    } arr(t.unlockedTechnologies); numeric(t, ['researchCapacity', 'innovationEfficiency']); };
    const economy = (e: any) => { numeric(e, ['gdp', 'growth', 'unemployment', 'inflation', 'cycle']); for (const k of ['agriculture', 'manufacturing', 'services', 'advanced', 'defense'])
        numeric(e.industries[k], ['output', 'productivity']); };
    for (const [id, c] of Object.entries(raw.world.countries) as [
        string,
        any
    ][]) {
        if (c.id !== id)
            fail();
        numeric(c.economy, ['gdp', 'growth', 'unemployment', 'inflation']);
        obj(c.economy.industries);
        numeric(c.fiscal, ['treasury', 'debt', 'monthlyBalance']);
        numeric(c.fiscal.taxPolicy, ['incomeTaxRate', 'corporateTaxRate', 'consumptionTaxRate']);
        obj(c.fiscal.budgetPolicy);
        numeric(c.population, ['total']);
        obj(c.population.species);
        obj(c.military);
        obj(c.technology);
        obj(c.technology.domains);
        arr(c.technology.unlockedTechnologies);
        economy(c.economy);
        fiscal(c.fiscal);
        technology(c.technology);
        if (c.simulationMode !== 'aggregate_regions') {
            numeric(c.governance, ['approval', 'stability', 'integration']);
            numeric(c.social, ['livingStandard', 'education', 'healthcare', 'publicSafety', 'inequality']);
            obj(c.speciesPolitics);
        }
        if (c.identity) {
            date(c.identity.foundedDate);
            str(c.identity.name);
        }
    }
    for (const [id, r] of Object.entries(raw.world.regions) as [
        string,
        any
    ][]) {
        if (r.id !== id || !raw.world.countries[r.ownerCountryId])
            fail();
        if(r.directAssetWeight!==undefined)num(r.directAssetWeight,0);
        numeric(r.economy, ['gdp', 'growth', 'unemployment', 'inflation']);
        numeric(r.fiscal, ['treasury', 'debt']);
        numeric(r.population, ['total']);
        numeric(r.governance, ['approval', 'stability', 'integration']);
        numeric(r.social, ['livingStandard', 'education', 'healthcare', 'publicSafety', 'inequality']);
        technology(r.technology);
        fiscal(r.fiscal);
        economy(r.economy);
        obj(r.speciesPolitics);
    }
    obj(raw.world.governmentAI);
    obj(raw.world.strategicAI);
    obj(raw.world.diplomacy);
    obj(raw.world.diplomacy.relations);
    arr(raw.world.diplomacy.history);
    obj(raw.world.warfare);
    obj(raw.world.warfare.wars);
    obj(raw.world.internalConflicts);
    obj(raw.world.crises);
    obj(raw.world.crises.activeCrises);
    arr(raw.world.crises.history);
    arr(raw.world.foreignProposals);
    if (raw.world.technologyHistory !== undefined)
        arr(raw.world.technologyHistory);
    integer(raw.world.crises.nextId, 1);
    for (const c of [...Object.values(raw.world.crises.activeCrises), ...raw.world.crises.history] as any[]) {
        str(c.id);
        const n = Number((c.crisisId ?? c.id).replace('crisis-', ''));
        if (!Number.isInteger(n) || n >= raw.world.crises.nextId)
            fail();
    }
    for (const c of Object.values(raw.world.crises.activeCrises) as any[]) {
        if (!(c.jurisdictionKind === 'country' ? raw.world.countries[c.jurisdictionId] : raw.world.regions[c.jurisdictionId]))
            fail();
        num(c.severity, 0, 100);
    }
    for (const g of governmentDescriptors(raw.world as GameState["world"])) {
        obj(raw.policySchedules[g.id]);
        for (const k of ['taxNextChangeTurn', 'budgetNextChangeTurn', 'emergencyNextChangeTurn'])
            integer(raw.policySchedules[g.id][k]);
        const ai = raw.world.governmentAI[g.id];
        obj(ai);
        obj(ai.policyCooldowns);
        for (const k of ['taxes', 'budget', 'research'])
            num(ai.policyCooldowns[k], 0);
        arr(ai.recentDecisions);
        arr(ai.economicHistory);
    }
    for (const r of Object.values(raw.world.diplomacy.relations) as any[]) {
        if (!raw.world.countries[r.countryA] || !raw.world.countries[r.countryB])
            fail();
        numeric(r, ['relations', 'trust', 'threat', 'tradeLevel', 'monthsSinceMajorDiplomaticAction']);
    }
    arr(raw.world.warfare.aggressionHistory);
    const aggressionIds=new Set<string>();
    for(const r of raw.world.warfare.aggressionHistory){obj(r);str(r.warId);str(r.attackerCountryId);str(r.defenderCountryId);date(r.startedDate);integer(r.elapsedMonths,0);if(r.attackerCountryId===r.defenderCountryId||aggressionIds.has(r.warId)||!['justified','unjustified'].includes(r.legitimacy))fail();aggressionIds.add(r.warId);}
    for (const w of Object.values(raw.world.warfare.wars) as any[]) {
        if(!['justified','unjustified'].includes(w.legitimacy))fail();
        if(w.casusBelliType!==undefined&&!Object.hasOwn(casusBelliLabels,w.casusBelliType))fail();
        date(w.startedDate);
        arr(w.fronts);
        obj(w.participants);
        if (w.status !== 'resolved') {
            for (const id of Object.keys(w.participants))
                if (!raw.world.countries[id])
                    fail();
            for (const f of w.fronts)
                if (!raw.world.regions[f.regionId])
                    fail();
        }
    }
    for (const c of Object.values(raw.world.strategicAI) as any[]) {
        obj(c.targetAssessments);
        obj(c.diplomaticCooldowns);
        obj(c.currentWarStrategy);
        arr(c.recentStrategicDecisions);
    }
    obj(raw.world.warfare.casusBelli);
    obj(raw.world.warfare.truces);
    arr(raw.world.warfare.allyRequests);
    arr(raw.world.warfare.history);
    for (const w of Object.values(raw.world.warfare.wars) as any[])
        if (!['active', 'ceasefire', 'peace_negotiation', 'resolved'].includes(w.status))
            fail();
    for (const p of raw.world.foreignProposals) {
        if (!raw.world.countries[p.actorId] || !raw.world.countries[p.targetId])
            fail();
    }
    if (raw.events.pendingEvent) {
        obj(raw.events.pendingEvent);
        str(raw.events.pendingEvent.eventId);
        getEventDefinition(raw.events.pendingEvent.eventId);
        obj(raw.events.pendingEvent.jurisdiction);
        const j = raw.events.pendingEvent.jurisdiction;
        if (!['country', 'region'].includes(j.kind) || !(j.kind === 'country' ? raw.world.countries[j.id] : raw.world.regions[j.id]))
            fail();
        const pair=raw.events.pendingEvent.statePairTarget;
        if(pair!==undefined){obj(pair);if(j.kind!=='region'||pair.actorStateId!==j.id||pair.actorStateId===pair.targetStateId||![pair.actorStateId,pair.targetStateId].every(id=>isActiveFederalState(raw.world as WorldState,id)))fail();}
        date(raw.events.pendingEvent.date);
        integer(raw.events.pendingEvent.turn, 1);
        for (const [field, map] of [['warId', raw.world.warfare.wars], ['conflictId', raw.world.internalConflicts], ['crisisId', raw.world.crises.activeCrises], ['diplomaticTargetId', raw.world.countries]] as const)
            if (raw.events.pendingEvent[field] && !map[raw.events.pendingEvent[field]])
                fail();
    }
    obj(raw.history);
    if (raw.history.schemaVersion !== 1)
        fail();
    arr(raw.history.timeline);
    arr(raw.history.yearlySnapshots);
    obj(raw.history.countries);
    obj(raw.history.wars);
    for(const w of Object.values(raw.history.wars) as any[]){if(!['justified','unjustified'].includes(w.legitimacy))fail();if(w.casusBelliType!==undefined&&!Object.hasOwn(casusBelliLabels,w.casusBelliType))fail();}
    obj(raw.history.crises);
    obj(raw.history.worldFirstTechnology);
    obj(raw.history.seenSources);
    obj(raw.history.sourceCursors);
    obj(raw.history.career);
    arr(raw.history.career.officesHeld);
    date(raw.history.career.startDate);
    obj(raw.history.internalConflicts);
    arr(raw.history.elections);
    arr(raw.history.technologyMilestones);
    for (const e of raw.history.timeline) {
        date(e.date);
        str(e.id);
        str(e.sourceKey);
        str(e.title);
        arr(e.countryIds);
        arr(e.countryNames);
    }
    for (const y of raw.history.yearlySnapshots) {
        date(y.date);
        integer(y.year, 1);
        arr(y.countries);
        for (const c of y.countries)
            numeric(c, ['gdp', 'population', 'treasury', 'debt', 'technologyScore']);
    }
    integer(raw.history.nextHistoricalEventId, 1);
    if (raw.history.timeline.some((e: any) => !Number.isInteger(e.order) || e.order >= raw.history.nextHistoricalEventId))
        fail();
    if (new Set(raw.history.timeline.map((e: any) => e.id)).size !== raw.history.timeline.length)
        fail();
    assertJsonSafe(raw);
}
export const saveMigrations: Record<number, (raw: unknown) => unknown> = {5(raw){obj(raw);obj(raw.game);obj(raw.game.world);if(raw.game.world.statePolitics===undefined)fail();return {...raw,saveVersion:6};},1(raw){obj(raw);obj(raw.game);return {...raw,saveVersion:2,game:{...raw.game,difficulty:raw.game.difficulty??'normal'}};},2(raw){obj(raw);return migrateConflictSave(raw);},3(raw){obj(raw);obj(raw.game);obj(raw.game.world);return {...raw,saveVersion:4,game:{...raw.game,world:{...raw.game.world,federalPolitics:raw.game.world.federalPolitics===undefined?{}:raw.game.world.federalPolitics}}};},4(raw){obj(raw);obj(raw.game);obj(raw.game.world);return {...raw,saveVersion:5,game:{...raw.game,world:{...raw.game.world,statePolitics:raw.game.world.statePolitics===undefined?initialStateRelations(raw.game.world as WorldState):raw.game.world.statePolitics}}};}};
export function migrateSaveData(raw: unknown): SaveGameData { obj(raw); integer(raw.saveVersion, 0); if (raw.saveVersion > saveConfig.version)
    fail('더 새로운 버전에서 만든 저장 파일입니다.'); let current: unknown = raw; while ((current as any).saveVersion < saveConfig.version) {
    const version = (current as any).saveVersion, migration = saveMigrations[version];
    if (!migration)
        fail('지원하지 않는 이전 저장 버전입니다.');
    current = migration(current);
    obj(current);
    if (current.saveVersion !== version + 1)
        fail();
} obj(current); validateGameState(current.game); obj(current.metadata); date(current.metadata.gameDate); str(current.metadata.saveId); str(current.metadata.name); str(current.metadata.playerCountryName); if (current.metadata.playerRegionName !== undefined)
    str(current.metadata.playerRegionName); str(current.metadata.playerOffice); integer(current.metadata.turn, 1); integer(current.metadata.countryCount, 1); if (!['active', 'game_over'].includes(current.metadata.playStatus))
    fail(); for (const key of ['createdAt', 'updatedAt']) {
    str(current[key]);
    if (!Number.isFinite(Date.parse(current[key])))
        fail();
} if (current.metadata.countryCount !== Object.keys(current.game.world.countries).length || current.metadata.playStatus !== (current.game.gameOverReason ? 'game_over' : 'active') || current.metadata.gameOverReason !== (current.game.gameOverReason ?? undefined))
    fail(); if (current.metadata.turn !== current.game.turn || current.metadata.gameDate.year !== current.game.date.year || current.metadata.gameDate.month !== current.game.date.month)
    fail(); assertJsonSafe(current); const normalized=JSON.parse(JSON.stringify(current)) as SaveGameData; normalized.game=migrateAchievementState(normalized.game); validateAchievementFields(normalized.game); return normalized; }
export function createSaveData(game: GameState, saveId: string, name?: string, previous?: SaveGameData, now = new Date().toISOString()): SaveGameData { validateGameState(game); const country = historicalCountryName(game, game.player.defeatedCountryId ?? game.player.controlledCountryId), data: SaveGameData = { saveVersion: saveConfig.version, createdAt: previous?.createdAt ?? now, updatedAt: now, metadata: { saveId, name: name?.trim().slice(0, 140) || `${country} — ${game.date.year}년 ${game.date.month}월`, gameDate: { ...game.date }, playerCountryName: country, ...(game.player.controlledRegionId ? { playerRegionName: regionInfo(game, game.player.controlledRegionId)?.name ?? game.player.controlledRegionId } : {}), playerOffice: game.player.career.office, turn: game.turn, playStatus: game.gameOverReason ? 'game_over' : 'active', ...(game.gameOverReason ? { gameOverReason: game.gameOverReason } : {}), countryCount: Object.keys(game.world.countries).length }, game }; return migrateSaveData(data); }
export function serializeSave(data: SaveGameData): string { return JSON.stringify(migrateSaveData(data)); }
export function deserializeSave(text: string): SaveGameData { try {
    return migrateSaveData(JSON.parse(text));
}
catch (error) {
    if (error instanceof TypeError) fail('저장 파일의 필수 자료 구조가 올바르지 않습니다.');
        if (error instanceof SyntaxError)
        fail('이 저장 파일은 올바른 JSON 자료가 아닙니다.');
    throw error;
} }
export const loadGame = (data: SaveGameData): GameState => migrateSaveData(data).game;


