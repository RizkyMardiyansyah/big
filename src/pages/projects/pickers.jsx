import {useState,useEffect,useRef,useMemo} from 'react';
import {useMutation,useQueryClient} from '@tanstack/react-query';
import {Search,Check,Plus,Building2,Handshake,ChevronDown,FileText,FileSpreadsheet,Image as ImageIcon,Presentation,Paperclip} from 'lucide-react';
import {api as http,useGet,openFile,downloadFile} from '../../lib/api';
import {Avatar,Modal,CloseBtn,hue,initials,useDirectory,fmtSize} from './shared';

// ---- Actors: a task can be worked on by internal users and/or external partners
export const akey=a=>a.type+':'+a.id;
export function useActors(){
 const dir=useDirectory(),pq=useGet('/partners'),partners=pq.data||[];
 const resolve=a=>({...a,name:a.type==='user'?dir.name(a.id):(partners.find(p=>p.id===a.id)?.name||null)});
 return {dir,partners,resolve,partnerName:id=>partners.find(p=>p.id===id)?.name||null};
}
export function ActorAvatar({a,size='h-6 w-6',text='text-[10px]',ring=false}){
 if(a.type!=='user')return <span title={`${a.type==='customer'?'Customer':'Partner'}: ${a.name||'Unknown'}`} className={`grid shrink-0 place-items-center rounded-[7px] font-bold text-white ${size} ${text} ${ring?'ring-2 ring-white':''}`} style={{background:hue(a.name)}}>{initials(a.name)}</span>;
 return <Avatar name={a.name} size={size} text={text} ring={ring}/>}
export function AvatarStack({list,max=3,size='h-6 w-6',text='text-[10px]'}){
 if(!list.length)return <Avatar name={null} size={size}/>;
 const shown=list.slice(0,max),extra=list.length-shown.length;
 return <span className="flex items-center" title={list.map(a=>a.name).join(', ')}>{shown.map((a,i)=><span key={akey(a)} style={{marginLeft:i?-4:0}} className="relative"><ActorAvatar a={a} size={size} text={text} ring/></span>)}
  {extra>0&&<span style={{marginLeft:-4}} className={`relative grid place-items-center rounded-full bg-[#E3E9F3] text-[10px] font-bold text-[#42526E] ring-2 ring-white ${size}`}>+{extra}</span>}</span>}

// ---- Generic popover
function Pop({btn,btnClass,label,width='w-72',align='left',disabled,children,wrap='inline-block max-w-full'}){
 const [open,setOpen]=useState(false),ref=useRef(null);
 useEffect(()=>{if(!open)return;const h=e=>{if(ref.current&&!ref.current.contains(e.target))setOpen(false)},k=e=>{if(e.key==='Escape'){e.stopPropagation();setOpen(false)}};document.addEventListener('mousedown',h);document.addEventListener('keydown',k,true);return()=>{document.removeEventListener('mousedown',h);document.removeEventListener('keydown',k,true)}},[open]);
 return <div ref={ref} className={`relative ${wrap}`}>
  <button type="button" disabled={disabled} aria-haspopup="listbox" aria-expanded={open} aria-label={label} onClick={()=>setOpen(!open)} className={btnClass}>{btn}</button>
  {open&&<div className={`animate-pop absolute z-[70] mt-1 overflow-hidden rounded-lg border border-line bg-white shadow-[0_8px_24px_rgba(9,30,66,.18)] ${width} ${align==='right'?'right-0 origin-top-right':'left-0 origin-top-left'}`}>{children({close:()=>setOpen(false)})}</div>}</div>}

function useCreatePartner(path='/partners'){const qc=useQueryClient();return useMutation({mutationFn:name=>http(path,{method:'POST',body:{name}}),onSuccess:()=>qc.invalidateQueries({queryKey:[path]})})}
const SearchBox=({q,setQ,placeholder})=><div className="relative border-b border-line p-2"><Search className="pointer-events-none absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8A98AF]"/><input autoFocus value={q} onChange={e=>setQ(e.target.value)} placeholder={placeholder} className="h-8 w-full rounded-md border border-line pl-7 pr-2 text-[13px] focus:border-primary focus:outline-none"/></div>;
const Row=({on,onClick,children,tag})=><button type="button" role="option" aria-selected={on} onClick={onClick} className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-[13px] transition hover:bg-[#F2F6FC] ${on?'font-semibold text-ink':'text-[#3A4A66]'}`}>{children}{tag&&<span className="ml-auto rounded bg-[#EEF2F8] px-1.5 text-[10px] font-semibold uppercase text-[#6B7A94]">{tag}</span>}{on&&<Check className={`h-3.5 w-3.5 text-primary ${tag?'':'ml-auto'}`}/>}</button>;

// ---- Multi assignee picker: people + partners; typing an unknown name offers to add it as a new partner
export function AssigneePicker({value,onChange,disabled,align='left',width='w-72',btnClass,expanded=false}){
 const {dir,partners,resolve}=useActors(),mk=useCreatePartner(),[q,setQ]=useState(''),[err,setErr]=useState('');
 const sel=new Set(value.map(akey)),named=value.map(resolve),n=q.trim().toLowerCase();
 const people=dir.list.filter(u=>!n||u.full_name.toLowerCase().includes(n)),pts=partners.filter(p=>!n||p.name.toLowerCase().includes(n));
 const canAdd=n&&!partners.some(p=>p.name.toLowerCase()===n);
 const toggle=a=>onChange(sel.has(akey(a))?value.filter(x=>akey(x)!==akey(a)):[...value,a]);
 const add=async()=>{setErr('');try{const r=await mk.mutateAsync(q.trim());const a={type:'partner',id:r.id};if(!sel.has(akey(a)))onChange([...value,a]);setQ('')}catch(e){setErr(e.message)}};
 return <Pop disabled={disabled} label="Assignees" width={width} align={align} btnClass={btnClass||'flex max-w-full items-center gap-2 rounded-md px-1.5 py-1 text-left transition hover:bg-[#EEF2F8] disabled:cursor-default disabled:hover:bg-transparent'}
  btn={expanded?<span className="flex min-w-0 flex-col items-start gap-1">{named.map(a=><span key={akey(a)} className="flex max-w-full items-center gap-2"><ActorAvatar a={a} size="h-6 w-6"/><span className="truncate text-[13px]">{a.name||'Unknown'}{a.type==='partner'&&<span className="ml-1.5 rounded bg-[#EEF2F8] px-1 text-[10px] font-semibold uppercase text-[#6B7A94]">Partner</span>}</span></span>)}{named.length===0&&<span className="flex items-center gap-2"><Avatar name={null} size="h-6 w-6"/><span className="text-[13px]">Unassigned</span></span>}</span>:<><AvatarStack list={named} max={4}/><span className="truncate text-[13px]">{named.length===0?'Unassigned':named.length===1?named[0].name:`${named.length} assignees`}</span></>}>
  {()=><div><SearchBox q={q} setQ={setQ} placeholder="Search people or add a partner"/>
   <div className="max-h-72 overflow-y-auto py-1" role="listbox" aria-multiselectable="true">
    {people.length>0&&<p className="px-3 pb-1 pt-1.5 text-[11px] font-bold uppercase tracking-wide text-[#8A98AF]">People</p>}
    {people.map(u=>{const a={type:'user',id:u.id};return <Row key={u.id} on={sel.has(akey(a))} onClick={()=>toggle(a)}><Avatar name={u.full_name} size="h-5 w-5" text="text-[9px]"/><span className="truncate">{u.full_name}</span></Row>})}
    {pts.length>0&&<p className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wide text-[#8A98AF]">Partners</p>}
    {pts.map(p=>{const a={type:'partner',id:p.id};return <Row key={p.id} on={sel.has(akey(a))} onClick={()=>toggle(a)}><ActorAvatar a={{...a,name:p.name}} size="h-5 w-5" text="text-[9px]"/><span className="truncate">{p.name}</span></Row>})}
    {!people.length&&!pts.length&&!canAdd&&<p className="px-3 py-2 text-[13px] text-sub">No results</p>}
    {canAdd&&<button type="button" onClick={add} disabled={mk.isPending} className="flex w-full items-center gap-2.5 border-t border-line px-3 py-2 text-left text-[13px] font-semibold text-primary transition hover:bg-[#F2F6FC]"><Plus className="h-4 w-4"/><span className="truncate">Add partner “{q.trim()}”</span></button>}
    {err&&<p className="px-3 py-1 text-[12px] text-bad">{err}</p>}</div>
   {value.length>0&&<button type="button" onClick={()=>onChange([])} className="w-full border-t border-line px-3 py-2 text-left text-[12px] font-semibold text-[#5F6F89] transition hover:bg-[#F2F6FC]">Clear all</button>}</div>}</Pop>}

// ---- Single partner picker for a project (creatable)
export function PartnerPicker({value,onChange,disabled,align='left',compact=false,kind='partner'}){
 const noun=kind==='customer'?'customer':'partner',Noun=kind==='customer'?'Customer':'Partner',path=kind==='customer'?'/customers':'/partners',Ico=kind==='customer'?Building2:Handshake,pq=useGet(path),partners=pq.data||[],mk=useCreatePartner(path),[q,setQ]=useState(''),[err,setErr]=useState(''),name=partners.find(p=>p.id===value)?.name||null,n=q.trim().toLowerCase();
 const list=partners.filter(p=>!n||p.name.toLowerCase().includes(n)),canAdd=n&&!partners.some(p=>p.name.toLowerCase()===n);
 const add=async close=>{setErr('');try{const r=await mk.mutateAsync(q.trim());onChange(r.id);setQ('');close()}catch(e){setErr(e.message)}};
 return <Pop wrap={compact?'inline-block max-w-full':'block w-full'} disabled={disabled} label={Noun} align={align} width="w-72" btnClass={compact?`flex max-w-full items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[12px] font-semibold transition disabled:cursor-default ${name?'text-[#0A57C8] hover:bg-[#E8F1FF]':'text-[#6B7A94] hover:bg-[#EEF2F8]'}`:'flex h-10 w-full items-center gap-2 rounded-xl border border-line bg-white px-3 text-left text-[14px] transition hover:bg-[#F7F9FC] disabled:bg-[#F1F4F9]'}
  btn={<>{compact?<Ico className="h-3.5 w-3.5"/>:<Ico className="h-4 w-4 text-[#6B7A94]"/>}<span className="truncate">{name||(compact?`Add ${noun}`:`No ${noun}`)}</span>{!compact&&<ChevronDown className="ml-auto h-4 w-4 text-[#6B7A94]"/>}</>}>
  {({close})=><div><SearchBox q={q} setQ={setQ} placeholder={`Search or type a new ${noun}`}/>
   <div className="max-h-64 overflow-y-auto py-1" role="listbox">
    {value&&<Row on={false} onClick={()=>{onChange(null);close()}}><span className="text-[#5F6F89]">No {noun}</span></Row>}
    {list.map(p=><Row key={p.id} on={p.id===value} onClick={()=>{onChange(p.id);close()}}><ActorAvatar a={{type:kind,id:p.id,name:p.name}} size="h-5 w-5" text="text-[9px]"/><span className="truncate">{p.name}</span></Row>)}
    {!list.length&&!canAdd&&<p className="px-3 py-2 text-[13px] text-sub">No {noun}s yet. Type a name to add one.</p>}
    {canAdd&&<button type="button" onClick={()=>add(close)} disabled={mk.isPending} className="flex w-full items-center gap-2.5 border-t border-line px-3 py-2 text-left text-[13px] font-semibold text-primary transition hover:bg-[#F2F6FC]"><Plus className="h-4 w-4"/><span className="truncate">Add {noun} “{q.trim()}”</span></button>}
    {err&&<p className="px-3 py-1 text-[12px] text-bad">{err}</p>}</div></div>}</Pop>}

export const CustomerPicker=props=><PartnerPicker kind="customer" {...props}/>;

// ---- Documents
const ext=n=>String(n||'').split('.').pop().toLowerCase();
export const previewable=n=>['pdf','png','jpg','jpeg'].includes(ext(n));
export const openDoc=d=>previewable(d.original_name)?openFile(`/documents/${d.id}/download?inline=1`):downloadFile(`/documents/${d.id}/download`,d.original_name);
export function DocIcon({name,cls='h-5 w-5'}){const e=ext(name),m={pdf:['#E5493A',FileText],docx:['#2F80FF',FileText],txt:['#6B7A94',FileText],csv:['#22A06B',FileSpreadsheet],xlsx:['#22A06B',FileSpreadsheet],pptx:['#E97F33',Presentation],png:['#8B5CF6',ImageIcon],jpg:['#8B5CF6',ImageIcon],jpeg:['#8B5CF6',ImageIcon]}[e]||['#6B7A94',Paperclip],I=m[1];return <I className={cls} style={{color:m[0]}} strokeWidth={1.75}/>}

// Modal to pick an existing document (from the Documents library) to link
export function DocPicker({onClose,onPick,linked=[],title='Link a document'}){
 const q=useGet('/documents'),[s,setS]=useState(''),[busy,setBusy]=useState(null),[err,setErr]=useState('');
 const list=useMemo(()=>(q.data||[]).filter(d=>(d.name+' '+d.original_name).toLowerCase().includes(s.toLowerCase())),[q.data,s]);
 const pick=async d=>{setBusy(d.id);setErr('');try{await onPick(d)}catch(e){setErr(e.message)}setBusy(null)};
 return <Modal onClose={onClose} labelledBy="dp-title"><div className="flex items-center justify-between px-6 pb-2 pt-5"><h2 id="dp-title" className="text-[20px] font-bold text-ink">{title}</h2><CloseBtn onClick={onClose}/></div>
  <div className="px-6 pb-2"><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7B8AA5]"/><input autoFocus value={s} onChange={e=>setS(e.target.value)} placeholder="Search documents" aria-label="Search documents" className="h-9 w-full rounded-md border border-line pl-9 pr-3 text-[13px] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"/></div></div>
  <ul className="thin-scroll mx-3 max-h-[22rem] overflow-y-auto pb-2">{list.map(d=>{const on=linked.includes(d.id);return <li key={d.id}><button type="button" disabled={on||busy===d.id} onClick={()=>pick(d)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition hover:bg-[#F2F6FC] disabled:cursor-default disabled:opacity-60 disabled:hover:bg-transparent"><DocIcon name={d.original_name}/>
    <span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-medium text-ink">{d.name}</span><span className="block truncate text-[11px] text-[#6B7A94]">{d.category} · {fmtSize(d.size)} · {d.uploader}</span></span>
    <span className="text-[12px] font-semibold text-[#6B7A94]">{on?'Linked':busy===d.id?'Linking…':'Link'}</span></button></li>})}
   {q.isLoading&&<li className="py-6 text-center text-[13px] text-sub">Loading documents…</li>}
   {q.data&&!list.length&&<li className="py-8 text-center text-[13px] text-sub">{q.data.length?'No documents match your search.':'No documents yet. Upload files in the Documents menu first.'}</li>}</ul>
  {err&&<p className="px-6 pb-2 text-[13px] text-bad" role="alert">{err}</p>}
  <div className="flex justify-end border-t border-line px-6 py-3"><button className="btn2" onClick={onClose}>Done</button></div></Modal>}
