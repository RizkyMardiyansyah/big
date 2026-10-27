import {useState,useEffect,useRef,useMemo} from 'react';
import {useMutation,useQueryClient} from '@tanstack/react-query';
import {SquareCheck,Bug,Bookmark,ChevronUp,ChevronDown,Equal,X,Check,User as UserIcon,Search,FolderKanban,Headset,Briefcase} from 'lucide-react';
import {api,useGet} from '../../lib/api';

// ---- Constants (Jira-style workflow: To Do -> In Progress -> In Review -> Done)
export const COLUMNS=[['todo','To Do'],['in_progress','In Progress'],['in_review','In Review'],['completed','Done']];
export const STATUS_LABEL={todo:'To Do',in_progress:'In Progress',in_review:'In Review',completed:'Done',cancelled:'Cancelled'};
export const PROJECT_STATUS=[['planning','Planning'],['in_progress','In Progress'],['on_hold','On Hold'],['completed','Completed'],['cancelled','Cancelled']];
export const TYPES=[['task','Task'],['bug','Bug'],['story','Story']];
export const PRIORITIES=[['high','High'],['medium','Medium'],['low','Low']];
export const issueKey=(p,t)=>`${p?.code||'?'}-${t.issue_no??'?'}`;

// ---- Date helpers
const day=d=>d?new Date(String(d).length===10?d+'T00:00:00':d):null;
export const todayStr=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
export const fmtDay=d=>{const x=day(d);return x&&!isNaN(x)?x.toLocaleDateString('en-US',{month:'short',day:'numeric',...(x.getFullYear()!==new Date().getFullYear()?{year:'numeric'}:{})}):''};
export const fmtFull=d=>{const x=new Date(d);return isNaN(x)?'':x.toLocaleString('en-US',{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'})};
export const ago=d=>{const t=new Date(d).getTime();if(isNaN(t))return '';const m=Math.max(0,Math.round((Date.now()-t)/6e4));if(m<1)return 'just now';if(m<60)return `${m} minute${m>1?'s':''} ago`;const h=Math.round(m/60);if(h<24)return `${h} hour${h>1?'s':''} ago`;const x=Math.round(h/24);return x<30?`${x} day${x>1?'s':''} ago`:fmtDay(d)};
export const isOverdue=t=>!!t.due_date&&t.status!=='completed'&&t.status!=='cancelled'&&t.due_date<todayStr();

// ---- Visual atoms
const PALETTE=['#0B6FFB','#7C4DFF','#14A8A0','#E5493A','#E97F33','#2F9E5B','#C2417F','#4B5D7E'];
export const hue=s=>PALETTE[[...String(s||'?')].reduce((a,c)=>a+c.charCodeAt(0),0)%PALETTE.length];
export const initials=n=>String(n||'?').trim().split(/\s+/).slice(0,2).map(w=>w[0]).join('').toUpperCase();
export function Avatar({name,size='h-6 w-6',text='text-[10px]',title,ring=false}){
 if(!name)return <span title="Unassigned" className={`grid shrink-0 place-items-center rounded-full bg-[#DFE4EC] text-[#6B7A94] ${size}`}><UserIcon className="h-[60%] w-[60%]"/></span>;
 return <span title={title??name} className={`grid shrink-0 place-items-center rounded-full font-bold text-white ${size} ${text} ${ring?'ring-2 ring-white':''}`} style={{background:hue(name)}}>{initials(name)}</span>}
export function ProjectAvatar({p,size='h-8 w-8',text='text-xs'}){return <span className={`grid shrink-0 place-items-center rounded-[6px] font-extrabold text-white ${size} ${text}`} style={{background:hue(p?.code||p?.name)}}>{String(p?.code||p?.name||'?').slice(0,2).toUpperCase()}</span>}
const TY={task:['#4BADE8',SquareCheck],bug:['#E5493A',Bug],story:['#63BA3C',Bookmark]};
export function TypeIcon({type='task',size='h-4 w-4'}){const [c,I]=TY[type]||TY.task;return <span title={TYPES.find(t=>t[0]===type)?.[1]} className={`grid shrink-0 place-items-center rounded-[3px] text-white ${size}`} style={{background:c}}><I className="h-[72%] w-[72%]" strokeWidth={2.4}/></span>}
const PR={high:['#E5493A',ChevronUp,'High'],medium:['#E97F33',Equal,'Medium'],low:['#2684FF',ChevronDown,'Low']};
export function PriorityIcon({priority='medium',cls='h-4 w-4'}){const [c,I,l]=PR[priority]||PR.medium;return <span title={`${l} priority`} className="inline-grid shrink-0 place-items-center" style={{color:c}}><I className={cls} strokeWidth={3}/></span>}
const LOZ={todo:'bg-[#DFE4EC] text-[#42526E]',in_progress:'bg-[#DCE9FF] text-[#0747A6]',in_review:'bg-[#E8E3FF] text-[#403294]',completed:'bg-[#DCF5E7] text-[#00663F]',cancelled:'bg-[#EEF0F4] text-[#6B7A94]',planning:'bg-[#DFE4EC] text-[#42526E]',on_hold:'bg-[#FFEBD0] text-[#8A4B00]'};
export const Lozenge=({s,label})=><span className={`inline-block max-w-full truncate rounded-[4px] px-1.5 py-0.5 text-[11px] font-bold uppercase leading-4 tracking-wide ${LOZ[s]||LOZ.todo}`}>{label||STATUS_LABEL[s]||s}</span>;

// ---- Popover select (used for status, assignee, priority, type)
export function Pick({value,options,onChange,children,align='left',searchable=false,width='w-56',disabled=false,btnClass='',label}){
 const [open,setOpen]=useState(false),[q,setQ]=useState(''),ref=useRef(null);
 useEffect(()=>{if(!open)return;const h=e=>{if(ref.current&&!ref.current.contains(e.target))setOpen(false)},k=e=>{if(e.key==='Escape'){e.stopPropagation();setOpen(false)}};document.addEventListener('mousedown',h);document.addEventListener('keydown',k,true);return()=>{document.removeEventListener('mousedown',h);document.removeEventListener('keydown',k,true)}},[open]);
 useEffect(()=>{if(!open)setQ('')},[open]);
 const list=searchable&&q?options.filter(o=>String(o.label).toLowerCase().includes(q.toLowerCase())):options;
 return <div ref={ref} className="relative inline-block max-w-full">
  <button type="button" disabled={disabled} aria-haspopup="listbox" aria-expanded={open} aria-label={label} onClick={()=>setOpen(!open)} className={btnClass||'flex max-w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-left transition hover:bg-[#EEF2F8] disabled:cursor-default disabled:hover:bg-transparent'}>{children}</button>
  {open&&<div role="listbox" className={`animate-pop absolute z-[70] mt-1 max-h-72 overflow-y-auto rounded-lg border border-line bg-white py-1 shadow-[0_8px_24px_rgba(9,30,66,.18)] ${width} ${align==='right'?'right-0 origin-top-right':'left-0 origin-top-left'}`}>
   {searchable&&<div className="relative px-2 pb-1 pt-1"><Search className="pointer-events-none absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8A98AF]"/><input autoFocus value={q} onChange={e=>setQ(e.target.value)} placeholder="Search" className="h-8 w-full rounded-md border border-line pl-7 pr-2 text-[13px] focus:border-primary focus:outline-none"/></div>}
   {list.map(o=><button key={String(o.value)} type="button" role="option" aria-selected={o.value===value} onClick={()=>{setOpen(false);o.value!==value&&onChange(o.value)}} className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-[13px] transition hover:bg-[#F2F6FC] ${o.value===value?'font-semibold text-ink':'text-[#3A4A66]'}`}>{o.icon}<span className="min-w-0 flex-1 truncate">{o.label}</span>{o.value===value&&<Check className="h-3.5 w-3.5 text-primary"/>}</button>)}
   {list.length===0&&<p className="px-3 py-2 text-[13px] text-sub">No results</p>}</div>}</div>}

// ---- Modal shell
export function Modal({onClose,children,wide=false,labelledBy}){
 useEffect(()=>{const k=e=>{if(e.key==='Escape')onClose()};document.addEventListener('keydown',k);const o=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.removeEventListener('keydown',k);document.body.style.overflow=o}},[onClose]);
 return <div className="animate-fade fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-[#091E42]/55 p-3 sm:p-8" onMouseDown={e=>e.target===e.currentTarget&&onClose()}>
  <div role="dialog" aria-modal="true" aria-labelledby={labelledBy} className={`animate-pop relative my-auto w-full ${wide?'max-w-[62rem]':'max-w-[34rem]'} rounded-xl bg-white shadow-[0_18px_48px_rgba(9,30,66,.32)]`}>{children}</div></div>}
export const CloseBtn=({onClick,cls=''})=><button type="button" onClick={onClick} aria-label="Close" className={`grid h-8 w-8 place-items-center rounded-md text-[#5F6F89] transition hover:bg-[#EEF2F8] hover:text-ink ${cls}`}><X className="h-[18px] w-[18px]"/></button>;

// ---- Data hooks
export function useDirectory(){const q=useGet('/directory'),list=q.data||[];return {list,name:id=>list.find(u=>u.id===id)?.full_name||null}}
export function useIssues(pid){
 const qc=useQueryClient(),key=`/projects/${pid}/tasks`,q=useGet(key,{enabled:!!pid}),[error,setError]=useState(null);
 const sync=id=>{qc.invalidateQueries({queryKey:[key]});qc.invalidateQueries({queryKey:['/dashboard']});qc.invalidateQueries({queryKey:['/projects']});qc.invalidateQueries({predicate:q=>String(q.queryKey[0]).startsWith('/calendar')});id&&qc.invalidateQueries({queryKey:['/tasks/'+id]})};
 const update=useMutation({mutationFn:({id,...b})=>api(`/tasks/${id}`,{method:'PATCH',body:b}),
  onMutate:async({id,...b})=>{await qc.cancelQueries({queryKey:[key]});const prev=qc.getQueryData([key]);setError(null);
   qc.setQueryData([key],o=>o?.map(t=>t.id===id?{...t,...b,...(b.status==='completed'?{completion:100}:{}),updated_at:new Date().toISOString()}:t));return {prev}},
  onError:(e,v,ctx)=>{ctx?.prev&&qc.setQueryData([key],ctx.prev);setError(e)},onSettled:(d,e,v)=>sync(v.id)});
 const create=useMutation({mutationFn:b=>api(key,{method:'POST',body:b}),onSuccess:()=>{setError(null);sync()},onError:setError});
 const remove=useMutation({mutationFn:id=>api(`/tasks/${id}`,{method:'DELETE'}),onSuccess:()=>{setError(null);sync()},onError:setError});
 return {issues:q.data||[],loading:q.isLoading,loadError:q.error,error,clearError:()=>setError(null),update,create,remove};
}
export function useProject(pid){const q=useGet('/projects'),p=q.data?.find(x=>x.id===pid)||null;return {project:p,loading:q.isLoading,error:q.error}}
export const fmtSize=n=>n>=1048576?(n/1048576).toFixed(1)+' MB':n>=1024?Math.round(n/1024)+' KB':n+' B';

// ---- Project type: Project / Support / Presales
export const PROJECT_TYPES=[['project','Project'],['support','Support'],['presales','Presales']];
const PT={project:['#0A57C8','#E8F1FF',FolderKanban],support:['#0B7A75','#DDF5F3',Headset],presales:['#5B3BC4','#EEE8FF',Briefcase]};
export const ptLabel=v=>PROJECT_TYPES.find(t=>t[0]===v)?.[1]||'Project';
export function TypeBadge({type='project',size='md'}){const [fg,bg,I]=PT[type]||PT.project;return <span className={`inline-flex shrink-0 items-center gap-1 rounded-md font-semibold ${size==='sm'?'px-1.5 py-0.5 text-[11px]':'px-2 py-0.5 text-[12px]'}`} style={{color:fg,background:bg}}><I className={size==='sm'?'h-3 w-3':'h-3.5 w-3.5'}/>{ptLabel(type)}</span>}
export const typeOptions=PROJECT_TYPES.map(([v,l])=>({value:v,label:l,icon:<TypeBadge type={v} size="sm"/>}));
