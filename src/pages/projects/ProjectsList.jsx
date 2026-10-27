import {useState,useMemo,useEffect} from 'react';
import {Link,useNavigate} from 'react-router-dom';
import {useMutation,useQueryClient} from '@tanstack/react-query';
import {Star,Plus,Search,FolderKanban} from 'lucide-react';
import {api,useGet} from '../../lib/api';
import {useAuth} from '../../lib/auth';
import {Err} from '../../lib/ui';
import {ProjectAvatar,Avatar,Lozenge,Modal,CloseBtn,Pick,PROJECT_STATUS,PROJECT_TYPES,TypeBadge,fmtDay,useDirectory} from './shared';
import {PartnerPicker,CustomerPicker,useActors} from './pickers';

const KEYS='big_starred_projects';
const loadStars=()=>{try{return JSON.parse(localStorage.getItem(KEYS)||'[]')}catch{return []}};
export const suggestKey=name=>{const w=name.replace(/[^A-Za-z0-9 ]/g,'').split(/\s+/).filter(Boolean);return (w.length>1?w.map(x=>x[0]).join('').slice(0,5):(w[0]||'').slice(0,4)).toUpperCase()};

function CreateProject({onClose}){
 const qc=useQueryClient(),nav=useNavigate(),dir=useDirectory(),[f,setF]=useState({name:'',code:'',manager_id:'',due_date:'',partner_id:'',customer_id:'',type:'project'}),[touched,setTouched]=useState(false),[err,setErr]=useState(null);
 const m=useMutation({mutationFn:()=>api('/projects',{method:'POST',body:{...f,manager_id:f.manager_id||null,due_date:f.due_date||null,partner_id:f.partner_id||null,customer_id:f.customer_id||null}}),onSuccess:d=>{qc.invalidateQueries({queryKey:['/projects']});onClose();nav(`/app/projects/${d.id}/board`)},onError:setErr});
 const set=(k,v)=>setF(o=>({...o,[k]:v,...(k==='name'&&!touched?{code:suggestKey(v)}:{})}));
 return <Modal onClose={onClose} labelledBy="cp-title"><form onSubmit={e=>{e.preventDefault();setErr(null);m.mutate()}}>
  <div className="flex items-center justify-between px-6 pb-2 pt-5"><h2 id="cp-title" className="text-[20px] font-bold text-ink">Create project</h2><CloseBtn onClick={onClose}/></div>
  <div className="space-y-4 px-6 pb-2 pt-2">
   <label className="block"><span className="mb-1 block text-xs font-semibold text-[#5F6F89]">Name <span className="text-bad">*</span></span><input autoFocus required maxLength={200} className="inp" value={f.name} onChange={e=>set('name',e.target.value)} placeholder="e.g. Website redesign"/></label>
   <div><span className="mb-1 block text-xs font-semibold text-[#5F6F89]">Type</span><div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Project type">{PROJECT_TYPES.map(([v,l])=><button key={v} type="button" role="radio" aria-checked={f.type===v} onClick={()=>setF({...f,type:v})} className={`flex h-10 items-center justify-center rounded-xl border text-[13px] font-semibold transition ${f.type===v?'border-primary bg-[#E8F1FF] text-[#0A57C8]':'border-line bg-white text-[#3A4A66] hover:bg-soft'}`}>{l}</button>)}</div></div>
   <label className="block"><span className="mb-1 block text-xs font-semibold text-[#5F6F89]">Key <span className="text-bad">*</span></span><input required maxLength={10} pattern="[A-Za-z][A-Za-z0-9]{1,9}" title="2-10 letters or numbers, starting with a letter" className="inp w-40 uppercase" value={f.code} onChange={e=>{setTouched(true);setF({...f,code:e.target.value.toUpperCase()})}}/><span className="mt-1 block text-xs text-[#6B7A94]">Task keys will look like {f.code||'KEY'}-1. The key cannot be changed later.</span></label>
   <div className="grid gap-4 sm:grid-cols-2">
    <label className="block"><span className="mb-1 block text-xs font-semibold text-[#5F6F89]">Project lead</span><select className="inp" value={f.manager_id} onChange={e=>setF({...f,manager_id:e.target.value})}><option value="">Unassigned</option>{dir.list.map(u=><option key={u.id} value={u.id}>{u.full_name}</option>)}</select></label>
    <label className="block"><span className="mb-1 block text-xs font-semibold text-[#5F6F89]">Due date</span><input type="date" className="inp" value={f.due_date} onChange={e=>setF({...f,due_date:e.target.value})}/></label></div>
   <div><span className="mb-1 block text-xs font-semibold text-[#5F6F89]">Customer</span><CustomerPicker value={f.customer_id||null} onChange={v=>setF({...f,customer_id:v||''})}/><span className="mt-1 block text-xs text-[#6B7A94]">Who is this project for? Type a new name to add a customer.</span></div>
   <div><span className="mb-1 block text-xs font-semibold text-[#5F6F89]">Partner</span><PartnerPicker value={f.partner_id||null} onChange={v=>setF({...f,partner_id:v||''})}/><span className="mt-1 block text-xs text-[#6B7A94]">Type a new name to add a partner.</span></div>
   <Err e={err}/></div>
  <div className="flex justify-end gap-2 px-6 pb-5 pt-4"><button type="button" className="btn2" onClick={onClose}>Cancel</button><button className="btn" disabled={m.isPending}>{m.isPending?'Creating…':'Create project'}</button></div></form></Modal>}

export default function ProjectsList(){
 const {can}=useAuth(),list=useGet('/projects'),dir=useDirectory(),actors=useActors(),custs=useGet('/customers'),[ty,setTy]=useState(''),[cu,setCu]=useState(''),[q,setQ]=useState(''),[st,setSt]=useState(''),[show,setShow]=useState(false),[stars,setStars]=useState(loadStars);
 useEffect(()=>{try{localStorage.setItem(KEYS,JSON.stringify(stars))}catch{}},[stars]);
 const custName=id=>custs.data?.find(c=>c.id===id)?.name||null;
 const toggle=id=>setStars(s=>s.includes(id)?s.filter(x=>x!==id):[...s,id]);
 const rows=useMemo(()=>(list.data||[]).filter(p=>(!st||p.status===st)&&(!ty||(p.type||'project')===ty)&&(!cu||p.customer_id===cu)&&(p.name+' '+p.code).toLowerCase().includes(q.toLowerCase())).sort((a,b)=>(stars.includes(b.id)-stars.includes(a.id))||a.name.localeCompare(b.name)),[list.data,q,st,ty,cu,stars]);
 return <div>
  <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h1 className="text-[24px] font-bold text-ink">Projects</h1>{can('projects.create')&&<button className="btn !rounded-lg" onClick={()=>setShow(true)}><Plus className="h-4 w-4"/>Create project</button>}</div>
  <div className="mb-4 flex flex-wrap items-center gap-3">
   <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7B8AA5]"/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search projects" aria-label="Search projects" className="h-9 w-64 rounded-md border border-line bg-white pl-9 pr-3 text-[13px] transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"/></div>
   <Pick value={st} onChange={setSt} options={[{value:'',label:'All statuses'},...PROJECT_STATUS.map(([v,l])=>({value:v,label:l}))]} btnClass="flex h-9 items-center gap-2 rounded-md border border-line bg-white px-3 text-[13px] font-medium text-[#3A4A66] transition hover:bg-soft">{st?PROJECT_STATUS.find(s=>s[0]===st)?.[1]:'All statuses'}<span className="text-[#8A98AF]">▾</span></Pick>
   <Pick value={ty} onChange={setTy} options={[{value:'',label:'All types'},...PROJECT_TYPES.map(([v,l])=>({value:v,label:l}))]} btnClass="flex h-9 items-center gap-2 rounded-md border border-line bg-white px-3 text-[13px] font-medium text-[#3A4A66] transition hover:bg-soft">{ty?PROJECT_TYPES.find(t=>t[0]===ty)?.[1]:'All types'}<span className="text-[#8A98AF]">▾</span></Pick>
   <Pick value={cu} onChange={setCu} searchable width="w-64" options={[{value:'',label:'All customers'},...(custs.data||[]).map(c=>({value:c.id,label:c.name}))]} btnClass="flex h-9 items-center gap-2 rounded-md border border-line bg-white px-3 text-[13px] font-medium text-[#3A4A66] transition hover:bg-soft"><span className="max-w-[10rem] truncate">{cu?custName(cu):'All customers'}</span><span className="text-[#8A98AF]">▾</span></Pick></div>
  <Err e={list.error}/>
  <div className="overflow-x-auto rounded-xl border border-line bg-white">
   <table className="w-full min-w-[68rem] text-left"><thead className="border-b border-line bg-[#FAFBFD]"><tr className="text-[12px] text-[#5F6F89]"><th className="w-12 !py-3 pl-4"><span className="sr-only">Starred</span></th><th className="!py-3">Name</th><th>Key</th><th>Type</th><th>Customer</th><th>Partner</th><th>Status</th><th>Lead</th><th>Progress</th><th className="pr-4">Due date</th></tr></thead>
   <tbody>{rows.map(p=>{const lead=dir.name(p.manager_id),starred=stars.includes(p.id),pct=p.issue_total?Math.round(p.issue_done/p.issue_total*100):0;
    return <tr key={p.id} className="group border-t border-line transition-colors hover:bg-[#F7FAFE]">
     <td className="pl-4"><button onClick={()=>toggle(p.id)} aria-label={starred?`Unstar ${p.name}`:`Star ${p.name}`} aria-pressed={starred} className="grid h-8 w-8 place-items-center rounded-md transition hover:bg-[#EEF2F8]"><Star className={`h-4 w-4 transition ${starred?'fill-[#F5B301] text-[#F5B301]':'text-[#9AA7BC] group-hover:text-[#6B7A94]'}`}/></button></td>
     <td className="!py-3"><Link to={`${p.id}/board`} className="flex items-center gap-3 font-semibold text-ink hover:text-primary hover:underline"><ProjectAvatar p={p}/><span className="min-w-0 truncate">{p.name}</span></Link></td>
     <td className="text-[#3A4A66]">{p.code}</td><td><TypeBadge type={p.type||'project'}/></td><td>{custName(p.customer_id)?<span className="inline-block max-w-[10rem] truncate rounded-md bg-[#F1F4F9] px-2 py-0.5 text-[12px] font-semibold text-[#3A4A66]">{custName(p.customer_id)}</span>:<span className="text-[#8A98AF]">—</span>}</td>
     <td>{actors.partnerName(p.partner_id)?<span className="inline-flex max-w-[10rem] items-center gap-1.5 truncate rounded-md bg-[#E8F1FF] px-2 py-0.5 text-[12px] font-semibold text-[#0A57C8]">{actors.partnerName(p.partner_id)}</span>:<span className="text-[#8A98AF]">—</span>}</td>
     <td><Lozenge s={p.status} label={PROJECT_STATUS.find(s=>s[0]===p.status)?.[1]}/></td>
     <td>{lead?<span className="flex items-center gap-2"><Avatar name={lead}/><span className="max-w-[10rem] truncate">{lead}</span></span>:<span className="text-[#8A98AF]">Unassigned</span>}</td>
     <td className="w-44"><div className="flex items-center gap-2"><span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#E6EBF3]"><span className="block h-full rounded-full bg-ok transition-[width] duration-500" style={{width:pct+'%'}}/></span><span className="w-16 text-right text-[12px] text-[#5F6F89]">{p.issue_done}/{p.issue_total}</span></div></td>
     <td className="pr-4 text-[#3A4A66]">{p.due_date?fmtDay(p.due_date):'—'}</td></tr>})}</tbody></table>
   {list.isLoading&&<p className="py-10 text-center text-sub">Loading projects…</p>}
   {list.data&&rows.length===0&&<div className="grid place-items-center px-6 py-14 text-center"><span className="grid h-12 w-12 place-items-center rounded-full bg-[#E8F1FF] text-primary"><FolderKanban className="h-6 w-6"/></span><p className="mt-3 font-semibold text-ink">{list.data.length?'No projects match your search':'No projects yet'}</p><p className="mt-1 text-sub">{list.data.length?'Try a different name or key.':can('projects.create')?'Create your first project to start tracking tasks on a board.':'You have not been added to any project yet.'}</p>{!list.data.length&&can('projects.create')&&<button className="btn mt-4 !rounded-lg" onClick={()=>setShow(true)}><Plus className="h-4 w-4"/>Create project</button>}</div>}</div>
  {show&&<CreateProject onClose={()=>setShow(false)}/>}</div>}
