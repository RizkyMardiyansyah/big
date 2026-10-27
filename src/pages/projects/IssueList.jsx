import {useState,useMemo} from 'react';
import {useOutletContext} from 'react-router-dom';
import {Search,ChevronDown,ArrowUp,ArrowDown,Plus} from 'lucide-react';
import {useAuth} from '../../lib/auth';
import {COLUMNS,PRIORITIES,issueKey,fmtDay,isOverdue,ago,Avatar,TypeIcon,PriorityIcon,Lozenge,Pick,STATUS_LABEL} from './shared';
import {akey,ActorAvatar,AvatarStack} from './pickers';
const parse=k=>{const i=k.indexOf(':');return {type:k.slice(0,i),id:k.slice(i+1)}};

const PR={high:0,medium:1,low:2},ST={todo:0,in_progress:1,in_review:2,completed:3,cancelled:4};
const COLS=[['key','Key'],['title','Summary'],['status','Status'],['assignee','Assignee'],['priority','Priority'],['due','Due date'],['updated','Updated']];

export default function IssueList(){
 const {project,api,dir,actors,openIssue,openCreate}=useOutletContext(),{can,session}=useAuth(),me=session?.user?.id;
 const [q,setQ]=useState(''),[st,setSt]=useState(''),[who,setWho]=useState(''),[mine,setMine]=useState(false),[sort,setSort]=useState({k:'key',dir:1});
 const rows=useMemo(()=>{const n=q.trim().toLowerCase(),d=sort.dir,v={key:t=>t.issue_no||0,title:t=>t.title.toLowerCase(),status:t=>ST[t.status]??9,assignee:t=>(actors.resolve(t.assignees?.[0]||{type:'user',id:null}).name||'~').toLowerCase(),priority:t=>PR[t.priority]??9,due:t=>t.due_date||'9999',updated:t=>new Date(t.updated_at||t.created_at).getTime()}[sort.k];
  return api.issues.filter(t=>(!n||(t.title+' '+issueKey(project,t)).toLowerCase().includes(n))&&(!st||t.status===st)&&(!who||(who==='none'?!(t.assignees||[]).length:(t.assignees||[]).some(a=>akey(a)===who)))&&(!mine||(t.assignees||[]).some(a=>a.type==='user'&&a.id===me))).sort((a,b)=>{const x=v(a),y=v(b);return (x<y?-1:x>y?1:0)*d})},[api.issues,q,st,who,mine,sort,dir.list.length]);
 const th=(k,l)=><th key={k} className="!py-2.5 first:pl-4 last:pr-4" aria-sort={sort.k===k?(sort.dir>0?'ascending':'descending'):'none'}><button type="button" onClick={()=>setSort(s=>s.k===k?{k,dir:-s.dir}:{k,dir:1})} className="inline-flex items-center gap-1 rounded px-1 py-0.5 text-[12px] font-semibold text-[#5F6F89] transition hover:bg-[#EEF2F8] hover:text-ink">{l}{sort.k===k&&(sort.dir>0?<ArrowUp className="h-3 w-3"/>:<ArrowDown className="h-3 w-3"/>)}</button></th>;
 const btn='flex h-8 items-center gap-1.5 rounded-md bg-[#EEF2F8] px-3 text-[13px] font-semibold text-[#42526E] transition hover:bg-[#E3E9F3]';
 const people=[{value:'',label:'All assignees'},{value:'none',label:'Unassigned',icon:<Avatar name={null} size="h-5 w-5"/>},...dir.list.map(u=>({value:'user:'+u.id,label:u.full_name,icon:<Avatar name={u.full_name} size="h-5 w-5" text="text-[9px]"/>})),...actors.partners.map(p=>({value:'partner:'+p.id,label:p.name+' (partner)',icon:<ActorAvatar a={{type:'partner',id:p.id,name:p.name}} size="h-5 w-5" text="text-[9px]"/>}))];
 const stOpts=[{value:'',label:'All statuses'},...[...COLUMNS,['cancelled','Cancelled']].map(([v,l])=>({value:v,label:l}))];
 return <div>
  <div className="mb-4 flex flex-wrap items-center gap-3">
   <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7B8AA5]"/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search tasks" aria-label="Search tasks" className="h-8 w-52 rounded-md border border-line bg-white pl-9 pr-3 text-[13px] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"/></div>
   <Pick value={st} onChange={setSt} options={stOpts} width="w-48" label="Status filter" btnClass={btn}>{st?STATUS_LABEL[st]:'Status'}<ChevronDown className="h-3.5 w-3.5"/></Pick>
   <Pick value={who} onChange={setWho} options={people} searchable width="w-60" label="Assignee filter" btnClass={btn}>{who?(who==='none'?'Unassigned':actors.resolve(parse(who)).name):'Assignee'}<ChevronDown className="h-3.5 w-3.5"/></Pick>
   <button type="button" aria-pressed={mine} onClick={()=>setMine(!mine)} className={`h-8 rounded-md px-3 text-[13px] font-semibold transition ${mine?'bg-[#DCE9FF] text-[#0747A6]':'bg-[#EEF2F8] text-[#42526E] hover:bg-[#E3E9F3]'}`}>Only my tasks</button>
   <span className="flex-1"/><span className="text-[12px] text-[#6B7A94]">{rows.length} of {api.issues.length} tasks</span></div>
  <div className="overflow-x-auto rounded-xl border border-line bg-white">
   <table className="w-full min-w-[52rem] text-left"><thead className="border-b border-line bg-[#FAFBFD]"><tr><th className="w-10 pl-4"><span className="sr-only">Type</span></th>{COLS.map(([k,l])=>th(k,l))}</tr></thead>
   <tbody>{rows.map(t=>{const as=(t.assignees||[]).map(actors.resolve);return <tr key={t.id} tabIndex={0} onClick={()=>openIssue(t.id)} onKeyDown={e=>e.key==='Enter'&&openIssue(t.id)} className="cursor-pointer border-t border-line transition-colors hover:bg-[#F7FAFE] focus-visible:bg-[#F7FAFE]">
     <td className="pl-4"><TypeIcon type={t.type}/></td><td className="whitespace-nowrap font-semibold text-[#5F6F89]"><span className={t.status==='completed'?'line-through':''}>{issueKey(project,t)}</span></td>
     <td className="max-w-[24rem] truncate font-medium text-ink">{t.title}</td>
     <td onClick={e=>e.stopPropagation()}><Pick value={t.status} onChange={s=>api.update.mutate({id:t.id,status:s})} disabled={!can('tasks.edit')} options={[...COLUMNS,['cancelled','Cancelled']].map(([v,l])=>({value:v,label:l,icon:<Lozenge s={v} label={l}/>}))} width="w-52" label="Change status" btnClass="rounded-md p-0.5 transition hover:bg-[#EEF2F8] disabled:hover:bg-transparent"><Lozenge s={t.status}/></Pick></td>
     <td><span className="flex items-center gap-2"><AvatarStack list={as}/><span className="max-w-[9rem] truncate">{as.length===0?<span className="text-[#8A98AF]">Unassigned</span>:as.length===1?as[0].name:`${as[0].name} +${as.length-1}`}</span></span></td>
     <td><span className="flex items-center gap-1.5"><PriorityIcon priority={t.priority}/>{PRIORITIES.find(p=>p[0]===t.priority)?.[1]}</span></td>
     <td className={`whitespace-nowrap ${isOverdue(t)?'font-semibold text-[#B3261E]':'text-[#3A4A66]'}`}>{t.due_date?fmtDay(t.due_date):'—'}</td>
     <td className="whitespace-nowrap pr-4 text-[#6B7A94]">{ago(t.updated_at||t.created_at)}</td></tr>})}</tbody></table>
   {api.loading&&<p className="py-8 text-center text-sub">Loading tasks…</p>}
   {!api.loading&&rows.length===0&&<div className="px-6 py-12 text-center"><p className="font-semibold text-ink">{api.issues.length?'No tasks match your filters':'No tasks yet'}</p>{!api.issues.length&&can('tasks.create')&&<button className="btn mt-4 !rounded-lg" onClick={()=>openCreate('todo')}><Plus className="h-4 w-4"/>Create task</button>}</div>}</div></div>}
