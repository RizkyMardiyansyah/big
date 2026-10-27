import {useMemo} from 'react';
import {useOutletContext} from 'react-router-dom';
import {CircleCheck,Pencil,FilePlus2,CalendarClock} from 'lucide-react';
import {COLUMNS,PRIORITIES,TYPES,issueKey,ago,Avatar,TypeIcon,PriorityIcon,Lozenge,todayStr} from './shared';
import {akey,ActorAvatar} from './pickers';
const parse=k=>{const i=k.indexOf(':');return {type:k.slice(0,i),id:k.slice(i+1)}};

const WEEK=7*864e5,COL={todo:'#9AA7BC',in_progress:'#2F80FF',in_review:'#8B5CF6',completed:'#22A06B'};
const Panel=({title,children,className=''})=><section className={`rounded-xl border border-line bg-white p-5 ${className}`}><h2 className="mb-4 text-[15px] font-bold text-ink">{title}</h2>{children}</section>;
function Tile({icon:I,tone,n,label,sub}){return <div className="flex items-center gap-3 rounded-xl border border-line bg-white p-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg" style={{background:tone+'1A',color:tone}}><I className="h-5 w-5"/></span><div><p className="text-[20px] font-extrabold leading-tight text-ink">{n} <span className="text-[13px] font-semibold text-[#3A4A66]">{label}</span></p><p className="text-[12px] text-[#6B7A94]">{sub}</p></div></div>}
function Bars({rows}){const max=Math.max(1,...rows.map(r=>r.n));return <ul className="space-y-3">{rows.map(r=><li key={r.k} className="flex items-center gap-3 text-[13px]"><span className="flex w-32 shrink-0 items-center gap-2 truncate text-[#3A4A66]">{r.icon}<span className="truncate">{r.label}</span></span><span className="h-2.5 flex-1 overflow-hidden rounded-full bg-[#EEF2F8]"><span className="block h-full rounded-full transition-[width] duration-500" style={{width:r.n/max*100+'%',background:r.color||'#2F80FF'}}/></span><span className="w-8 text-right font-semibold text-[#5F6F89]">{r.n}</span></li>)}</ul>}
function Donut({parts,total}){const R=44,C=2*Math.PI*R;let off=0;return <svg viewBox="0 0 120 120" className="h-40 w-40 shrink-0 -rotate-90" role="img" aria-label="Status overview"><circle cx="60" cy="60" r={R} fill="none" stroke="#EEF2F8" strokeWidth="16"/>{total>0&&parts.filter(p=>p.n>0).map(p=>{const len=p.n/total*C,el=<circle key={p.k} cx="60" cy="60" r={R} fill="none" stroke={p.color} strokeWidth="16" strokeDasharray={`${Math.max(len-2,.5)} ${C}`} strokeDashoffset={-off}/>;off+=len;return el})}</svg>}

export default function Summary(){
 const {project,api,dir,actors,openIssue}=useOutletContext(),all=api.issues;
 const d=useMemo(()=>{const now=Date.now(),t0=todayStr(),in7=new Date(now+WEEK),lim=`${in7.getFullYear()}-${String(in7.getMonth()+1).padStart(2,'0')}-${String(in7.getDate()).padStart(2,'0')}`,recent=t=>now-new Date(t.updated_at||t.created_at).getTime()<WEEK;
  const open=all.filter(t=>t.status!=='cancelled'),cnt=(arr,f)=>arr.filter(f).length;
  const ppl={};open.forEach(t=>(t.assignees?.length?t.assignees.map(akey):['none']).forEach(k=>{ppl[k]=(ppl[k]||0)+1}));
  return {done:cnt(all,t=>t.status==='completed'&&recent(t)),updated:cnt(all,recent),created:cnt(all,t=>now-new Date(t.created_at).getTime()<WEEK),due:cnt(open,t=>t.status!=='completed'&&t.due_date&&t.due_date>=t0&&t.due_date<=lim),open,ppl}},[all]);
 const parts=COLUMNS.map(([k,l])=>({k,label:l,n:d.open.filter(t=>t.status===k).length,color:COL[k]})),total=d.open.length,doneN=parts[3].n;
 const people=Object.entries(d.ppl).sort((a,b)=>b[1]-a[1]).map(([id,n])=>{const a=id==='none'?null:actors.resolve(parse(id));return {k:id,n,label:a?(a.name||'Unknown')+(a.type==='partner'?' (partner)':''):'Unassigned',icon:a?<ActorAvatar a={a} size="h-5 w-5" text="text-[9px]"/>:<Avatar name={null} size="h-5 w-5"/>,color:a?.type==='partner'?'#14A8A0':'#2F80FF'}});
 const recent=[...all].sort((a,b)=>new Date(b.updated_at||b.created_at)-new Date(a.updated_at||a.created_at)).slice(0,8);
 return <div className="space-y-4">
  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
   <Tile icon={CircleCheck} tone="#22A06B" n={d.done} label="done" sub="in the last 7 days"/><Tile icon={Pencil} tone="#2F80FF" n={d.updated} label="updated" sub="in the last 7 days"/>
   <Tile icon={FilePlus2} tone="#8B5CF6" n={d.created} label="created" sub="in the last 7 days"/><Tile icon={CalendarClock} tone="#E97F33" n={d.due} label="due soon" sub="in the next 7 days"/></div>
  <div className="grid gap-4 lg:grid-cols-2">
   <Panel title="Status overview">{total===0?<p className="py-8 text-center text-[13px] text-[#8A98AF]">No tasks yet. Create one to see the breakdown.</p>:
    <div className="flex flex-wrap items-center gap-8"><div className="relative"><Donut parts={parts} total={total}/><div className="absolute inset-0 grid place-items-center text-center"><div><p className="text-[28px] font-extrabold leading-none text-ink">{total}</p><p className="mt-1 text-[11px] text-[#6B7A94]">tasks</p></div></div></div>
     <ul className="min-w-[10rem] flex-1 space-y-3">{parts.map(p=><li key={p.k} className="flex items-center gap-3 text-[13px]"><span className="h-2.5 w-2.5 rounded-full" style={{background:p.color}}/><span className="flex-1 text-[#3A4A66]">{p.label}</span><span className="font-semibold text-ink">{p.n}</span></li>)}<li className="border-t border-line pt-2 text-[12px] text-[#6B7A94]">{Math.round(doneN/total*100)}% complete</li></ul></div>}</Panel>
   <Panel title="Recent activity">{recent.length===0?<p className="py-8 text-center text-[13px] text-[#8A98AF]">Nothing has happened yet.</p>:
    <ul className="space-y-1">{recent.map(t=><li key={t.id}><button onClick={()=>openIssue(t.id)} className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-[#F2F6FC]"><TypeIcon type={t.type}/><span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-medium text-ink">{t.title}</span><span className="block text-[11px] text-[#6B7A94]">{issueKey(project,t)} · {ago(t.updated_at||t.created_at)}</span></span><Lozenge s={t.status}/></button></li>)}</ul>}</Panel>
   <Panel title="Priority breakdown"><Bars rows={PRIORITIES.map(([k,l])=>({k,label:l,n:d.open.filter(t=>t.priority===k).length,icon:<PriorityIcon priority={k}/>,color:{high:'#E5493A',medium:'#E97F33',low:'#2684FF'}[k]}))}/></Panel>
   <Panel title="Types of work"><Bars rows={TYPES.map(([k,l])=>({k,label:l,n:d.open.filter(t=>t.type===k).length,icon:<TypeIcon type={k}/>,color:{task:'#4BADE8',bug:'#E5493A',story:'#63BA3C'}[k]}))}/></Panel>
   <Panel title="Team workload" className="lg:col-span-2">{people.length===0?<p className="py-6 text-center text-[13px] text-[#8A98AF]">No assigned work yet.</p>:<Bars rows={people}/>}</Panel></div></div>}
