import {useState,useCallback} from 'react';
import {NavLink,Outlet,useParams,useSearchParams,Link,useNavigate} from 'react-router-dom';
import {Plus} from 'lucide-react';
import {useMutation,useQueryClient} from '@tanstack/react-query';
import {api as http} from '../../lib/api';
import {PartnerPicker,CustomerPicker,useActors} from './pickers';
import {useAuth} from '../../lib/auth';
import {Err} from '../../lib/ui';
import {ProjectAvatar,Lozenge,Pick,TypeBadge,typeOptions,PROJECT_STATUS,useProject,useIssues} from './shared';
import IssueModal,{CreateIssueModal} from './IssueModal';

const TABS=[['summary','Summary'],['board','Board'],['list','List'],['documents','Documents'],['settings','Settings']];
export default function ProjectLayout(){
 const {projectId}=useParams(),{can}=useAuth(),{project,loading}=useProject(projectId),api=useIssues(project?projectId:null),actors=useActors(),dir=actors.dir,qc=useQueryClient(),setPartner=useMutation({mutationFn:b=>http(`/projects/${projectId}`,{method:'PATCH',body:b}),onSuccess:()=>qc.invalidateQueries({queryKey:['/projects']})});
 const [sp,setSp]=useSearchParams(),selected=sp.get('selectedTask'),[create,setCreate]=useState(null);
 const openIssue=useCallback(id=>setSp(p=>{const n=new URLSearchParams(p);n.set('selectedTask',id);return n}),[setSp]);
 const closeIssue=useCallback(()=>setSp(p=>{const n=new URLSearchParams(p);n.delete('selectedTask');return n},{replace:true}),[setSp]);
 if(loading)return <div className="space-y-3"><div className="h-10 w-72 animate-pulse rounded-lg bg-[#E6EBF3]"/><div className="h-64 animate-pulse rounded-xl bg-[#EEF2F8]"/></div>;
 if(!project)return <div className="card max-w-lg"><p className="font-semibold text-ink">Project not found</p><p className="mt-1 text-sub">It may have been removed, or you do not have access to it.</p><Link to="/app/projects" className="btn2 mt-4">Back to projects</Link></div>;
 const ctx={project,api,dir,actors,can,openIssue,openCreate:s=>setCreate({status:s||'todo'})};
 return <div className="flex min-h-[calc(100vh-9rem)] flex-col">
  <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
   <div className="flex min-w-0 items-center gap-3"><ProjectAvatar p={project} size="h-10 w-10" text="text-sm"/><div className="min-w-0"><h1 className="truncate text-[22px] font-bold leading-tight text-ink">{project.name}</h1><div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-[#6B7A94]">{project.code}
    <Pick value={project.type||'project'} onChange={v=>setPartner.mutate({type:v})} options={typeOptions} disabled={!can('projects.edit')} width="w-44" label="Project type" btnClass="rounded-md p-0.5 transition hover:bg-[#EEF2F8] disabled:hover:bg-transparent"><TypeBadge type={project.type||'project'}/></Pick>
    <Lozenge s={project.status} label={PROJECT_STATUS.find(s=>s[0]===project.status)?.[1]}/>
    <span className="flex items-center">Customer<CustomerPicker compact value={project.customer_id||null} onChange={id=>setPartner.mutate({customer_id:id})} disabled={!can('projects.edit')}/></span>
    <span className="flex items-center">Partner<PartnerPicker compact value={project.partner_id||null} onChange={id=>setPartner.mutate({partner_id:id})} disabled={!can('projects.edit')}/></span></div></div></div>
   {can('tasks.create')&&<button className="btn !rounded-lg" onClick={()=>setCreate({status:'todo'})}><Plus className="h-4 w-4"/>Create task</button>}</div>
  <div className="mb-4 mt-3 flex gap-1 overflow-x-auto border-b border-line" role="tablist">{TABS.map(([to,l])=><NavLink key={to} to={to} role="tab" className={({isActive})=>`relative -mb-px whitespace-nowrap px-3 py-2.5 text-[14px] font-semibold transition-colors ${isActive?'text-primary':'text-[#5F6F89] hover:text-ink'}`}>{({isActive})=><>{l}<span className={`absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-primary transition-transform duration-300 ${isActive?'scale-x-100':'scale-x-0'}`}/></>}</NavLink>)}</div>
  <Err e={api.loadError}/>
  <div className="min-h-0 flex-1"><Outlet context={ctx}/></div>
  {selected&&<IssueModal id={selected} ctx={ctx} onClose={closeIssue}/>}
  {create&&<CreateIssueModal ctx={ctx} initialStatus={create.status} onClose={()=>setCreate(null)} onCreated={id=>{}}/>}</div>}
