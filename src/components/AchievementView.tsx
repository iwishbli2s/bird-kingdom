import type {GameState} from '../game/types';
import {visibleAchievements} from '../game/achievements';
import {calculateAchievementScore,ruleGrade} from '../game/endings';
import {formatDate} from '../game/engine';
export default function AchievementView({game,earnedOnly=false}:{game:GameState;earnedOnly?:boolean}){
 const unlocked=game.endingResult?.achievements??game.achievements?.unlocked??[],score=game.endingResult?.score??calculateAchievementScore(unlocked);
 const definitions=visibleAchievements(game).filter(d=>!earnedOnly||unlocked.some(u=>u.achievementId===d.id)).sort((a,b)=>b.score-a.score);
 return <section className="achievements-view" aria-label="대형 업적"><div className="panel achievement-score"><div><span>업적 점수</span><strong>{score.toLocaleString('ko-KR')}</strong></div><div><span>통치 등급</span><strong>{game.endingResult?.grade??ruleGrade(score)}</strong></div><p>통치가 남긴 위업을 평가합니다. 같은 계열은 가장 높은 단계의 점수만 반영합니다.</p></div><div className="achievement-grid">{definitions.map(d=>{const u=unlocked.find(u=>u.achievementId===d.id);return <article className={`panel achievement-card ${u?'unlocked':''}`} data-achievement={d.id} key={d.id}>{d.hidden&&<span className="eyebrow">HIDDEN ACHIEVEMENT</span>}<h3>{d.name}</h3><p>{d.description}</p><footer><strong>{(u?.score??d.score).toLocaleString('ko-KR')}점{d.family?' · 계열 최고점':''}</strong><span>{u?formatDate(u.unlockedAt)+' 획득':'미획득'}</span></footer></article>;})}</div>{!definitions.length&&<p className="panel">획득한 대형 업적이 없습니다.</p>}</section>;
}
