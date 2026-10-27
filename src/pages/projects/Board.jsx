import {useState,useMemo,useRef,useEffect} from 'react';
import {useOutletContext} from 'react-router-dom';
import {DragDropContext,Droppable,Draggable} from '@hello-pangea/dnd';
import {Search,Plus,CircleCheck,CalendarDays,ChevronDown,ChevronRight,Check,X,Paperclip} from 'lucide-react';
import {Err} from '../../lib/ui';
import {useAuth} from '../../lib/auth';
import {COLUMNS,TYPES,PRIORITIES,issueKey,fmtDay,isOverdue,Avatar,TypeIcon,PriorityIcon,Pick} from './shared';
import {akey,ActorAvatar,AvatarStack} from './pickers';
const parse=k=>{const i=k.indexOf(':');return {type:k.slice(0,i),id:k.slice(i+1)}};

const byRank=(a,b)=>(Number(a.rank)||0)-(Number(b.rank)||0);
const DAY=864e5;

// ---- Inline composer at the bottom of a column (Enter creates, Esc cancels)
function Composer({status,onCreate,onClose}){
 const [title,setTitle]=useState(''),[type,setType]=useState('task'),[busy,setBusy]=useState(false),ref=useRef(null);
 useEffect(()=>{ref.current?.focus()},[]);
 const submit=async()=>{const t=title.trim();if(!t||busy)return;setBusy(true);try{await onCreate({title:t,type,status});setTitle('');ref.current?.focus()}catch{}setBusy(false)};
 return <div className="animate-slide rounded-[6px] bg-white p-2.5 shadow-[0_0_0_2px_#0B6FFB,0_1px_2px_rgba(9,30,66,.2)]">
  <textarea ref={ref} rows={2} value={title} onChange={e=>setTitle(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();submit()}if(e.key==='Escape'){e.stopPropagation();onClose()}}} placeholder="What needs to be done?" aria-label="Task summary" className="w-full resize-none rounded-md border-0 bg-transparent p-0 text-[14px] leading-5 text-ink placeholder:text-[#8A98AF] focus:outline-none focus:ring-0"/>
  <div className="mt-2 flex items-center gap-2">
   <Pick value={type} onChange={setType} width="w-40" label="Task type" options={TYPES.map(([v,l])=>({value:v,label:l,icon:<TypeIcon type={v}/>}))}><TypeIcon type={type}/><ChevronDown className="h-3 w-3 text-[#6B7A94]"/></Pick>
   <span className="flex-1 text-right text-[11px] text-[#8A98AF]">Enter to create</span>
   <button type="button" onClick={onClose} className="rounded-md px-2 py-1 text-[12px] font-semibold text-[#5F6F89] transition hover:bg-[#EEF2F8]">Cancel</button>
   <button type="button" onClick={submit} disabled={!title.trim()||busy} className="rounded-md bg-primary px-2.5 py-1 text-[12px] font-semibold text-white transition hover:bg-primaryh disabled:opacity-50">Create</button></div></div>}

function Card({t,project,actors,index,onOpen,canDrag}){
 const done=t.status==='completed',late=isOverdue(t);
 return <Draggable draggableId={t.id} index={index} isDragDisabled={!canDrag}>{(p,s)=>
  <div ref={p.innerRef} {...p.draggableProps} {...p.dragHandleProps} role="button" tabIndex={0} aria-label={`${issueKey(project,t)} ${t.title}`} onClick={()=>onOpen(t.id)} onKeyDown={e=>{if(e.key==='Enter'&&e.target===e.currentTarget)onOpen(t.id)}}
   style={p.draggableProps.style}
   className={`group cursor-pointer select-none rounded-[6px] bg-white p-2.5 text-left outline-none transition-[box-shadow,background-color] duration-150 ${s.isDragging?'shadow-[0_10px_24px_rgba(9,30,66,.3)] ring-2 ring-primary/50':'shadow-[0_1px_1px_rgba(9,30,66,.25),0_0_1px_rgba(9,30,66,.31)] hover:bg-[#F7F9FC] focus-visible:ring-2 focus-visible:ring-primary'}`}>
   <p className="break-words text-[14px] leading-5 text-ink">{t.title}</p>
   {t.due_date&&<span className={`mt-2 inline-flex items-center gap-1 rounded-[4px] px-1.5 py-0.5 text-[12px] font-semibold ${late?'bg-[#FFE9E5] text-[#B3261E]':'bg-[#EEF2F8] text-[#42526E]'}`}><CalendarDays className="h-3 w-3"/>{fmtDay(t.due_date)}</span>}
   <div className="mt-3 flex items-center gap-2"><TypeIcon type={t.type}/><span className={`text-[12px] font-semibold text-[#6B7A94] ${done?'line-through':''}`}>{issueKey(project,t)}</span>{done&&<CircleCheck className="h-3.5 w-3.5 text-ok"/>}
    <span className="flex-1"/>{t.doc_count>0&&<span className="flex items-center gap-0.5 text-[12px] font-semibold text-[#6B7A94]" title={`${t.doc_count} linked document${t.doc_count>1?'s':''}`}><Paperclip className="h-3.5 w-3.5"/>{t.doc_count}</span>}<PriorityIcon priority={t.priority}/><AvatarStack list={(t.assignees||[]).map(actors.resolve)}/></div></div>}</Draggable>}

export default function Board(){
 const {project,api,dir,actors,openIssue,openCreate}=useOutletContext(),{can,session}=useAuth(),me=session?.user?.id;
 const [q,setQ]=useState(''),[who,setWho]=useState([]),[mine,setMine]=useState(false),[recent,setRecent]=useState(false),[group,setGroup]=useState('none'),[composer,setComposer]=useState(null),[folded,setFolded]=useState({});
 const canDrag=can('tasks.edit'),canCreate=can('tasks.create');
 const all=api.issues.filter(t=>t.status!=='cancelled');
 // Assignees shown in the quick-filter avatar group: people who actually have issues here
 const people=useMemo(()=>{const c={};all.forEach(t=>(t.assignees?.length?t.assignees.map(akey):['none']).forEach(k=>{c[k]=(c[k]||0)+1}));return Object.entries(c).sort((a,b)=>b[1]-a[1]).map(([id])=>id)},[all.length,api.issues]);
 const shown=useMemo(()=>{const n=q.trim().toLowerCase(),now=Date.now();
  return all.filter(t=>(!n||(t.title+' '+issueKey(project,t)).toLowerCase().includes(n))&&(!who.length||(t.assignees?.length?t.assignees.map(akey):['none']).some(k=>who.includes(k)))&&(!mine||(t.assignees||[]).some(a=>a.type==='user'&&a.id===me))&&(!recent||now-new Date(t.updated_at||t.created_at).getTime()<DAY)).sort(byRank)},[api.issues,q,who,mine,recent,project]);
 const filtered=!!(q||who.length||mine||recent);
 const lanes=useMemo(()=>{
  if(group==='none')return [{key:'all',title:null,items:shown}];
  if(group==='priority')return PRIORITIES.map(([k,l])=>({key:k,title:l,icon:<PriorityIcon priority={k} cls="h-4 w-4"/>,items:shown.filter(t=>t.priority===k)}));
  const first=t=>t.assignees?.[0]?akey(t.assignees[0]):'none',nm=k=>k==='none'?null:actors.resolve(parse(k)),ids=[...new Set(shown.map(first))].sort((a,b)=>a==='none'?1:b==='none'?-1:(nm(a)?.name||'').localeCompare(nm(b)?.name||''));
  return ids.map(id=>({key:id,title:id==='none'?'Unassigned':nm(id)?.name||'Unknown',icon:id==='none'?<Avatar name={null} size="h-5 w-5"/>:<ActorAvatar a={nm(id)} size="h-5 w-5" text="text-[9px]"/>,items:shown.filter(t=>first(t)===id)}))},[group,shown,dir.list.length,actors.partners.length]);

 const onDragEnd=r=>{const {destination:d,source:s,draggableId:id}=r;if(!d)return;
  const [dl,ds]=d.droppableId.split('::'),[sl,ss]=s.droppableId.split('::');if(dl===sl&&ds===ss&&d.index===s.index)return;
  const list=(lanes.find(l=>l.key===dl)?.items||[]).filter(t=>t.status===ds&&t.id!==id).sort(byRank),prev=list[d.index-1],next=list[d.index];
  const rank=prev&&next?(Number(prev.rank)+Number(next.rank))/2:prev?Number(prev.rank)+1000:next?Number(next.rank)-1000:1000;
  api.update.mutate({id,status:ds,rank});};
 const create=async b=>{await api.create.mutateAsync(b)};
 const toggleWho=id=>setWho(w=>w.includes(id)?w.filter(x=>x!==id):[...w,id]);
 const chip=on=>`inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[13px] font-semibold transition ${on?'bg-[#DCE9FF] text-[#0747A6]':'bg-[#EEF2F8] text-[#42526E] hover:bg-[#E3E9F3]'}`;
 const shownAvatars=people.slice(0,6),extra=people.slice(6);

 return <div>
  <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2">
   <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7B8AA5]"/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search board" aria-label="Search board" className="h-8 w-44 rounded-md border border-line bg-white pl-9 pr-3 text-[13px] transition-[width] duration-200 placeholder:text-[#8A98AF] focus:w-60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"/></div>
   {people.length>0&&<div className="flex items-center" role="group" aria-label="Filter by assignee">
    {shownAvatars.map((id,i)=>{const on=who.includes(id),a=id==='none'?null:actors.resolve(parse(id));return <button key={id} type="button" onClick={()=>toggleWho(id)} aria-pressed={on} title={a?.name||'Unassigned'} style={{marginLeft:i?-4:0}} className={`rounded-full transition-transform duration-150 hover:z-10 hover:-translate-y-0.5 ${on?'z-10 ring-2 ring-primary ring-offset-1':'ring-2 ring-white'}`}>{a?<ActorAvatar a={a} size="h-8 w-8" text="text-[11px]"/>:<Avatar name={null} size="h-8 w-8"/>}</button>})}
    {extra.length>0&&<Pick value={null} onChange={toggleWho} searchable align="left" width="w-60" label="More assignees" options={extra.map(id=>{const a=id==='none'?null:actors.resolve(parse(id));return {value:id,label:a?.name||'Unassigned',icon:a?<ActorAvatar a={a} size="h-5 w-5" text="text-[9px]"/>:<Avatar name={null} size="h-5 w-5"/>}})} btnClass="-ml-1.5 grid h-8 min-w-8 place-items-center rounded-full bg-[#E3E9F3] px-1.5 text-[11px] font-bold text-[#42526E] ring-2 ring-white transition hover:bg-[#D6DEEB]">+{extra.length}</Pick>}</div>}
   <button type="button" className={chip(mine)} aria-pressed={mine} onClick={()=>setMine(!mine)}>Only my tasks</button>
   <button type="button" className={chip(recent)} aria-pressed={recent} onClick={()=>setRecent(!recent)}>Recently updated</button>
   {filtered&&<button type="button" onClick={()=>{setQ('');setWho([]);setMine(false);setRecent(false)}} className="text-[13px] font-semibold text-primary hover:underline">Clear filters</button>}
   <span className="flex-1"/>
   <span className="hidden text-[12px] text-[#6B7A94] sm:block">{shown.length} task{shown.length===1?'':'s'}{filtered?' (filtered)':''}</span>
   <Pick value={group} onChange={setGroup} align="right" width="w-44" label="Group by" options={[['none','None'],['assignee','Assignee'],['priority','Priority']].map(([v,l])=>({value:v,label:l}))} btnClass="flex h-8 items-center gap-1.5 rounded-md bg-[#EEF2F8] px-3 text-[13px] font-semibold text-[#42526E] transition hover:bg-[#E3E9F3]"><span className="font-medium text-[#6B7A94]">Group</span>{group==='none'?'None':group==='assignee'?'Assignee':'Priority'}<ChevronDown className="h-3.5 w-3.5"/></Pick></div>
  {api.error&&<div className="mb-3 flex items-center gap-2 rounded-lg bg-[#FFE9E5] px-3 py-2 text-[13px] text-[#B3261E]" role="alert"><span className="flex-1">{api.error.message}</span><button onClick={api.clearError} aria-label="Dismiss"><X className="h-4 w-4"/></button></div>}

  <DragDropContext onDragEnd={onDragEnd}>
   <div className="thin-scroll -mx-1 overflow-x-auto px-1 pb-4"><div className="min-w-[68rem]">
    {lanes.map(lane=>{const isFolded=lane.title&&folded[lane.key];
     return <section key={lane.key} className={lane.title?'mb-4':''}>
      {lane.title&&<button type="button" onClick={()=>setFolded(f=>({...f,[lane.key]:!f[lane.key]}))} aria-expanded={!isFolded} className="mb-2 flex items-center gap-2 rounded-md px-1 py-1 text-[14px] font-bold text-ink transition hover:bg-[#EEF2F8]">{isFolded?<ChevronRight className="h-4 w-4"/>:<ChevronDown className="h-4 w-4"/>}{lane.icon}{lane.title}<span className="text-[12px] font-medium text-[#6B7A94]">({lane.items.length} task{lane.items.length===1?'':'s'})</span></button>}
      {!isFolded&&<div className="grid grid-cols-4 gap-3">
       {COLUMNS.map(([st,label])=>{const items=lane.items.filter(t=>t.status===st),cid=`${lane.key}::${st}`,composing=composer===cid;
        return <div key={st} className="flex min-h-[8rem] flex-col rounded-xl bg-[#F1F4F9] p-2">
         <div className="flex items-center gap-1.5 px-1.5 pb-2 pt-1 text-[12px] font-bold uppercase tracking-wide text-[#5F6F89]">{st==='completed'&&<Check className="h-3.5 w-3.5 text-ok" strokeWidth={3}/>}{label}<span className="font-semibold text-[#8A98AF]">{items.length}</span></div>
         <Droppable droppableId={cid}>{(dp,ds)=>
          <div ref={dp.innerRef} {...dp.droppableProps} className={`flex min-h-[3rem] flex-1 flex-col gap-2 rounded-lg p-0.5 transition-colors duration-150 ${ds.isDraggingOver?'bg-[#DCE9FF]':''}`}>
           {items.map((t,i)=><Card key={t.id} t={t} index={i} project={project} actors={actors} onOpen={openIssue} canDrag={canDrag}/>)}{dp.placeholder}
           {items.length===0&&!ds.isDraggingOver&&!composing&&<p className="px-2 py-3 text-center text-[12px] text-[#8A98AF]">{filtered?'No matching tasks':'Drop tasks here'}</p>}</div>}</Droppable>
         {composing?<Composer status={st} onCreate={create} onClose={()=>setComposer(null)}/>
          :canCreate&&<button type="button" onClick={()=>setComposer(cid)} className="mt-1 flex h-9 items-center gap-1.5 rounded-md px-2 text-[13px] font-medium text-[#5F6F89] transition hover:bg-[#E3E9F3] hover:text-ink"><Plus className="h-4 w-4"/>Create task</button>}</div>})}</div>}</section>})}
    {lanes.length===0&&<p className="py-10 text-center text-sub">No tasks to show.</p>}</div></div></DragDropContext>
  {api.loading&&<p className="py-6 text-center text-sub">Loading board…</p>}</div>}
