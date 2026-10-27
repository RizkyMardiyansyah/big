import {useState,useEffect} from 'react';
import {useOutletContext} from 'react-router-dom';
import {useMutation,useQueryClient} from '@tanstack/react-query';
import {X,Plus} from 'lucide-react';
import {api as http,useGet} from '../../lib/api';
import {Err} from '../../lib/ui';
import {Avatar,Pick,PROJECT_STATUS,PROJECT_TYPES,PRIORITIES} from './shared';
import {PartnerPicker,CustomerPicker} from './pickers';

export default function ProjectSettings(){
 const {project:p,dir,can}=useOutletContext(),qc=useQueryClient(),edit=can('projects.edit'),mk=`/projects/${p.id}/members`,mem=useGet(mk);
 const init=()=>({name:p.name,description:p.description||'',manager_id:p.manager_id||'',status:p.status,priority:p.priority||'medium',due_date:p.due_date||'',partner_id:p.partner_id||'',customer_id:p.customer_id||'',type:p.type||'project'});
 const [f,setF]=useState(init),[err,setErr]=useState(null),[ok,setOk]=useState(false);
 useEffect(()=>setF(init()),[p.id,p.name,p.status,p.manager_id,p.due_date,p.priority,p.description,p.partner_id,p.customer_id,p.type]); // eslint-disable-line
 const save=useMutation({mutationFn:()=>http(`/projects/${p.id}`,{method:'PATCH',body:{...f,manager_id:f.manager_id||null,due_date:f.due_date||null,partner_id:f.partner_id||null,customer_id:f.customer_id||null}}),onSuccess:()=>{setErr(null);setOk(true);qc.invalidateQueries({queryKey:['/projects']});setTimeout(()=>setOk(false),2000)},onError:e=>{setOk(false);setErr(e)}});
 const add=useMutation({mutationFn:u=>http(mk,{method:'POST',body:{user_id:u}}),onSuccess:()=>{setErr(null);qc.invalidateQueries({queryKey:[mk]})},onError:setErr});
 const del=useMutation({mutationFn:u=>http(`${mk}/${u}`,{method:'DELETE'}),onSuccess:()=>qc.invalidateQueries({queryKey:[mk]}),onError:setErr});
 const ids=(mem.data||[]).map(m=>m.user_id),free=dir.list.filter(u=>!ids.includes(u.id));
 const L=({t,children})=><label className="block"><span className="mb-1 block text-xs font-semibold text-[#5F6F89]">{t}</span>{children}</label>;
 return <div className="grid max-w-5xl gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
  <form className="rounded-xl border border-line bg-white p-5" onSubmit={e=>{e.preventDefault();setOk(false);save.mutate()}}><h2 className="mb-4 text-[15px] font-bold text-ink">Details</h2>
   <div className="grid gap-4 sm:grid-cols-2">
    <div className="sm:col-span-2"><L t="Name"><input required disabled={!edit} className="inp !rounded-md" value={f.name} onChange={e=>setF({...f,name:e.target.value})}/></L></div>
    <L t="Key"><input disabled className="inp !rounded-md" value={p.code}/></L>
    <L t="Project lead"><select disabled={!edit} className="inp !rounded-md" value={f.manager_id} onChange={e=>setF({...f,manager_id:e.target.value})}><option value="">Unassigned</option>{dir.list.map(u=><option key={u.id} value={u.id}>{u.full_name}</option>)}</select></L>
    <L t="Type"><select disabled={!edit} className="inp !rounded-md" value={f.type} onChange={e=>setF({...f,type:e.target.value})}>{PROJECT_TYPES.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></L>
    <div><span className="mb-1 block text-xs font-semibold text-[#5F6F89]">Customer</span><CustomerPicker value={f.customer_id||null} onChange={v=>setF({...f,customer_id:v||''})} disabled={!edit}/></div>
    <div><span className="mb-1 block text-xs font-semibold text-[#5F6F89]">Partner</span><PartnerPicker value={f.partner_id||null} onChange={v=>setF({...f,partner_id:v||''})} disabled={!edit}/></div>
    <L t="Status"><select disabled={!edit} className="inp !rounded-md" value={f.status} onChange={e=>setF({...f,status:e.target.value})}>{PROJECT_STATUS.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></L>
    <L t="Priority"><select disabled={!edit} className="inp !rounded-md" value={f.priority} onChange={e=>setF({...f,priority:e.target.value})}>{PRIORITIES.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></L>
    <L t="Due date"><input type="date" disabled={!edit} className="inp !rounded-md" value={f.due_date} onChange={e=>setF({...f,due_date:e.target.value})}/></L>
    <div className="sm:col-span-2"><L t="Description"><textarea rows={4} disabled={!edit} className="inp !rounded-md" value={f.description} onChange={e=>setF({...f,description:e.target.value})}/></L></div></div>
   {edit?<div className="mt-4 flex items-center gap-3"><button className="btn !rounded-md" disabled={save.isPending}>Save changes</button>{ok&&<span className="text-[13px] font-medium text-ok" role="status">Saved</span>}</div>:<p className="mt-4 text-[13px] text-[#6B7A94]">You do not have permission to edit project details.</p>}<div className="mt-3"><Err e={err}/></div></form>
  <section className="rounded-xl border border-line bg-white p-5"><div className="mb-4 flex items-center justify-between gap-2"><h2 className="text-[15px] font-bold text-ink">Members</h2>
    {edit&&free.length>0&&<Pick value={null} onChange={u=>add.mutate(u)} searchable align="right" width="w-64" label="Add member" options={free.map(u=>({value:u.id,label:u.full_name,icon:<Avatar name={u.full_name} size="h-5 w-5" text="text-[9px]"/>}))} btnClass="flex h-8 items-center gap-1 rounded-md bg-[#EEF2F8] px-2.5 text-[13px] font-semibold text-[#42526E] transition hover:bg-[#E3E9F3]"><Plus className="h-4 w-4"/>Add member</Pick>}</div>
   <ul className="space-y-1">{p.manager_id&&<li className="flex items-center gap-3 rounded-lg px-2 py-1.5"><Avatar name={dir.name(p.manager_id)} size="h-8 w-8" text="text-[11px]"/><span className="flex-1 truncate text-[13px] font-medium text-ink">{dir.name(p.manager_id)}</span><span className="rounded bg-[#E8F1FF] px-1.5 py-0.5 text-[11px] font-semibold text-[#0A57C8]">Lead</span></li>}
    {ids.filter(i=>i!==p.manager_id).map(i=><li key={i} className="group flex items-center gap-3 rounded-lg px-2 py-1.5 transition hover:bg-[#F7F9FC]"><Avatar name={dir.name(i)} size="h-8 w-8" text="text-[11px]"/><span className="flex-1 truncate text-[13px] font-medium text-ink">{dir.name(i)||'Unknown'}</span>
      {edit&&<button aria-label={`Remove ${dir.name(i)}`} onClick={()=>confirm(`Remove ${dir.name(i)} from this project?`)&&del.mutate(i)} className="grid h-7 w-7 place-items-center rounded-md text-[#8A98AF] opacity-0 transition hover:bg-[#EEF2F8] hover:text-bad focus:opacity-100 group-hover:opacity-100"><X className="h-4 w-4"/></button>}</li>)}
    {!mem.isLoading&&ids.length===0&&!p.manager_id&&<li className="py-4 text-center text-[13px] text-[#8A98AF]">No members yet.</li>}</ul>
   <p className="mt-3 text-[12px] leading-5 text-[#6B7A94]">The project lead, the creator and listed members can see this project.</p></section></div>}
