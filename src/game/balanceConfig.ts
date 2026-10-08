import {economyConfig,industryConfig} from './economyConfig';
import {fiscalConfig} from './fiscalConfig';
import {populationConfig} from './populationConfig';
import {socialConfig} from './socialConfig';
import {speciesPoliticsConfig} from './speciesPoliticsConfig';
import {governanceConfig} from './governanceConfig';
import {electionConfig} from './electionConfig';
import {eventConfig} from './eventConfig';
import {secessionConfig} from './secessionConfig';
import {diplomacyConfig} from './diplomacyConfig';
import {warfareConfig} from './warfareConfig';
import {technologyConfig} from './technologyConfig';
import {crisisConfig} from './crisisConfig';
/** Focused patches: mature sector expansion encounters demand/competition; distressed interest flattens above 100% debt/GDP; severe fiscal repair uses larger legal tax steps. */
export const balanceAdjustments={sectorShareThreshold:1.5,sectorGrowthPressure:.02,distressedDebtRatio:1,distressedInterestCeiling:8,distressedInterestScale:.6,fiscalEmergencyUrgency:85,fiscalEmergencyTaxStep:1.5};
export const growthConvergenceConfig={matureProductivity:150,growthResponse:8,productivityBonusResponse:1,highTechStart:8,highTechGrowthResponse:.5};
export const mortalityConfig={startingAgeMonths:12,initialMonthlyRisk:.00001,riskGrowthYears:8,maxNaturalRisk:.999999};
/** Existing domain files remain authoritative; this registry supports inspection and reproducible balance reports. */
export const balanceConfig={economy:economyConfig,industries:industryConfig,fiscal:fiscalConfig,population:populationConfig,social:socialConfig,speciesPolitics:speciesPoliticsConfig,politics:governanceConfig,elections:electionConfig,events:eventConfig,secession:secessionConfig,diplomacy:diplomacyConfig,warfare:warfareConfig,technology:technologyConfig,crisis:crisisConfig,mortality:mortalityConfig,adjustments:balanceAdjustments,growthConvergence:growthConvergenceConfig};

