import { Bird } from 'lucide-react';

export default function Brand({ large = false }: { large?: boolean }) {
  return <div className={`brand ${large ? 'brand-large' : ''}`}><span className="brand-mark"><Bird strokeWidth={1.4} /></span><div><strong>BIRD KINGDOM</strong><small>조류 국가 운영 시뮬레이션</small></div></div>;
}
