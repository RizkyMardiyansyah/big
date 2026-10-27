import {useState,useEffect,useRef,useMemo} from 'react';
import {NavLink,Outlet,Link,useNavigate,useLocation} from 'react-router-dom';
import {ChevronLeft,ChevronRight,ChevronDown,Bell,CircleHelp,Menu,LogOut,User as UserIcon} from 'lucide-react';
import {useGet,fetchBlobUrl} from '../lib/api';
import {useAuth} from '../lib/auth';
import {Icon} from '../components/Icon';
import {ProjectAvatar} from './projects/shared';

// ---- Navigation model. Parents with `children` render as an expandable group with a tree line (see sidebar design).
const buildTree=recent=>[
 {section:'Workspace',items:[
  {id:'dashboard',label:'Dashboard',icon:'dashboard',to:'dashboard',perm:'dashboard.view'},
  {id:'projects',label:'Projects',icon:'projects',perm:'projects.view',children:[
    {label:'All projects',icon:'projects',to:'projects',end:true},
    ...recent.map(p=>({label:p.name,to:'projects/'+p.id,avatar:p,perm:'projects.view'}))]},
  {id:'calendar',label:'Calendar',icon:'calendarCheck',to:'calendar',perm:'tasks.view'},
  {id:'customers',label:'Customers',icon:'customers',to:'customers',perm:'projects.view'},
  {id:'partners',label:'Partners',icon:'partners',to:'partners',perm:'projects.view'},
  {id:'requests',label:'Requests',icon:'inbox',children:[
    {label:'Leave',icon:'calendar',to:'leave-requests',perm:'leave_requests.view'},
    {label:'Reimbursements',icon:'receipt',to:'reimbursements',perm:'reimbursements.view'},
    {label:'Approvals',icon:'approve',to:'approvals',perm:'approvals.view'}]},
  {id:'documents',label:'Documents',icon:'folder',to:'documents',perm:'documents.view'}]},
 {section:'Administration',items:[
  {id:'admin',label:'Administration',icon:'gear',children:[
    {label:'Users',icon:'users',to:'admin/users',perm:'users.view'},
    {label:'Roles & permissions',icon:'shield',to:'admin/roles',perm:'roles.manage'},
    {label:'Landing page',icon:'image',to:'admin/landing-page',perm:'landing_content.manage'},
    {label:'Audit log',icon:'log',to:'admin/audit-logs',perm:'audit_logs.view'},
    {label:'Settings',icon:'gear',to:'admin/settings',perm:'settings.manage'}]}]}];

const PAGE_LABEL={dashboard:['Dashboard'],calendar:['Calendar'],partners:['Partners'],customers:['Customers'],'leave-requests':['Requests','Leave'],reimbursements:['Requests','Reimbursements'],approvals:['Requests','Approvals'],documents:['Documents'],notifications:['Notifications'],profile:['My profile'],
 'admin/users':['Administration','Users'],'admin/roles':['Administration','Roles & permissions'],'admin/landing-page':['Administration','Landing page'],'admin/audit-logs':['Administration','Audit log'],'admin/settings':['Administration','Settings']};
const TAB_LABEL={summary:'Summary',board:'Board',list:'List',documents:'Documents',settings:'Settings'};

function useOutside(ref,fn){useEffect(()=>{const h=e=>{if(ref.current&&!ref.current.contains(e.target))fn()};document.addEventListener('mousedown',h);return()=>document.removeEventListener('mousedown',h)},[ref,fn])}
function useDesktop(){const q='(min-width:768px)',[m,setM]=useState(()=>typeof window!=='undefined'&&window.matchMedia(q).matches);
 useEffect(()=>{const mq=window.matchMedia(q),h=()=>setM(mq.matches);mq.addEventListener('change',h);return()=>mq.removeEventListener('change',h)},[]);return m}

export default function AppLayout(){
 const {can,session,logout}=useAuth(),nav=useNavigate(),loc=useLocation(),desktop=useDesktop();
 const [drawer,setDrawer]=useState(false),[menu,setMenu]=useState(false),[img,setImg]=useState(null);
 const [collapsed,setCollapsed]=useState(()=>{try{return localStorage.getItem('big_nav_collapsed')==='1'}catch{return false}});
 const slim=collapsed&&desktop;
 const unread=useGet('/notifications/unread-count',{refetchInterval:30000}),prof=useGet('/profile'),projects=useGet('/projects',{enabled:can('projects.view'),staleTime:30000});
 const menuRef=useRef(null);
 useOutside(menuRef,()=>setMenu(false));
 useEffect(()=>{setDrawer(false);setMenu(false)},[loc.pathname]);
 useEffect(()=>{try{localStorage.setItem('big_nav_collapsed',collapsed?'1':'0')}catch{}},[collapsed]);
 useEffect(()=>{let url;if(prof.data?.has_avatar)fetchBlobUrl('/avatars/'+prof.data.id).then(u=>{url=u;setImg(u)});else setImg(null);return()=>{url&&URL.revokeObjectURL(url)}},[prof.data?.has_avatar,prof.data?.id]);

 const recent=(projects.data||[]).slice(0,5);
 const tree=useMemo(()=>buildTree(recent).map(s=>({...s,items:s.items.map(i=>i.children?{...i,children:i.children.filter(c=>!c.perm||can(c.perm))}:i).filter(i=>i.children?i.children.length>0:can(i.perm))})).filter(s=>s.items.length),[recent.map(p=>p.id+p.name).join('|'),can]);
 const path=loc.pathname.replace(/^\/app\/?/,'');
 const inItem=i=>i.children?i.children.some(c=>path===c.to||path.startsWith(c.to+'/')):(path===i.to||path.startsWith(i.to+'/'));
 const [open,setOpen]=useState({});
 const isOpen=i=>open[i.id]===undefined?inItem(i):open[i.id];
 useEffect(()=>{setOpen(o=>{const n={...o};for(const s of tree)for(const i of s.items)if(i.children&&inItem(i))n[i.id]=true;return n})},[path.split('/')[0]]); // eslint-disable-line

 const name=session?.user?.name||session?.user?.email||'',role=prof.data?.roles?.[0]||prof.data?.job_title||'';

 // Breadcrumb: "Projects > <Project> > Board", "Administration > Users", ...
 const seg=path.split('/'),curProject=seg[0]==='projects'&&seg[1]?projects.data?.find(p=>p.id===seg[1]):null;
 const crumbs=seg[0]==='projects'?[{t:'Projects',to:seg[1]?'projects':null},...(seg[1]?[{t:curProject?.name||'…',to:'projects/'+seg[1]+'/board'},{t:TAB_LABEL[seg[2]]||'Board'}]:[])]
  :(PAGE_LABEL[seg.slice(0,2).join('/')]||PAGE_LABEL[seg[0]]||[seg[0]?.replace(/-/g,' ')||'']).map(t=>({t}));

 const Ava=({cls})=><span className={`grid shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-[#2A87FF] to-[#0762F0] font-bold text-white ${cls}`}>{img?<img src={img} alt="" className="h-full w-full object-cover"/>:name[0]?.toUpperCase()}</span>;

 // ---- Sidebar pieces
 const base='group relative flex h-10 w-full items-center gap-3 rounded-lg px-3 text-[14px] font-medium transition-colors duration-200';
 const on='bg-[#E8F1FF] text-[#0A57C8]',off='text-[#3A4A66] hover:bg-[#F2F6FC] hover:text-ink';
 const Label=({children})=><span className={`min-w-0 flex-1 truncate text-left transition-[opacity,width] duration-200 ${slim?'w-0 opacity-0':'opacity-100'}`}>{children}</span>;
 const Leaf=i=><NavLink key={i.id} to={i.to} title={slim?i.label:undefined} className={({isActive})=>`${base} ${isActive?on:off} ${slim?'justify-center px-0':''}`}>
   <Icon n={i.icon} className="h-[19px] w-[19px] shrink-0"/><Label>{i.label}</Label></NavLink>;
 const Parent=i=>{const act=inItem(i),op=isOpen(i)&&!slim,first=i.children[0].to;
  return <div key={i.id}>
   <button type="button" aria-expanded={op} title={slim?i.label:undefined} onClick={()=>slim?(nav('/app/'+first)):setOpen(o=>({...o,[i.id]:!isOpen(i)}))} className={`${base} ${act?on:off} ${slim?'justify-center px-0':''}`}>
    <Icon n={i.icon} className="h-[19px] w-[19px] shrink-0"/><Label>{i.label}</Label>
    {!slim&&<ChevronDown className={`h-4 w-4 shrink-0 opacity-60 transition-transform duration-300 ${op?'rotate-180':''}`}/>}</button>
   <div className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${op?'grid-rows-[1fr] opacity-100':'grid-rows-[0fr] opacity-0'}`} {...(op?{}:{inert:''})} aria-hidden={!op}>
    <div className="overflow-hidden"><ul className="ml-[1.6rem] mt-1 space-y-0.5 border-l border-line py-0.5 pl-3">
     {i.children.map(c=><li key={c.to} className="relative"><NavLink to={c.to} end={c.end} className={({isActive})=>`group relative flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[13.5px] transition-colors duration-200 ${isActive?'font-bold text-ink':'font-medium text-[#5F6F89] hover:bg-[#F2F6FC] hover:text-ink'}`}>
       {({isActive})=><>
        <span className={`absolute -left-[13px] bottom-1.5 top-1.5 w-[3px] origin-center rounded-full bg-primary transition-all duration-300 ${isActive?'scale-y-100 opacity-100':'scale-y-0 opacity-0'}`}/>
        {c.avatar?<ProjectAvatar p={c.avatar} size="h-[18px] w-[18px]" text="text-[8px]"/>:<Icon n={c.icon} className={`h-[18px] w-[18px] shrink-0 ${isActive?'text-ink':'text-[#6B7A94] group-hover:text-ink'}`}/>}
        <span className="truncate">{c.label}</span></>}</NavLink></li>)}</ul></div></div></div>};

 return <div className="app-bg flex min-h-screen flex-col">
  {/* Top bar */}
  <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-3 border-b border-line bg-white px-4 md:px-6">
   <button aria-label="Open menu" className="grid h-9 w-9 place-items-center rounded-lg text-ink transition hover:bg-soft md:hidden" onClick={()=>setDrawer(true)}><Menu className="h-5 w-5"/></button>
   <Link to="/app" className="mr-2 flex shrink-0 items-center md:mr-6"><img src="/logo.svg" alt="BIG Solutions" className="h-8 w-auto"/></Link>
   <span className="flex-1"/>
   <Link to="notifications" aria-label="Notifications" className="relative grid h-10 w-10 place-items-center rounded-full text-[#3A4A66] transition hover:bg-soft"><Bell className="h-[20px] w-[20px]" strokeWidth={1.75}/>{unread.data?.count>0&&<span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-bad ring-2 ring-white"/>}</Link>
   <a href="/contact" target="_blank" rel="noopener noreferrer" aria-label="Help" className="hidden h-10 w-10 place-items-center rounded-full text-[#3A4A66] transition hover:bg-soft sm:grid"><CircleHelp className="h-[20px] w-[20px]" strokeWidth={1.75}/></a>
   <div ref={menuRef} className="relative"><button onClick={()=>setMenu(!menu)} aria-haspopup="menu" aria-expanded={menu} className="flex items-center gap-2.5 rounded-xl px-1.5 py-1 text-left transition hover:bg-soft"><Ava cls="h-9 w-9 text-sm"/>
     <span className="hidden leading-tight sm:block"><span className="block max-w-[10rem] truncate text-[13px] font-bold text-ink">{name}</span><span className="block max-w-[10rem] truncate text-[11px] text-sub">{role}</span></span><ChevronDown className={`hidden h-4 w-4 text-[#7B8AA5] transition-transform duration-200 sm:block ${menu?'rotate-180':''}`}/></button>
    {menu&&<div role="menu" className="animate-pop absolute right-0 top-[calc(100%+8px)] w-52 origin-top-right overflow-hidden rounded-xl border border-line bg-white p-1.5 shadow-[0_12px_32px_rgba(31,64,128,.14)]">
     <Link role="menuitem" to="profile" className="flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition hover:bg-soft"><UserIcon className="h-[17px] w-[17px] text-[#5F6F89]"/>My profile</Link>
     <Link role="menuitem" to="notifications" className="flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition hover:bg-soft"><Bell className="h-[17px] w-[17px] text-[#5F6F89]"/>Notifications{unread.data?.count>0&&<span className="ml-auto rounded-full bg-bad px-1.5 text-[11px] text-white">{unread.data.count}</span>}</Link>
     <button role="menuitem" onClick={async()=>{await logout();nav('/login',{replace:true})}} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[13px] font-medium text-bad transition hover:bg-bad/5"><LogOut className="h-[17px] w-[17px]"/>Log out</button></div>}</div>
  </header>

  <div className="flex min-h-0 flex-1">
   {drawer&&<div className="animate-fade fixed inset-0 top-16 z-30 bg-navy/40 md:hidden" onClick={()=>setDrawer(false)} aria-hidden="true"/>}
   {/* Sidebar */}
   <div className={`fixed bottom-0 left-0 top-16 z-30 w-72 transition-[transform,width] duration-300 ease-[cubic-bezier(.4,0,.2,1)] md:sticky md:z-30 md:h-[calc(100vh-4rem)] md:shrink-0 md:translate-x-0 ${drawer?'translate-x-0':'-translate-x-full'} ${slim?'md:w-[4.5rem]':'md:w-[17rem]'}`}>
    <aside className="thin-scroll h-full overflow-y-auto overflow-x-hidden border-r border-line bg-white px-3 pb-8 pt-2">
     <nav aria-label="Main">{tree.map((s,si)=><div key={s.section}>
      <div className={`overflow-hidden transition-[height,opacity] duration-300 ${slim?'h-0 opacity-0':'h-9 opacity-100'}`}><p className="px-3 pb-1.5 pt-4 text-[11px] font-bold uppercase tracking-[.08em] text-[#8795AD]">{s.section}</p></div>
      {slim&&si>0&&<div className="mx-3 my-3 h-px bg-line"/>}
      <div className="space-y-1">{s.items.map(i=>i.children?Parent(i):Leaf(i))}</div></div>)}</nav></aside>
    <button onClick={()=>setCollapsed(c=>!c)} aria-label={slim?'Expand sidebar':'Collapse sidebar'} title={slim?'Expand sidebar':'Collapse sidebar'} className="absolute -right-3.5 top-5 z-40 hidden h-7 w-7 place-items-center rounded-full border border-line bg-white text-[#3A4A66] shadow-[0_2px_6px_rgba(31,64,128,.12)] transition hover:bg-soft hover:text-ink md:grid"><ChevronLeft className={`h-4 w-4 transition-transform duration-300 ${slim?'rotate-180':''}`}/></button>
   </div>

   <div className="min-w-0 flex-1">
    <nav aria-label="Breadcrumb" className="flex h-14 items-center gap-1.5 overflow-x-auto whitespace-nowrap px-4 pl-6 text-[14px] md:px-8 md:pl-9">
     {crumbs.map((c,i)=>{const last=i===crumbs.length-1;return <span key={i} className="flex items-center gap-1.5">{i>0&&<ChevronRight className="h-3.5 w-3.5 text-[#9AA7BC]"/>}
      {c.to&&!last?<Link to={c.to} className="font-medium text-ink transition hover:text-primary">{c.t}</Link>:<span className={last?'text-[#6B7A94]':'font-medium text-ink'} aria-current={last?'page':undefined}>{c.t}</span>}</span>})}</nav>
    <main key={path.split('/').slice(0,2).join('/')} className="animate-page px-4 pb-10 pt-1 md:px-8"><Outlet/></main></div>
  </div></div>}
