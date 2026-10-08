import { countriesAtWar } from './military';
import { diplomacyConfig as config } from './diplomacyConfig';
import { hasSanctions, isRecognized, isSanctioning } from './diplomacy';
import type { EconomyUpdateOptions } from './economy';
import type { WorldState } from './types';
export function getDiplomaticTradeModifiers(world:WorldState,countryId:string):NonNullable<EconomyUpdateOptions['industryModifiers']> {
  let adjustment=0;
  for(const r of Object.values(world.diplomacy?.relations??{})){
    if(r.countryA!==countryId&&r.countryB!==countryId)continue;
    const target=r.countryA===countryId?r.countryB:r.countryA;
    const trade=r.tradeLevel/100,recognized=isRecognized(r,countryId)&&isRecognized(r,target);
    const effective=recognized&&!countriesAtWar(world,countryId,target)?trade*(hasSanctions(r)?config.sanctionTradeFactor:r.relations<-10?.5:1):0;
    // 시작 경제 프로필에 이미 반영된 기존 교역에서의 변화만 추가합니다.
    adjustment+=(effective-r.baselineTradeLevel/100)*config.tradeAnnualBonus;
    if(hasSanctions(r))adjustment-=trade*config.tradeLossPenalty+(isSanctioning(r,target)?config.sanctionTargetPenalty:0);
    if(r.disruptionMonths>0)adjustment-=r.disruptionExposure/100*config.tradeLossPenalty;
  }
  adjustment=Math.max(-config.maxAnnualTradeAdjustment,Math.min(config.maxAnnualTradeAdjustment,adjustment));
  return Object.fromEntries(['agriculture','manufacturing','services'].map(id=>[id,{annualGrowthAdjustment:adjustment}]));
}
export function getPassageMigrationAdjustment(world:WorldState,countryId:string):number {
  return Math.min(.06,Object.values(world.diplomacy?.relations??{}).filter(r=>(r.countryA===countryId||r.countryB===countryId)&&r.migratoryPassageAgreement&&!countriesAtWar(world,r.countryA,r.countryB)&&!hasSanctions(r)&&isRecognized(r,r.countryA)&&isRecognized(r,r.countryB)).length*config.passageAnnualMigration);
}
