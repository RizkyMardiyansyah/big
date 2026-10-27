import {useState,useMemo} from 'react';
import {Link} from 'react-router-dom';
import {useMutation,useQueryClient} from '@tanstack/react-query';
import {Plus,Search,Pencil,Trash2,Handshake,Mail,Phone} from 'lucide-react';
import {api,useGet} from '../lib/api';
import {useAuth} from '../lib/auth';
import {Err} from '../lib/ui';
import {Modal,CloseBtn} from './projects/shared';
import {ActorAvatar} from './projects/pickers';

function PartnerForm({p,onClose}){
 const qc=useQueryClient(),[f,setF]=useState({name:p?.name||'',email:p?.email||'',phone:p?.phone||'',notes:p?.notes||''}),[err,setErr]=useState(null);
 const m=useMutation({mutationFn:()=>api(p?`/partners/${p.id}`:'/partners',{method:p?'PATCH':'POST',body:f}),onSuccess:()=>{qc.invalidateQueries({queryKey:['/partners']});onClose()},onError:setErr});
 const F=({t,k,type='text',rows})=><label className="block"><span className="mb-1 block text-xs font-semibold text-[#5F6F89]">{t}</span>{rows?<textarea rows={rows} maxLength={1000} className="inp !rounded-md" value={f[k]} onChange={e=>setF({...f,[k]:e.target.value})}/>:<input type={type} maxLength={k==='phone'?50:200} className="inp !rounded-md" value={f[k]} onChange={e=>setF({...f,[k]:e.target.value})}/>}</label>;
 return <Modal onClose={onClose} labelledBy="pf-title"><form onSubmit={e=>{e.preventDefault();setErr(null);m.mutate()}}>
  <div className="flex items-center justify-between px-6 pb-2 pt-5"><h2 id="pf-title" className="text-[20px] font-bold text-ink">{p?'Edit partner':'Add partner'}</h2><CloseBtn onClick={onClose}/></div>
  <div className="space-y-4 px-6 pb-2 pt-2"><label className="block"><span className="mb-1 block text-xs font-semibold text-[#5F6F89]">Name <span className="text-bad">*</span></span><input autoFocus required maxLength={200} className="inp !rounded-md" value={f.name} onChange={e=>setF({...f,name:e.target.value})}/></label>
   <div className="grid gap-4 sm:grid-cols-2"><F t="Email" k="email" type="email"/><F t="Phone" k="phone"/></div><F t="Notes" k="notes" rows={3}/><Err e={err}/></div>
  <div className="flex justify-end gap-2 px-6 pb-5 pt-4"><button type="button" className="btn2" onClick={onClose}>Cancel</button><button className="btn" disabled={m.isPending}>{p?'Save changes':'Add partner'}</button></div></form></Modal>}

export default function Partners(){
 const {can}=useAuth(),qc=useQueryClient(),list=useGet('/partners'),[q,setQ]=useState(''),[form,setForm]=useState(null),[err,setErr]=useState(null),edit=can('projects.edit'),add=edit||can('tasks.edit')||can('projects.create');
 const del=useMutation({mutationFn:id=>api(`/partners/${id}`,{method:'DELETE'}),onSuccess:()=>{qc.invalidateQueries({queryKey:['/partners']});qc.invalidateQueries({queryKey:['/projects']})},onError:setErr});
 const rows=useMemo(()=>(list.data||[]).filter(p=>(p.name+' '+(p.email||'')).toLowerCase().includes(q.toLowerCase())),[list.data,q]);
 return <div>
  <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-[24px] font-bold text-ink">Partners</h1><p className="mt-0.5 text-[13px] text-sub">External companies and people you work with. Partners can be set on projects and assigned to tasks.</p></div>{add&&<button className="btn !rounded-lg" onClick={()=>setForm({})}><Plus className="h-4 w-4"/>Add partner</button>}</div>
  <div className="relative mb-4 w-64"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7B8AA5]"/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search partners" aria-label="Search partners" className="h-9 w-full rounded-md border border-line bg-white pl-9 pr-3 text-[13px] transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"/></div>
  <Err e={list.error||err}/>
  <div className="overflow-x-auto rounded-xl border border-line bg-white">
   <table className="w-full min-w-[48rem] text-left"><thead className="border-b border-line bg-[#FAFBFD]"><tr className="text-[12px] text-[#5F6F89]"><th className="!py-3 pl-4">Name</th><th>Contact</th><th>Projects</th><th>Tasks</th>{edit&&<th className="w-24 pr-4"><span className="sr-only">Actions</span></th>}</tr></thead>
   <tbody>{rows.map(p=><tr key={p.id} className="group border-t border-line transition-colors hover:bg-[#F7FAFE]">
    <td className="!py-3 pl-4"><span className="flex items-center gap-3"><ActorAvatar a={{type:'partner',id:p.id,name:p.name}} size="h-9 w-9" text="text-xs"/><span className="min-w-0"><span className="block truncate font-semibold text-ink">{p.name}</span>{p.notes&&<span className="block max-w-[16rem] truncate text-[12px] text-[#6B7A94]">{p.notes}</span>}</span></span></td>
    <td className="text-[13px] text-[#3A4A66]">{p.email&&<span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-[#8A98AF]"/>{p.email}</span>}{p.phone&&<span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-[#8A98AF]"/>{p.phone}</span>}{!p.email&&!p.phone&&<span className="text-[#8A98AF]">—</span>}</td>
    <td><div className="flex flex-wrap gap-1.5">{p.projects.map(j=><Link key={j.id} to={`/app/projects/${j.id}/board`} className="rounded-md bg-[#E8F1FF] px-2 py-0.5 text-[12px] font-semibold text-[#0A57C8] transition hover:bg-[#DCE9FF]">{j.name}</Link>)}{!p.projects.length&&<span className="text-[#8A98AF]">—</span>}</div></td>
    <td className="text-[#3A4A66]">{p.task_count}</td>
    {edit&&<td className="pr-4"><span className="flex justify-end gap-1 opacity-0 transition focus-within:opacity-100 group-hover:opacity-100"><button aria-label={`Edit ${p.name}`} onClick={()=>setForm(p)} className="grid h-8 w-8 place-items-center rounded-md text-[#5F6F89] transition hover:bg-[#EEF2F8] hover:text-ink"><Pencil className="h-4 w-4"/></button>
      <button aria-label={`Delete ${p.name}`} onClick={()=>confirm(`Delete partner "${p.name}"? It will be removed from its projects and from all task assignments.`)&&del.mutate(p.id)} className="grid h-8 w-8 place-items-center rounded-md text-[#5F6F89] transition hover:bg-bad/10 hover:text-bad"><Trash2 className="h-4 w-4"/></button></span></td>}</tr>)}</tbody></table>
   {list.isLoading&&<p className="py-10 text-center text-sub">Loading partners…</p>}
   {list.data&&rows.length===0&&<div className="grid place-items-center px-6 py-14 text-center"><span className="grid h-12 w-12 place-items-center rounded-full bg-[#E8F1FF] text-primary"><Handshake className="h-6 w-6"/></span><p className="mt-3 font-semibold text-ink">{list.data.length?'No partners match your search':'No partners yet'}</p><p className="mt-1 max-w-sm text-sub">{list.data.length?'Try a different name.':'Add one here, or just type a new name in a project or task and it will appear in this list.'}</p></div>}</div>
  {form&&<PartnerForm p={form.id?form:null} onClose={()=>setForm(null)}/>}</div>}
