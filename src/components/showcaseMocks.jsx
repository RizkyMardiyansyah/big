// BIG BANG hero mock: a code-drawn illustration of our own product, drawn on a fixed 520x360 canvas (see AppShowcase).
// The other carousel slides are real screenshots in /public/showcase.
import {Bell,CircleHelp,Search,Star,House,Settings,ChevronRight,Share2,Pencil,Monitor,Image as ImageIcon,Type,Database,FileText,Layers,LayoutDashboard,FolderTree,ListTree,Server} from 'lucide-react';

const I=({c:C,s=9,className='',...p})=><C size={s} strokeWidth={2} className={`shrink-0 ${className}`} {...p}/>;

// Ring chart drawn with a conic-gradient; labels are placed at each slice's mid-angle.
export function Donut({data,size=80,hole=.6,fs=7,labels=true,lc='#1f2937',children}){
 const tot=data.reduce((a,d)=>a+d[0],0);let acc=0;
 const stops=data.map(([v,c])=>{const s=acc/tot*100;acc+=v;return `${c} ${s}% ${acc/tot*100}%`}).join(',');
 const m=`radial-gradient(circle closest-side,transparent ${hole*100}%,#000 ${hole*100+1}%)`;
 const r=size/2,rr=r*(1+hole)/2;let a=0;
 const L=labels?data.map(([v],i)=>{const mid=(a+v/2)/tot;a+=v;return v/tot>=.06?<span key={i} style={{position:'absolute',left:r+Math.sin(mid*2*Math.PI)*rr,top:r-Math.cos(mid*2*Math.PI)*rr,transform:'translate(-50%,-50%)',fontSize:fs,color:lc,fontWeight:500}}>{Math.round(v/tot*100)}%</span>:null}):null;
 return <div className="relative shrink-0" style={{width:size,height:size}}><div className="absolute inset-0 rounded-full" style={{background:`conic-gradient(${stops})`,WebkitMask:m,mask:m}}/>{L}{children&&<div className="absolute inset-0 grid place-items-center text-center">{children}</div>}</div>}

/* ───────────────────────── 1. BIG BANG ───────────────────────── */
const BBMark=({s=14})=><svg width={s} height={s} viewBox="0 0 24 24" aria-hidden="true"><rect x="1" y="1" width="10" height="22" rx="3" fill="#F5B50A"/><rect x="13" y="1" width="10" height="10" rx="3" fill="#FFD34D"/><rect x="13" y="13" width="10" height="10" rx="3" fill="#F5B50A"/></svg>;
const BBPanel=({t,className='',children})=><div className={`flex min-h-0 flex-col rounded border border-[#e3e6ea] bg-white ${className}`}><p className="px-2 pt-1.5 text-[7.5px] font-medium text-[#202226]">{t}</p>{children}</div>;
export function BigBang(){
 const side=[[House,'Home'],[FolderTree,'Browse',1],[ListTree,'Playlists'],[ImageIcon,'Snapshots'],[Layers,'Library panels'],[Search,'Explore'],[Settings,'Preferences']];
 const tiles=[['Total Host','493','','linear-gradient(90deg,#d57cff,#a35bff)','#fff'],['Total Software Product','4.49','K','linear-gradient(90deg,#5a7fe3,#4a9be6)','#fff'],['Total Operating System Wi...','134','','linear-gradient(90deg,#78c46a,#5db75d)','#fff'],['Total Operating System Lin...','171','','linear-gradient(90deg,#f7ee3b,#f0a51c)','#1f1f1f']];
 const os=[[27,'#73bf69'],[24,'#fade2a'],[16,'#5794f2'],[7,'#ff9830'],[6,'#e0526a'],[6,'#b877d9'],[4,'#19a31f'],[4,'#ffb357'],[3,'#3274d9'],[2,'#fa6400'],[1,'#e02f44']];
 const pub=[[22,'#73bf69'],[19,'#fade2a'],[15,'#5794f2'],[11,'#ff9830'],[5,'#e0526a'],[5,'#b877d9'],[4,'#19a31f'],[4,'#f2cc0c'],[3,'#3274d9'],[2,'#fa6400'],[3,'#e02f44'],[2,'#b877d9'],[2,'#8ab8ff'],[2,'#ffee52'],[1,'#c0d8ff']];
 const host=[250,132,72,14,5,1],cat=[['Other',100],['Application Server Software',11],['Configuration Management',10],['Performance Management',7],['Data Protection & Recovery',6],['Virtual Machine Software',6],['Database Mgmt Systems',5]];
 return <div className="absolute inset-0 flex flex-col bg-white text-[#202226]" style={{fontFamily:'Inter,system-ui,sans-serif'}}>
  <div className="flex h-[27px] shrink-0 items-center justify-between border-b border-[#eceef1] px-3"><div className="flex items-center gap-1.5"><BBMark/><b className="text-[11px] tracking-[.22em] text-[#16213a]">BIGBANG</b></div>
   <div className="flex items-center gap-2.5 text-[#6b7280]"><I c={Bell} s={9}/><I c={CircleHelp} s={9}/><span className="grid h-[15px] w-[15px] place-items-center rounded-full bg-[#F5B50A] text-[6px] font-bold text-white">RM</span><span className="leading-none"><b className="block text-[7px] text-[#202226]">Rizky Mardiyansyah</b><span className="text-[6px]">Super Administrator</span></span></div></div>
  <div className="flex min-h-0 flex-1">
   <aside className="w-[104px] shrink-0 border-r border-[#eceef1] px-1.5 py-2 text-[7.5px] text-[#4b5563]">
    <p className="mb-1 px-1 text-[6px] font-bold tracking-wider text-[#8a93a3]">INSIGHTS</p>
    <div className="flex items-center gap-1.5 rounded bg-[#FFF4D6] px-1.5 py-1 font-medium text-[#8a5a00]"><I c={LayoutDashboard} s={9}/>Dashboards</div>
    <div className="ml-2.5 mt-0.5 border-l border-[#e5e7eb] pl-1">{side.map(([Ic,n,a])=><div key={n} className={`relative flex items-center gap-1.5 px-1.5 py-[3px] ${a?'font-semibold text-[#202226]':''}`}>{a&&<i className="absolute -left-[5px] top-[3px] h-[10px] w-[2px] bg-[#F5B50A]"/>}<I c={Ic} s={8}/>{n}</div>)}</div>
    <div className="mt-1 flex items-center gap-1.5 px-1.5 py-1"><I c={Monitor} s={9}/>Assets</div><div className="flex items-center gap-1.5 px-1.5 py-1"><I c={FileText} s={9}/>Reports</div>
    <p className="mb-1 mt-2 px-1 text-[6px] font-bold tracking-wider text-[#8a93a3]">DATA</p>
    {['Connection Profiles','Data Models','Pipelines'].map(n=><div key={n} className="flex items-center gap-1.5 px-1.5 py-1"><I c={Database} s={9}/>{n}</div>)}
   </aside>
   <div className="flex min-w-0 flex-1 flex-col gap-1.5 bg-[#f7f8fa] p-2">
    <div className="flex items-center justify-between text-[7.5px] text-[#4b5563]"><span className="flex items-center gap-1">Dashboards <I c={ChevronRight} s={7}/> <b className="font-medium text-[#202226]">Assets Overview</b><I c={Star} s={8}/></span>
     <span className="flex items-center gap-1">{['Last 30 days ▾','⟳ Refresh  5m ▾'].map(t=><i key={t} className="rounded border border-[#d9dde3] bg-white px-1.5 py-[2px] not-italic">{t}</i>)}<i className="grid h-[15px] w-[15px] place-items-center rounded border border-[#d9dde3] bg-white"><I c={Share2} s={7}/></i><i className="flex items-center gap-1 rounded border border-[#d9dde3] bg-white px-1.5 py-[2px] not-italic"><I c={Pencil} s={7}/>Edit</i></span></div>
    <div className="grid grid-cols-4 gap-1.5">{tiles.map(([t,v,k,g,c])=><div key={t} className="overflow-hidden rounded border border-[#e3e6ea] bg-white"><p className="truncate px-1.5 py-1 text-[7px] font-medium">{t}</p><div className="grid h-[36px] place-items-center leading-none" style={{background:g,color:c}}><span className="text-[24px]">{v}<small className="text-[11px]">{k}</small></span></div></div>)}</div>
    <div className="grid grid-cols-2 gap-1.5">{[['Operating System By Vendor',os],['Software Products By Publisher',pub]].map(([t,d])=><BBPanel key={t} t={t}><div className="grid flex-1 place-items-center py-1"><Donut data={d} size={82} hole={.7} fs={6.5}/></div></BBPanel>)}</div>
    <div className="grid min-h-0 flex-1 grid-cols-2 gap-1.5">
     <BBPanel t="Host Type"><div className="relative mx-2 mb-2 mt-1 flex min-h-0 flex-1 items-end gap-1.5 border-b border-[#e5e7eb] pl-3">{[0,1,2,3].map(k=><i key={k} className="absolute left-3 right-0 border-t border-[#eef0f3]" style={{top:`${k*25}%`}}/>)}<span className="absolute left-0 top-0 text-[5.5px] text-[#6b7280]">250</span>{host.map((h,k)=><i key={k} className="relative z-10 flex-1 rounded-t-[1px] bg-[#56a64b]" style={{height:`${h/250*100}%`}}/>)}</div></BBPanel>
     <BBPanel t="Software Product Category"><div className="mx-2 mb-1.5 mt-1 flex flex-1 flex-col justify-between">{cat.map(([n,v])=><div key={n} className="flex items-center gap-1.5 text-[5.8px] text-[#4b5563]"><span className="w-[72px] shrink-0 truncate text-right">{n}</span><i className="h-[5px] rounded-[1px] bg-[#56a64b]" style={{width:`${Math.max(v,4)*.85}%`}}/></div>)}</div></BBPanel>
    </div>
   </div>
  </div></div>}
