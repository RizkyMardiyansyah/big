import {useAuth} from './auth';
const L={todo:'To Do',in_progress:'In Progress',in_review:'In Review',completed:'Done',planning:'Planning',on_hold:'On Hold',pending:'Pending',approved:'Approved',rejected:'Rejected',cancelled:'Cancelled',draft:'Draft',waiting:'Waiting',active:'Active'};
export const label=s=>L[s]||s;
export const plabel=s=>s==='completed'?'Completed':label(s);
const C={approved:'bg-ok/10 text-ok',completed:'bg-ok/10 text-ok',pending:'bg-warn/25 text-[#6b4f00]',rejected:'bg-bad/10 text-bad',cancelled:'bg-line text-sub'};
export const Badge=({s})=><span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${C[s]||'bg-primary/10 text-primary'}`}>{label(s)}</span>;
export const Head=({title,sub,children})=><div className="mb-6 flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-2xl font-extrabold text-ink">{title}</h1>{sub&&<p className="mt-1 text-sub">{sub}</p>}</div><div className="flex gap-2">{children}</div></div>;
export const Err=({e})=>e?<p role="alert" className="text-bad">{e.message||String(e)}</p>:null;
export const Empty=({t})=><p className="py-6 text-center text-sub">{t}</p>;
export function Need({p,children}){const {can}=useAuth();return can(p)?children:<div className="card text-bad">You do not have permission to view this page ({p}).</div>}
export const BRAND_BAR={background:'linear-gradient(90deg,#FABD03 0 33.3%,#EA4235 33.3% 66.6%,#1A73E9 66.6%)'};
