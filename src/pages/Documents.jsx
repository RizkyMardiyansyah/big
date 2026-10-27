import {useState} from 'react';import {useMutation,useQueryClient} from '@tanstack/react-query';import {api,useGet,openFile,downloadFile} from '../lib/api';import {useAuth} from '../lib/auth';import {Head,Err,Empty} from '../lib/ui';
const CATS=['General','Project Documents','Contracts','Policies','Procedures','Reports','Other'],VIS={all:'All users',project:'Project members',private:'Only me'};
const size=n=>n>1048576?(n/1048576).toFixed(1)+' MB':Math.max(1,Math.round(n/1024))+' KB';
export default function Documents(){const qc=useQueryClient(),{can}=useAuth(),[fl,setFl]=useState({q:'',category:'',folder_id:'',archived:'0'}),[err,setErr]=useState(null),[msg,setMsg]=useState(null),[file,setFile]=useState(null),[f,setF]=useState({name:'',category:'General',folder_id:'',project_id:'',visibility:'all'});
 const qs=new URLSearchParams(Object.entries(fl).filter(([,v])=>v)).toString(),path='/documents'+(qs?'?'+qs:'');
 const docs=useGet(path),folders=useGet('/folders'),projects=useGet('/projects',{enabled:can('projects.view')});
 const refresh=()=>{setErr(null);qc.invalidateQueries({predicate:q=>String(q.queryKey[0]).startsWith('/documents')||q.queryKey[0]==='/folders'})};
 const up=useMutation({mutationFn:()=>{if(!file)throw new Error('Choose a file');if(file.size>10*1024*1024)throw new Error('Maximum file size is 10 MB');const fd=new FormData();Object.entries(f).forEach(([k,v])=>v&&fd.append(k,v));fd.append('file',file);return api('/documents',{method:'POST',form:fd})},onSuccess:()=>{setMsg({ok:1,t:'File uploaded.'});setFile(null);setF({...f,name:''});refresh()},onError:e=>setMsg({t:e.message})});
 const patch=useMutation({mutationFn:({id,...b})=>api(`/documents/${id}`,{method:'PATCH',body:b}),onSuccess:refresh,onError:setErr});
 const del=useMutation({mutationFn:id=>api(`/documents/${id}`,{method:'DELETE'}),onSuccess:refresh,onError:setErr});
 const mk=useMutation({mutationFn:n=>api('/folders',{method:'POST',body:{name:n}}),onSuccess:refresh,onError:setErr});
 const fname=id=>folders.data?.find(x=>x.id===id)?.name||'—';
 return <div className="space-y-6"><Head title="Documents" sub="Private files; every download is checked for access.">{can('documents.create')&&<button className="btn2" onClick={()=>{const n=prompt('New folder name:');n&&mk.mutate(n)}}>New folder</button>}</Head>
 {can('documents.create')&&<form className="card grid gap-3 sm:grid-cols-3" onSubmit={e=>{e.preventDefault();setMsg(null);up.mutate()}}>
 <input type="file" required aria-label="File" className="inp sm:col-span-2" accept=".pdf,.png,.jpg,.jpeg,.txt,.csv,.docx,.xlsx,.pptx" onChange={e=>setFile(e.target.files[0]||null)}/><input className="inp" placeholder="Document name (optional)" value={f.name} onChange={e=>setF({...f,name:e.target.value})}/>
 <select className="inp" value={f.category} onChange={e=>setF({...f,category:e.target.value})}>{CATS.map(c=><option key={c}>{c}</option>)}</select>
 <select className="inp" value={f.folder_id} onChange={e=>setF({...f,folder_id:e.target.value})}><option value="">No folder</option>{folders.data?.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select>
 <select className="inp" value={f.visibility} onChange={e=>setF({...f,visibility:e.target.value})}>{Object.entries(VIS).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select>
 {f.visibility==='project'&&<select required className="inp sm:col-span-3" value={f.project_id} onChange={e=>setF({...f,project_id:e.target.value})}><option value="">Select a project</option>{projects.data?.map(p=><option key={p.id} value={p.id}>{p.code} – {p.name}</option>)}</select>}
 <div className="flex items-center gap-3 sm:col-span-3"><button className="btn" disabled={up.isPending}>{up.isPending?'Uploading…':'Upload'}</button>{msg&&<span className={msg.ok?'text-ok':'text-bad'}>{msg.t}</span>}</div></form>}
 <div className="flex flex-wrap gap-2"><input className="inp !w-64" placeholder="Search documents" value={fl.q} onChange={e=>setFl({...fl,q:e.target.value})}/>
 <select className="inp !w-auto" value={fl.category} onChange={e=>setFl({...fl,category:e.target.value})}><option value="">All categories</option>{CATS.map(c=><option key={c}>{c}</option>)}</select>
 <select className="inp !w-auto" value={fl.folder_id} onChange={e=>setFl({...fl,folder_id:e.target.value})}><option value="">All folders</option>{folders.data?.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select>
 <select className="inp !w-auto" value={fl.archived} onChange={e=>setFl({...fl,archived:e.target.value})}><option value="0">Active</option><option value="1">Archived</option></select></div>
 <Err e={err||docs.error}/><div className="card overflow-x-auto"><table className="w-full text-left"><thead><tr><th>Name</th><th>Category</th><th>Folder</th><th>Access</th><th>Uploaded by</th><th>Size</th><th>Date</th><th/></tr></thead><tbody>
 {docs.data?.map(d=><tr key={d.id} className="border-t border-line"><td className="font-medium">{d.name}</td><td>{d.category}</td><td>{fname(d.folder_id)}</td><td>{VIS[d.visibility]}</td><td>{d.uploader}</td><td>{size(d.size)}</td><td className="whitespace-nowrap">{new Date(d.created_at).toLocaleDateString('en-US')}</td>
 <td className="space-x-3 whitespace-nowrap">{d.previewable&&<button className="text-primary" onClick={()=>openFile(`/documents/${d.id}/download?inline=1`)}>View</button>}<button className="text-primary" onClick={()=>downloadFile(`/documents/${d.id}/download`,d.original_name)}>Download</button>
 {d.can_edit&&can('documents.edit')&&<><button onClick={()=>{const n=prompt('New name:',d.name);n&&patch.mutate({id:d.id,name:n})}}>Rename</button><button onClick={()=>patch.mutate({id:d.id,archived:!d.archived})}>{d.archived?'Restore':'Archive'}</button></>}
 {d.can_edit&&can('documents.delete')&&<button className="text-bad" onClick={()=>confirm(`Permanently delete "${d.name}"?`)&&del.mutate(d.id)}>Delete</button>}</td></tr>)}</tbody></table>
 {docs.data?.length===0&&<Empty t="No documents."/>}</div></div>}
