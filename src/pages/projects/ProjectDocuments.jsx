import {useState,useRef,useMemo} from 'react';
import {useOutletContext} from 'react-router-dom';
import {useMutation,useQueryClient} from '@tanstack/react-query';
import {Search,Link2,Upload,X,Building2} from 'lucide-react';
import {api as http,useGet} from '../../lib/api';
import {Err} from '../../lib/ui';
import {fmtDay,fmtSize,TypeIcon} from './shared';
import {DocPicker,DocIcon,openDoc} from './pickers';

// All documents of a project in one place: linked to the project, uploaded for it, or attached to one of its tasks.
export default function ProjectDocuments(){
 const {project,can,openIssue}=useOutletContext(),qc=useQueryClient(),key=`/projects/${project.id}/documents`,q=useGet(key),[pick,setPick]=useState(false),[s,setS]=useState(''),[err,setErr]=useState(null),[busy,setBusy]=useState(false),file=useRef(null);
 const canLink=can('tasks.edit')&&can('documents.view'),canUp=can('documents.create');
 const refresh=()=>qc.invalidateQueries({queryKey:[key]});
 const link=d=>http(key,{method:'POST',body:{document_id:d.id}}).then(refresh);
 const unlink=useMutation({mutationFn:id=>http(`${key}/${id}`,{method:'DELETE'}),onSuccess:refresh,onError:setErr});
 const upload=async f=>{if(!f)return;setBusy(true);setErr(null);try{const fd=new FormData();fd.append('file',f);fd.append('category','Project Documents');fd.append('visibility','project');fd.append('project_id',project.id);await http('/documents',{method:'POST',form:fd});await refresh()}catch(e){setErr(e)}setBusy(false);if(file.current)file.current.value=''};
 const rows=useMemo(()=>(q.data||[]).filter(d=>(d.name+' '+d.original_name).toLowerCase().includes(s.toLowerCase())),[q.data,s]);
 return <div>
  <div className="mb-4 flex flex-wrap items-center gap-3">
   <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7B8AA5]"/><input value={s} onChange={e=>setS(e.target.value)} placeholder="Search documents" aria-label="Search documents" className="h-8 w-56 rounded-md border border-line bg-white pl-9 pr-3 text-[13px] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"/></div>
   <span className="flex-1"/><span className="text-[12px] text-[#6B7A94]">{rows.length} document{rows.length===1?'':'s'}</span>
   {canLink&&<button type="button" className="btn2 !h-8 !rounded-md !px-3 !py-0 text-[13px]" onClick={()=>setPick(true)}><Link2 className="h-4 w-4"/>Link document</button>}
   {canUp&&<><input ref={file} type="file" className="sr-only" aria-label="Upload a document" onChange={e=>upload(e.target.files?.[0])}/><button type="button" disabled={busy} className="btn !h-8 !rounded-md !px-3 !py-0 text-[13px]" onClick={()=>file.current?.click()}><Upload className="h-4 w-4"/>{busy?'Uploading…':'Upload'}</button></>}</div>
  <Err e={err}/>
  <div className="overflow-x-auto rounded-xl border border-line bg-white">
   <table className="w-full min-w-[48rem] text-left"><thead className="border-b border-line bg-[#FAFBFD]"><tr className="text-[12px] text-[#5F6F89]"><th className="!py-3 pl-4">Name</th><th>Linked to</th><th>Category</th><th>Size</th><th>Added by</th><th className="pr-4">Date</th></tr></thead>
   <tbody>{rows.map(d=><tr key={d.id} className="group border-t border-line transition-colors hover:bg-[#F7FAFE]">
    <td className="!py-3 pl-4"><button type="button" onClick={()=>openDoc(d)} className="flex max-w-[22rem] items-center gap-3 text-left"><DocIcon name={d.original_name}/><span className="truncate font-semibold text-ink group-hover:text-primary group-hover:underline">{d.name}</span></button></td>
    <td><div className="flex flex-wrap gap-1.5">{(d.project_linked||d.uploaded_here)&&<span className="inline-flex items-center gap-1 rounded-md bg-[#E8F1FF] px-2 py-0.5 text-[12px] font-semibold text-[#0A57C8]"><Building2 className="h-3 w-3"/>Project</span>}
     {d.tasks.map(t=><button key={t.id} type="button" title={t.title} onClick={()=>openIssue(t.id)} className="inline-flex items-center gap-1.5 rounded-md bg-[#EEF2F8] px-2 py-0.5 text-[12px] font-semibold text-[#42526E] transition hover:bg-[#DCE9FF] hover:text-[#0747A6]">{project.code}-{t.issue_no}</button>)}</div></td>
    <td className="text-[#3A4A66]">{d.category}</td><td className="whitespace-nowrap text-[#3A4A66]">{fmtSize(d.size)}</td><td className="text-[#3A4A66]">{d.uploader}</td>
    <td className="whitespace-nowrap pr-4 text-[#6B7A94]"><span className="flex items-center gap-2">{fmtDay(d.created_at)}{canLink&&d.project_linked&&<button type="button" aria-label={`Unlink ${d.name} from this project`} title="Unlink from project" onClick={()=>confirm(`Unlink "${d.name}" from this project?`)&&unlink.mutate(d.id)} className="grid h-7 w-7 place-items-center rounded-md text-[#8A98AF] opacity-0 transition hover:bg-[#EEF2F8] hover:text-bad focus:opacity-100 group-hover:opacity-100"><X className="h-4 w-4"/></button>}</span></td></tr>)}</tbody></table>
   {q.isLoading&&<p className="py-8 text-center text-sub">Loading documents…</p>}
   {q.data&&rows.length===0&&<div className="px-6 py-12 text-center"><p className="font-semibold text-ink">{q.data.length?'No documents match your search':'No documents yet'}</p>{!q.data.length&&<p className="mt-1 text-sub">Link a document from the library, upload a file, or attach documents to individual tasks.</p>}</div>}</div>
  {pick&&<DocPicker onClose={()=>setPick(false)} linked={(q.data||[]).filter(d=>d.project_linked).map(d=>d.id)} onPick={link} title="Link a document to this project"/>}</div>}
