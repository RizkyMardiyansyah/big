import {useState,useEffect,useMemo,useRef} from 'react';
import {useMutation,useQueryClient} from '@tanstack/react-query';
import {Link2,Ellipsis,ChevronDown,Trash2,Check,Plus,X} from 'lucide-react';
import {api as http,useGet} from '../../lib/api';
import {useAuth} from '../../lib/auth';
import {Err} from '../../lib/ui';
import {Modal,CloseBtn,Pick,Avatar,TypeIcon,PriorityIcon,Lozenge,COLUMNS,TYPES,PRIORITIES,STATUS_LABEL,issueKey,fmtFull,ago} from './shared';
import {AssigneePicker,DocPicker,DocIcon,openDoc,akey} from './pickers';

const typeOpts=TYPES.map(([v,l])=>({value:v,label:l,icon:<TypeIcon type={v}/>}));
const prioOpts=PRIORITIES.map(([v,l])=>({value:v,label:l,icon:<PriorityIcon priority={v}/>}));
const statusOpts=[...COLUMNS,['cancelled','Cancelled']].map(([v,l])=>({value:v,label:l,icon:<Lozenge s={v} label={l}/>}));
const FIELD={assignees:'assignees',status:'status',priority:'priority',type:'type',due_date:'due date',assignee:'assignee',summary:'summary',description:'description'};
const show=(f,v)=>v==null||v===''?'None':f==='status'?(STATUS_LABEL[v]||v):f==='priority'||f==='type'?v[0].toUpperCase()+v.slice(1):v;

function Row({label,children}){return <div className="grid grid-cols-[6.5rem_1fr] items-center gap-2 py-1"><span className="text-[12px] font-semibold text-[#5F6F89]">{label}</span><div className="min-w-0">{children}</div></div>}

export default function IssueModal({id,ctx,onClose}){
 const {project,api,dir}=ctx,{can,session}=useAuth(),me=session?.user,qc=useQueryClient(),key='/tasks/'+id,q=useGet(key,{retry:false}),[picker,setPicker]=useState(false);
 const live=api.issues.find(t=>t.id===id),t=q.data?{...q.data.task,...live}:null,edit=can('tasks.edit');
 const [title,setTitle]=useState(null),[desc,setDesc]=useState(null),[comment,setComment]=useState(''),[composing,setComposing]=useState(false),[tab,setTab]=useState('all'),[copied,setCopied]=useState(false),[err,setErr]=useState(null);
 const refresh=()=>qc.invalidateQueries({queryKey:[key]}),refreshDocs=()=>{refresh();qc.invalidateQueries({queryKey:[`/projects/${project.id}/tasks`]});qc.invalidateQueries({queryKey:[`/projects/${project.id}/documents`]})};
 const unlink=useMutation({mutationFn:d=>http(`/tasks/${id}/documents/${d}`,{method:'DELETE'}),onSuccess:refreshDocs,onError:setErr});
 const linkDoc=d=>http(`/tasks/${id}/documents`,{method:'POST',body:{document_id:d.id}}).then(refreshDocs);
 const patch=b=>api.update.mutate({id,...b},{onError:setErr});
 const addC=useMutation({mutationFn:body=>http(`/tasks/${id}/comments`,{method:'POST',body:{body}}),onSuccess:()=>{setComment('');setComposing(false);setErr(null);refresh()},onError:setErr});
 const delC=useMutation({mutationFn:cid=>http(`/comments/${cid}`,{method:'DELETE'}),onSuccess:refresh,onError:setErr});
 const feed=useMemo(()=>{if(!q.data)return [];const c=q.data.comments.map(x=>({...x,kind:'c'})),h=q.data.history.map(x=>({...x,kind:'h'}));
  return (tab==='comments'?c:tab==='history'?h:[...c,...h]).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at))},[q.data,tab]);
 useEffect(()=>{if(copied){const x=setTimeout(()=>setCopied(false),1600);return()=>clearTimeout(x)}},[copied]);
 const saveTitle=()=>{const v=(title||'').trim();if(v&&v!==t.title)patch({title:v});setTitle(null)};
 const people=[{value:'',label:'Unassigned',icon:<Avatar name={null} size="h-5 w-5"/>},...dir.list.map(u=>({value:u.id,label:u.full_name,icon:<Avatar name={u.full_name} size="h-5 w-5" text="text-[9px]"/>}))];
 const reporter=t&&dir.name(t.created_by),docs=q.data?.documents||[],mine=(t?.assignees||[]).some(a=>a.type==='user'&&a.id===me?.id);

 if(q.isError)return <Modal onClose={onClose}><div className="p-8 text-center"><p className="font-semibold text-ink">Task not found</p><p className="mt-1 text-sub">{q.error.message}</p><button className="btn2 mt-4" onClick={onClose}>Close</button></div></Modal>;
 if(!t)return <Modal onClose={onClose} wide><div className="h-[28rem] animate-pulse rounded-xl bg-[#F1F4F9]"/></Modal>;

 return <Modal onClose={onClose} wide labelledBy="issue-title">
  <div className="flex items-center gap-2 px-5 pb-1 pt-4 sm:px-6">
   <TypeIcon type={t.type}/><span className="text-[13px] font-semibold text-[#5F6F89]">{issueKey(project,t)}</span><span className="flex-1"/>
   <button type="button" onClick={()=>{navigator.clipboard?.writeText(location.href);setCopied(true)}} className="flex h-8 items-center gap-1.5 rounded-md px-2 text-[13px] font-medium text-[#5F6F89] transition hover:bg-[#EEF2F8] hover:text-ink">{copied?<Check className="h-4 w-4 text-ok"/>:<Link2 className="h-4 w-4"/>}{copied?'Link copied':'Copy link'}</button>
   {can('tasks.delete')&&<Pick value={null} onChange={async()=>{if(confirm(`Delete ${issueKey(project,t)}? This cannot be undone.`)){await api.remove.mutateAsync(id).catch(()=>{});onClose()}}} align="right" width="w-40" label="More actions" options={[{value:'delete',label:'Delete',icon:<Trash2 className="h-4 w-4 text-bad"/>}]} btnClass="grid h-8 w-8 place-items-center rounded-md text-[#5F6F89] transition hover:bg-[#EEF2F8] hover:text-ink"><Ellipsis className="h-[18px] w-[18px]"/></Pick>}
   <CloseBtn onClick={onClose}/></div>

  <div className="grid gap-6 px-5 pb-6 pt-1 sm:px-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
   <div className="min-w-0">
    {title===null?<h2 id="issue-title" tabIndex={edit?0:undefined} onClick={()=>edit&&setTitle(t.title)} onKeyDown={e=>e.key==='Enter'&&edit&&setTitle(t.title)} className={`-mx-2 rounded-md px-2 py-1 text-[22px] font-bold leading-snug text-ink ${edit?'cursor-text hover:bg-[#F1F4F9]':''}`}>{t.title}</h2>
     :<input autoFocus value={title} maxLength={300} onChange={e=>setTitle(e.target.value)} onBlur={saveTitle} onKeyDown={e=>{if(e.key==='Enter')saveTitle();if(e.key==='Escape'){e.stopPropagation();setTitle(null)}}} aria-label="Summary" className="-mx-2 w-[calc(100%+1rem)] rounded-md border-2 border-primary px-2 py-1 text-[22px] font-bold leading-snug text-ink focus:outline-none"/>}

    <h3 className="mb-1 mt-5 text-[14px] font-bold text-ink">Description</h3>
    {desc===null?<div role={edit?'button':undefined} tabIndex={edit?0:undefined} onClick={()=>edit&&setDesc(t.description||'')} onKeyDown={e=>e.key==='Enter'&&edit&&setDesc(t.description||'')} className={`-mx-2 min-h-[3rem] whitespace-pre-wrap break-words rounded-md px-2 py-1.5 text-[14px] leading-6 ${t.description?'text-[#2B3A55]':'text-[#8A98AF]'} ${edit?'cursor-text hover:bg-[#F1F4F9]':''}`}>{t.description||(edit?'Add a description…':'No description')}</div>
     :<div><textarea autoFocus rows={6} value={desc} maxLength={10000} onChange={e=>setDesc(e.target.value)} onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();setDesc(null)}}} aria-label="Description" className="inp !rounded-md"/>
      <div className="mt-2 flex gap-2"><button className="btn !rounded-md !px-3 !py-1.5" onClick={()=>{if(desc!==(t.description||''))patch({description:desc});setDesc(null)}}>Save</button><button className="btn2 !rounded-md !px-3 !py-1.5" onClick={()=>setDesc(null)}>Cancel</button></div></div>}

    <div className="mb-1 mt-6 flex items-center justify-between"><h3 className="text-[14px] font-bold text-ink">Documents{docs.length>0&&<span className="ml-1.5 font-medium text-[#6B7A94]">{docs.length}</span>}</h3>
     {edit&&can('documents.view')&&<button type="button" onClick={()=>setPicker(true)} className="flex h-7 items-center gap-1 rounded-md bg-[#EEF2F8] px-2.5 text-[12.5px] font-semibold text-[#42526E] transition hover:bg-[#E3E9F3]"><Plus className="h-3.5 w-3.5"/>Link document</button>}</div>
    {docs.length===0?<p className="-mx-2 px-2 py-1.5 text-[13px] text-[#8A98AF]">No documents linked to this task.</p>
     :<ul className="space-y-1">{docs.map(d=><li key={d.id} className="group flex items-center gap-3 rounded-lg border border-line px-3 py-2 transition hover:bg-[#F7FAFE]"><DocIcon name={d.original_name}/>
       <button type="button" onClick={()=>openDoc(d)} className="min-w-0 flex-1 text-left"><span className="block truncate text-[13px] font-semibold text-ink group-hover:text-primary group-hover:underline">{d.name}</span><span className="block truncate text-[11px] text-[#6B7A94]">{d.category} · {d.uploader} · {fmtFull(d.created_at)}</span></button>
       {edit&&<button type="button" aria-label={`Unlink ${d.name}`} title="Unlink" onClick={()=>unlink.mutate(d.id)} className="grid h-7 w-7 place-items-center rounded-md text-[#8A98AF] opacity-0 transition hover:bg-[#EEF2F8] hover:text-bad focus:opacity-100 group-hover:opacity-100"><X className="h-4 w-4"/></button>}</li>)}</ul>}
    <h3 className="mb-2 mt-7 text-[14px] font-bold text-ink">Activity</h3>
    <div className="mb-3 flex items-center gap-1.5" role="tablist">{[['all','All'],['comments','Comments'],['history','History']].map(([k,l])=><button key={k} role="tab" aria-selected={tab===k} onClick={()=>setTab(k)} className={`h-7 rounded-md px-2.5 text-[12.5px] font-semibold transition ${tab===k?'bg-[#DCE9FF] text-[#0747A6]':'bg-[#EEF2F8] text-[#42526E] hover:bg-[#E3E9F3]'}`}>{l}</button>)}</div>
    <div className="flex gap-3"><Avatar name={me?.name} size="h-8 w-8" text="text-[11px]"/>
     <div className="min-w-0 flex-1">{!composing?<button type="button" onClick={()=>setComposing(true)} className="h-9 w-full rounded-md border border-line bg-white px-3 text-left text-[13px] text-[#8A98AF] transition hover:bg-[#F7F9FC]">Add a comment…</button>
      :<div><textarea autoFocus rows={3} value={comment} maxLength={4000} onChange={e=>setComment(e.target.value)} onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();setComposing(false)}if(e.key==='Enter'&&(e.metaKey||e.ctrlKey)&&comment.trim())addC.mutate(comment)}} placeholder="Add a comment…" aria-label="Comment" className="inp !rounded-md"/>
       <div className="mt-2 flex gap-2"><button className="btn !rounded-md !px-3 !py-1.5" disabled={!comment.trim()||addC.isPending} onClick={()=>addC.mutate(comment)}>Save</button><button className="btn2 !rounded-md !px-3 !py-1.5" onClick={()=>{setComposing(false);setComment('')}}>Cancel</button></div></div>}</div></div>
    <Err e={err}/>
    <ul className="mt-5 space-y-4">{feed.map(x=><li key={x.kind+x.id} className="flex gap-3"><Avatar name={x.author} size="h-8 w-8" text="text-[11px]"/>
      <div className="min-w-0 flex-1 text-[13px]"><p><span className="font-bold text-ink">{x.author||'Someone'}</span> <span className="text-[#6B7A94]">{x.kind==='c'?'':x.field==='document'?(x.to_value?'linked a document':'unlinked a document'):x.field==='description'?'updated the description':x.field==='summary'?'changed the summary':`changed the ${FIELD[x.field]||x.field}`} · <span title={fmtFull(x.created_at)}>{ago(x.created_at)}</span></span></p>
       {x.kind==='c'?<><p className="mt-1 whitespace-pre-wrap break-words text-[14px] leading-6 text-[#2B3A55]">{x.body}</p>{(x.user_id===me?.id||can('projects.manage'))&&<button className="mt-1 text-[12px] font-semibold text-[#6B7A94] hover:text-bad hover:underline" onClick={()=>confirm('Delete this comment?')&&delC.mutate(x.id)}>Delete</button>}</>
        :x.field==='document'?<p className="mt-1 text-[#42526E]"><span className="rounded bg-[#EEF2F8] px-1.5 py-0.5 font-semibold">{x.to_value||x.from_value}</span></p>:x.field!=='description'&&<p className="mt-1 flex flex-wrap items-center gap-1.5 text-[#42526E]">{x.field==='status'?<><Lozenge s={x.from_value}/><span>→</span><Lozenge s={x.to_value}/></>:<><span className="rounded bg-[#EEF2F8] px-1.5 py-0.5">{show(x.field,x.from_value)}</span><span>→</span><span className="rounded bg-[#EEF2F8] px-1.5 py-0.5 font-semibold">{show(x.field,x.to_value)}</span></>}</p>}</div></li>)}
     {feed.length===0&&<li className="py-4 text-center text-[13px] text-[#8A98AF]">{tab==='comments'?'No comments yet.':tab==='history'?'No changes yet.':'No activity yet.'}</li>}</ul></div>

   <aside className="space-y-4">
    <Pick value={t.status} onChange={s=>patch({status:s})} options={statusOpts} disabled={!edit} width="w-52" label="Status" btnClass={`flex h-9 items-center gap-2 rounded-md px-3 text-[13px] font-bold uppercase tracking-wide transition disabled:cursor-default ${({todo:'bg-[#DFE4EC] text-[#42526E] hover:bg-[#D3D9E3]',in_progress:'bg-[#DCE9FF] text-[#0747A6] hover:bg-[#CCDEFF]',in_review:'bg-[#E8E3FF] text-[#403294] hover:bg-[#DAD3FF]',completed:'bg-[#DCF5E7] text-[#00663F] hover:bg-[#CCEEDB]',cancelled:'bg-[#EEF0F4] text-[#6B7A94]'})[t.status]}`}>{STATUS_LABEL[t.status]||t.status}{edit&&<ChevronDown className="h-4 w-4"/>}</Pick>
    <div className="rounded-xl border border-line"><h3 className="border-b border-line px-4 py-2.5 text-[13px] font-bold text-ink">Details</h3>
     <div className="px-4 py-2.5">
      <Row label="Assignees"><AssigneePicker expanded value={t.assignees||[]} onChange={v=>patch({assignees:v})} disabled={!edit} width="w-72"/>
       {edit&&!mine&&me&&<button className="ml-1.5 block text-[12px] font-semibold text-primary hover:underline" onClick={()=>patch({assignees:[...(t.assignees||[]),{type:'user',id:me.id}]})}>Assign to me</button>}</Row>
      <Row label="Reporter"><span className="flex items-center gap-1.5 px-1.5 py-1"><Avatar name={reporter} size="h-6 w-6"/><span className="truncate text-[13px]">{reporter||'Unknown'}</span></span></Row>
      <Row label="Priority"><Pick value={t.priority} onChange={v=>patch({priority:v})} options={prioOpts} disabled={!edit} width="w-44" label="Priority"><PriorityIcon priority={t.priority}/><span className="text-[13px]">{PRIORITIES.find(p=>p[0]===t.priority)?.[1]}</span></Pick></Row>
      <Row label="Type"><Pick value={t.type} onChange={v=>patch({type:v})} options={typeOpts} disabled={!edit} width="w-44" label="Task type"><TypeIcon type={t.type}/><span className="text-[13px]">{TYPES.find(p=>p[0]===t.type)?.[1]}</span></Pick></Row>
      <Row label="Due date"><input type="date" disabled={!edit} value={t.due_date||''} onChange={e=>patch({due_date:e.target.value||null})} aria-label="Due date" className="h-8 w-full rounded-md border border-transparent bg-transparent px-1.5 text-[13px] transition hover:bg-[#EEF2F8] focus:border-primary focus:bg-white focus:outline-none disabled:hover:bg-transparent"/></Row></div></div>
    <p className="px-1 text-[12px] leading-5 text-[#6B7A94]">Created {fmtFull(t.created_at)}<br/>Updated {fmtFull(t.updated_at||t.created_at)}</p></aside></div>
  {picker&&<DocPicker onClose={()=>setPicker(false)} linked={docs.map(d=>d.id)} onPick={linkDoc} title="Link a document to this task"/>}</Modal>}

// ---- Create task dialog (header button, or "+ Create task" with status preselected)
export function CreateIssueModal({ctx,initialStatus='todo',onClose,onCreated}){
 const {project,api,dir}=ctx,{session}=useAuth(),me=session?.user,[f,setF]=useState({type:'task',status:initialStatus,title:'',description:'',assignees:[],priority:'medium',due_date:''}),[again,setAgain]=useState(false),[err,setErr]=useState(null),[ok,setOk]=useState(null);
 const set=(k,v)=>setF(o=>({...o,[k]:v}));
 const submit=async e=>{e.preventDefault();setErr(null);try{const r=await api.create.mutateAsync({...f,due_date:f.due_date||null});onCreated?.(r.id);if(again){setOk(`${project.code}-${r.issue_no} created`);setF(o=>({...o,title:'',description:''}))}else onClose()}catch(x){setErr(x)}};
 const people=[{value:'',label:'Unassigned',icon:<Avatar name={null} size="h-5 w-5"/>},...dir.list.map(u=>({value:u.id,label:u.full_name,icon:<Avatar name={u.full_name} size="h-5 w-5" text="text-[9px]"/>}))];
 const btn='flex h-9 w-full items-center gap-2 rounded-md border border-line bg-white px-2.5 text-[13px] transition hover:bg-[#F7F9FC]';
 return <Modal onClose={onClose} labelledBy="ci-title"><form onSubmit={submit}>
  <div className="flex items-center justify-between px-6 pb-1 pt-5"><h2 id="ci-title" className="text-[20px] font-bold text-ink">Create task</h2><CloseBtn onClick={onClose}/></div>
  <div className="space-y-4 px-6 pb-2 pt-3">
   <div className="grid gap-3 sm:grid-cols-2"><div><span className="mb-1 block text-xs font-semibold text-[#5F6F89]">Project</span><div className="flex h-9 items-center rounded-md bg-[#F1F4F9] px-2.5 text-[13px] font-medium text-ink"><span className="truncate">{project.name} ({project.code})</span></div></div>
    <div><span className="mb-1 block text-xs font-semibold text-[#5F6F89]">Task type</span><Pick value={f.type} onChange={v=>set('type',v)} options={typeOpts} width="w-full" btnClass={btn} label="Task type"><TypeIcon type={f.type}/>{TYPES.find(t=>t[0]===f.type)[1]}<ChevronDown className="ml-auto h-4 w-4 text-[#6B7A94]"/></Pick></div></div>
   <div><span className="mb-1 block text-xs font-semibold text-[#5F6F89]">Status</span><Pick value={f.status} onChange={v=>set('status',v)} options={statusOpts.filter(o=>o.value!=='cancelled')} width="w-56" label="Status" btnClass={btn+' !w-auto min-w-[10rem]'}><Lozenge s={f.status}/><ChevronDown className="ml-auto h-4 w-4 text-[#6B7A94]"/></Pick></div>
   <label className="block"><span className="mb-1 block text-xs font-semibold text-[#5F6F89]">Summary <span className="text-bad">*</span></span><input autoFocus required maxLength={300} className="inp !rounded-md" value={f.title} onChange={e=>set('title',e.target.value)}/></label>
   <label className="block"><span className="mb-1 block text-xs font-semibold text-[#5F6F89]">Description</span><textarea rows={4} maxLength={10000} className="inp !rounded-md" value={f.description} onChange={e=>set('description',e.target.value)}/></label>
   <div className="grid gap-3 sm:grid-cols-3">
    <div><span className="mb-1 block text-xs font-semibold text-[#5F6F89]">Assignees</span><AssigneePicker value={f.assignees} onChange={v=>set('assignees',v)} btnClass={btn} width="w-72"/>{me&&!f.assignees.some(a=>a.type==='user'&&a.id===me.id)&&<button type="button" className="mt-1 text-[12px] font-semibold text-primary hover:underline" onClick={()=>set('assignees',[...f.assignees,{type:'user',id:me.id}])}>Assign to me</button>}</div>
    <div><span className="mb-1 block text-xs font-semibold text-[#5F6F89]">Priority</span><Pick value={f.priority} onChange={v=>set('priority',v)} options={prioOpts} width="w-44" label="Priority" btnClass={btn}><PriorityIcon priority={f.priority}/>{PRIORITIES.find(p=>p[0]===f.priority)[1]}</Pick></div>
    <label className="block"><span className="mb-1 block text-xs font-semibold text-[#5F6F89]">Due date</span><input type="date" className="inp !h-9 !rounded-md !py-0" value={f.due_date} onChange={e=>set('due_date',e.target.value)}/></label></div>
   <Err e={err}/>{ok&&<p className="text-[13px] font-medium text-ok" role="status">{ok}</p>}</div>
  <div className="flex items-center justify-between gap-3 px-6 pb-5 pt-4"><label className="flex items-center gap-2 text-[13px] text-[#42526E]"><input type="checkbox" checked={again} onChange={e=>setAgain(e.target.checked)}/>Create another</label>
   <div className="flex gap-2"><button type="button" className="btn2" onClick={onClose}>Cancel</button><button className="btn" disabled={api.create.isPending||!f.title.trim()}>{api.create.isPending?'Creating…':'Create'}</button></div></div></form></Modal>}
