import {useMemo,useState} from 'react';
import {Link,useNavigate} from 'react-router-dom';
import {keepPreviousData} from '@tanstack/react-query';
import {ChevronLeft,ChevronRight,CalendarCheck,Lock} from 'lucide-react';
import {useGet} from '../lib/api';
import {Need} from '../lib/ui';
import {Lozenge,TypeIcon,PriorityIcon,issueKey,todayStr,isOverdue,fmtDay} from './projects/shared';

// Kalender due date: menampilkan task yang di-assign ke pengguna yang sedang login.
const WEEKDAYS=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const ymd=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const parse=s=>{const [y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d)};
const link=t=>`/app/projects/${t.project_id}/board?selectedTask=${t.id}`;

// Warna chip: terlambat (merah) > selesai (hijau pudar) > aktif (biru)
const tone=t=>t.status==='completed'?'bg-[#DCF5E7] text-[#00663F]':isOverdue(t)?'bg-[#FDE8E6] text-[#B42318]':'bg-[#E4EEFF] text-[#0A57C8]';

function Chip({t,onPick}){
 const nav=useNavigate(),label=`${issueKey({code:t.project_code},t)} ${t.title}`;
 const cls=`block w-full truncate rounded px-1.5 py-0.5 text-left text-[11px] font-semibold leading-4 ${tone(t)} ${t.status==='completed'?'line-through opacity-70':''}`;
 return t.can_open
  ?<button type="button" title={label} onClick={e=>{e.stopPropagation();nav(link(t))}} className={`${cls} transition hover:brightness-95`}>{label}</button>
  :<button type="button" title={`${label} (you do not have access to this project)`} onClick={e=>{e.stopPropagation();onPick()}} className={cls}>{label}</button>}

function TaskRow({t}){
 const body=<>
  <TypeIcon type={t.type}/>
  <span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-semibold text-ink">{t.title}</span>
   <span className="block truncate text-[12px] text-sub">{issueKey({code:t.project_code},t)} · {t.project_name}</span></span>
  <PriorityIcon priority={t.priority}/><Lozenge s={t.status}/>{!t.can_open&&<Lock className="h-3.5 w-3.5 shrink-0 text-[#8A98AF]" aria-label="No access to this project"/>}</>;
 const cls="flex items-center gap-3 rounded-xl border border-line bg-white px-3 py-2.5";
 return t.can_open?<Link to={link(t)} className={`${cls} transition hover:border-primary/40 hover:bg-soft`}>{body}</Link>:<div className={cls} title="You do not have access to this project">{body}</div>}

export default function Calendar(){
 const today=todayStr(),[cursor,setCursor]=useState(()=>{const d=new Date();return new Date(d.getFullYear(),d.getMonth(),1)}),[sel,setSel]=useState(today),
  [project,setProject]=useState(''),[showDone,setShowDone]=useState(true);

 // Grid mulai Senin; jumlah minggu mengikuti bulan (5 atau 6)
 const grid=useMemo(()=>{const y=cursor.getFullYear(),m=cursor.getMonth(),offset=(new Date(y,m,1).getDay()+6)%7,weeks=Math.ceil((offset+new Date(y,m+1,0).getDate())/7);
  return Array.from({length:weeks*7},(_,i)=>new Date(y,m,1-offset+i))},[cursor]);
 const from=ymd(grid[0]),to=ymd(grid[grid.length-1]);
 const q=useGet(`/calendar?from=${from}&to=${to}`,{placeholderData:keepPreviousData});
 const all=q.data||[];
 const projects=useMemo(()=>[...new Map(all.map(t=>[t.project_id,t.project_code+' · '+t.project_name])).entries()],[all]);
 const tasks=all.filter(t=>(!project||t.project_id===project)&&(showDone||t.status!=='completed'));
 const byDay=useMemo(()=>{const m={};for(const t of tasks)(m[t.due_date]??=[]).push(t);return m},[tasks]);

 const month=cursor.toLocaleDateString('en-US',{month:'long',year:'numeric'});
 const inMonth=tasks.filter(t=>t.due_date.slice(0,7)===ymd(cursor).slice(0,7)),overdue=inMonth.filter(isOverdue).length,done=inMonth.filter(t=>t.status==='completed').length;
 const go=n=>setCursor(c=>new Date(c.getFullYear(),c.getMonth()+n,1));
 const goToday=()=>{const d=new Date();setCursor(new Date(d.getFullYear(),d.getMonth(),1));setSel(today)};
 const dayTasks=byDay[sel]||[];

 return <Need p="tasks.view"><div>
  <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
   <div><h1 className="text-2xl font-extrabold text-ink">Calendar</h1><p className="mt-1 text-sub">Tasks assigned to you, shown on their due dates.</p></div>
   <div className="flex flex-wrap items-center gap-2">
    <select aria-label="Filter by project" value={project} onChange={e=>setProject(e.target.value)} className="inp !h-9 !w-auto !py-0 text-[13px]"><option value="">All projects</option>{projects.map(([id,l])=><option key={id} value={id}>{l}</option>)}</select>
    <label className="flex h-9 items-center gap-2 rounded-xl border border-line bg-white px-3 text-[13px] font-medium text-ink"><input type="checkbox" checked={showDone} onChange={e=>setShowDone(e.target.checked)} className="accent-[#0B6FFB]"/>Show done</label></div></div>

  <div className="grid gap-5 xl:grid-cols-[1fr_22rem]">
   <section className="card !p-0 overflow-hidden" aria-label="Month view">
    <div className="flex items-center gap-2 border-b border-line px-4 py-3">
     <button type="button" aria-label="Previous month" onClick={()=>go(-1)} className="grid h-8 w-8 place-items-center rounded-lg text-ink transition hover:bg-soft"><ChevronLeft className="h-4 w-4"/></button>
     <button type="button" aria-label="Next month" onClick={()=>go(1)} className="grid h-8 w-8 place-items-center rounded-lg text-ink transition hover:bg-soft"><ChevronRight className="h-4 w-4"/></button>
     <h2 className="ml-1 text-[16px] font-extrabold text-ink" aria-live="polite">{month}</h2>
     <span className="flex-1"/>
     {q.isFetching&&<span className="text-xs text-sub">Updating…</span>}
     <button type="button" onClick={goToday} className="btn2 !px-3 !py-1.5 text-[13px]">Today</button></div>
    {q.error&&<p role="alert" className="px-4 py-3 text-bad">{q.error.message}</p>}
    <div className="grid grid-cols-7 border-b border-line bg-[#F7F9FD] text-center text-[11px] font-bold uppercase tracking-wide text-sub">{WEEKDAYS.map(w=><div key={w} className="py-2">{w}</div>)}</div>
    <div className="grid grid-cols-7">
     {grid.map(d=>{const k=ymd(d),list=byDay[k]||[],out=d.getMonth()!==cursor.getMonth(),isToday=k===today,isSel=k===sel,weekend=d.getDay()===0||d.getDay()===6;
      return <div key={k} role="button" tabIndex={0} aria-label={`${d.toDateString()}, ${list.length} task${list.length===1?'':'s'} due`} aria-pressed={isSel}
       onClick={()=>setSel(k)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setSel(k)}}}
       className={`min-h-[5.5rem] cursor-pointer border-b border-r border-line p-1.5 transition hover:bg-soft sm:min-h-[7.25rem] ${out?'bg-[#FAFBFD]':weekend?'bg-[#FBFCFE]':'bg-white'} ${isSel?'ring-2 ring-inset ring-primary/60':''}`}>
       <div className="mb-1 flex justify-end"><span className={`grid h-6 min-w-6 place-items-center rounded-full px-1 text-[12px] font-bold ${isToday?'bg-primary text-white':out?'text-[#A9B5C8]':'text-ink'}`}>{d.getDate()}</span></div>
       <div className="hidden space-y-1 sm:block">{list.slice(0,3).map(t=><Chip key={t.id} t={t} onPick={()=>setSel(k)}/>)}
        {list.length>3&&<button type="button" onClick={e=>{e.stopPropagation();setSel(k)}} className="px-1 text-[11px] font-semibold text-primary hover:underline">+{list.length-3} more</button>}</div>
       <div className="flex flex-wrap justify-center gap-0.5 sm:hidden">{list.slice(0,4).map(t=><span key={t.id} className={`h-1.5 w-1.5 rounded-full ${t.status==='completed'?'bg-ok':isOverdue(t)?'bg-bad':'bg-primary'}`}/>)}</div></div>})}</div></section>

   <aside className="space-y-5" aria-label="Selected day">
    <section className="card">
     <p className="text-xs font-bold uppercase tracking-wide text-sub">{sel===today?'Today':'Selected day'}</p>
     <h2 className="mt-0.5 text-[17px] font-extrabold text-ink">{parse(sel).toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'})}</h2>
     <div className="mt-4 space-y-2">{dayTasks.length?dayTasks.map(t=><TaskRow key={t.id} t={t}/>)
      :<div className="grid place-items-center gap-2 rounded-xl border border-dashed border-line py-8 text-center text-sub"><CalendarCheck className="h-6 w-6 text-[#9AA7BC]"/><span>{q.isLoading?'Loading…':'No tasks due on this day'}</span></div>}</div></section>
    <section className="card">
     <h2 className="text-[14px] font-extrabold text-ink">{month}</h2>
     <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
      {[['Due',inMonth.length,'text-ink'],['Overdue',overdue,overdue?'text-bad':'text-ink'],['Done',done,'text-ok']].map(([l,n,c])=><div key={l} className="rounded-xl bg-[#F7F9FD] py-3"><dd className={`text-xl font-extrabold ${c}`}>{n}</dd><dt className="text-[11px] font-semibold text-sub">{l}</dt></div>)}</dl>
     {inMonth.filter(isOverdue).slice(0,3).map(t=><button key={t.id} type="button" onClick={()=>setSel(t.due_date)} className="mt-2 flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-[12px] transition hover:bg-soft"><span className="truncate font-medium text-ink">{t.title}</span><span className="shrink-0 font-semibold text-bad">{fmtDay(t.due_date)}</span></button>)}</section></aside></div></div></Need>}
