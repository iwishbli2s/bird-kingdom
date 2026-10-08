import { Activity, GraduationCap, HeartPulse, Scale, Shield } from 'lucide-react';
import { socialKeys, type SocialMetric } from '../game/socialConfig';
import type { SocialState } from '../game/types';

const metrics = {
  livingStandard: { label: '생활수준', icon: Activity, description: '실업, 물가, 복지와 불평등이 일상적인 삶의 수준에 영향을 줍니다.' },
  education: { label: '교육수준', icon: GraduationCap, description: '교육 투자와 연구 지원의 효과가 장기간에 걸쳐 반영됩니다.' },
  healthcare: { label: '보건수준', icon: HeartPulse, description: '보건 투자와 생활수준이 의료 접근성과 보건 체계를 뒷받침합니다.' },
  publicSafety: { label: '치안', icon: Shield, description: '치안 투자, 실업과 사회적 격차가 일상적인 안전에 영향을 줍니다.' },
  inequality: { label: '불평등', icon: Scale, description: '실업, 복지와 소득세가 생활 격차에 영향을 줍니다. 낮을수록 좋습니다.' },
};
export function socialCategory(key: SocialMetric, value: number): string {
  if (key === 'inequality') return value >= 70 ? '매우 높음' : value >= 50 ? '높음' : value >= 35 ? '보통' : value >= 20 ? '낮음' : '매우 낮음';
  return value >= 80 ? '매우 높음' : value >= 65 ? '높음' : value >= 45 ? '보통' : value >= 25 ? '낮음' : '매우 낮음';
}
export default function SocialView({ social, jurisdiction }: { social: SocialState; jurisdiction: string }) {
  return <section className="social-view" aria-label="사회 현황"><div className="section-heading"><h2>{jurisdiction}의 사회 현황</h2><span>지표 범위 0–100</span></div><div className="social-grid">{socialKeys.map(key => {
    const metric = metrics[key]; const delta = social[`${key}DeltaLastMonth`];
    const rounded = Math.round(delta*10)/10;
    const favorable = key === 'inequality' ? delta < 0 : delta > 0;
    return <article className="panel social-card" key={key} data-social={key}>
      <div className="panel-heading"><h3><metric.icon size={19} />{metric.label}</h3><span>{socialCategory(key,social[key])}</span></div>
      <div className="social-value">{social[key].toFixed(1)}<small>/ 100</small></div>
      <div className="gauge" role="meter" aria-label={metric.label} aria-valuenow={social[key]} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${social[key]}%` }} /></div>
      <div className={`social-trend ${rounded === 0 ? '' : favorable ? 'positive' : 'negative'}`}>지난달 {rounded===0 ? '— 0.0' : `${rounded>0?'▲':'▼'} ${Math.abs(rounded).toFixed(1)}`}</div><p>{metric.description}</p>
    </article>;
  })}</div><p className="dashboard-note">사회 지표는 투자와 경제 여건에 따라 서서히 변화합니다. 인구에는 이전 달 사회 상태가, 종족 만족도에는 이번 달 사회 상태가 반영됩니다.</p></section>;
}
