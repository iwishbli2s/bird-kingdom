import { governmentDescriptors, getGovernment, controlledGovernmentId } from './government';
import type { GameState, GameDate } from './types';
export type PolicyCadence = 'monthly' | 'quarterly' | 'annual';
export interface PolicyScheduleState {
    taxNextChangeTurn: number;
    budgetNextChangeTurn: number;
    emergencyNextChangeTurn: number;
}
export const policyCadences: Record<'tax' | 'budget' | 'research' | 'mobilization', PolicyCadence> = { tax: 'quarterly', budget: 'annual', research: 'monthly', mobilization: 'monthly' };
export const policyCadenceConfig = { taxMonths: 3, budgetMonths: 12, emergencyMonths: 6, severeCrisis: 75, newCountryBudgetMonths: 6 };
export function synchronizePolicySchedules(previous: GameState, next: GameState): GameState {
    const schedules: Record<string, PolicyScheduleState> = {};
    for (const g of governmentDescriptors(next.world)) {
        const old = next.policySchedules?.[g.id] ?? previous.policySchedules?.[g.id];
        if (old) {
            schedules[g.id] = old;
            continue;
        }
        const c = next.world.countries[g.countryId], source = g.jurisdiction.kind === 'region' ? previous.world.regions[g.jurisdiction.id] : Object.values(previous.world.regions).find(r => r.ownerCountryId !== g.countryId && next.world.regions[r.id]?.ownerCountryId === g.countryId), inherited = source ? previous.policySchedules?.['region:' + source.id] ?? previous.policySchedules?.['country:' + source.ownerCountryId] : undefined;
        schedules[g.id] = c.identity?.isDynamic ? { taxNextChangeTurn: Math.max(next.turn + policyCadenceConfig.taxMonths, inherited?.taxNextChangeTurn ?? 0), budgetNextChangeTurn: Math.max(next.turn + policyCadenceConfig.newCountryBudgetMonths, inherited?.budgetNextChangeTurn ?? 0), emergencyNextChangeTurn: Math.max(next.turn + policyCadenceConfig.newCountryBudgetMonths, inherited?.emergencyNextChangeTurn ?? 0) } : inherited ? { taxNextChangeTurn: Math.max(next.turn, inherited.taxNextChangeTurn), budgetNextChangeTurn: Math.max(next.turn, inherited.budgetNextChangeTurn), emergencyNextChangeTurn: Math.max(next.turn, inherited.emergencyNextChangeTurn) } : { taxNextChangeTurn: next.turn, budgetNextChangeTurn: next.turn, emergencyNextChangeTurn: next.turn };
    }
    return { ...next, policySchedules: schedules };
}
export function emergencyBudgetAvailable(game: GameState, id: string): boolean { const g = getGovernment(game.world, id); return Object.values(game.world.crises?.activeCrises ?? {}).some(c => c.severity >= policyCadenceConfig.severeCrisis && (g.jurisdiction.kind === 'region' ? c.jurisdictionKind === 'region' && c.jurisdictionId === g.jurisdiction.id : c.jurisdictionKind === 'country' ? c.jurisdictionId === g.countryId : game.world.regions[c.jurisdictionId]?.ownerCountryId === g.countryId)) || Object.values(game.world.warfare?.wars ?? {}).some(w => w.status === 'active' && w.participants[g.countryId]) || Object.values(game.world.internalConflicts ?? {}).some(c => c.status === 'armed_conflict' && [c.parentCountryId, c.breakawayCountryId].includes(g.countryId)); }
export function policyChangeBlock(game: GameState, id: string, kind: 'tax' | 'budget', emergency = false): string | null {
    if (game.policyScheduleEnabled === false)
        return null;
    const s = game.policySchedules?.[id];
    if (!s)
        return '정책 일정 자료가 없어 변경할 수 없습니다.';
    if (kind === 'budget' && emergency) {
        if (!emergencyBudgetAvailable(game, id))
            return '긴급 수정은 강도 75 이상의 위기 또는 진행 중 전쟁에서 가능합니다.';
        if (game.turn < s.emergencyNextChangeTurn)
            return '긴급 예산 수정 후 6개월이 지나야 합니다.';
        return null;
    }
    const turn = kind === 'tax' ? s.taxNextChangeTurn : s.budgetNextChangeTurn;
    return game.turn < turn ? `${kind === 'tax' ? '세율은 3개월' : '예산은 12개월'}마다 변경할 수 있습니다. 다음 변경 가능: ${formatPolicyDate(game, turn)}` : null;
}
export function formatPolicyDate(game: GameState, turn: number): string { const d: GameDate = game.date, index = d.year * 12 + d.month - 1 + Math.max(0, turn - game.turn); return `${Math.floor(index / 12)}년 ${index % 12 + 1}월`; }
export function markPolicyChanged(game: GameState, id: string, kind: 'tax' | 'budget', emergency = false): GameState { if (game.policyScheduleEnabled === false)
    return game; const next = synchronizePolicySchedules(game, game), s = next.policySchedules![id]; return { ...next, policySchedules: { ...next.policySchedules, [id]: { ...s, ...(kind === 'tax' ? { taxNextChangeTurn: game.turn + policyCadenceConfig.taxMonths } : emergency ? { budgetNextChangeTurn: Math.max(s.budgetNextChangeTurn, game.turn + policyCadenceConfig.budgetMonths), emergencyNextChangeTurn: game.turn + policyCadenceConfig.emergencyMonths } : { budgetNextChangeTurn: game.turn + policyCadenceConfig.budgetMonths }) } } }; }
export function controlledPolicySchedule(game: GameState) { return game.policySchedules?.[controlledGovernmentId(game)]; }
