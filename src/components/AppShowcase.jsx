import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {Icon} from './Icon';
import {BigBang} from './showcaseMocks';

// Hero carousel: BIG BANG (illustrated mock) is always first, followed by real screenshots of partner products
// stored in /public/showcase. Screenshots fill the whole 520x360 frame (object-cover); `pos` is the CSS object-position that decides which part is kept when the sides/top are cropped.
const W=520,H=360,DUR=5500;
const shot=(file,pos)=>({img:`/showcase/${file}.webp`,pos});
const APPS=[
 {id:'bigbang',name:'BIG BANG',sub:'Assets Overview',C:BigBang},
 {id:'helix-portal',name:'BMC Helix',sub:'Portal',...shot('bmc-helix-portal','6% 0%')},
 {id:'helix-itsm',name:'BMC Helix ITSM',sub:'Digital Workplace',...shot('bmc-helix-itsm','50% 0%')},
 {id:'helix-cmdb',name:'BMC Helix CMDB',sub:'Dashboard',...shot('bmc-helix-cmdb','35% 0%')},
 {id:'ctrlm',name:'BMC Control-M',sub:'Monitoring · All Jobs',...shot('bmc-control-m','30% 0%')},
 {id:'mendix',name:'Mendix',sub:'Studio Pro',...shot('mendix-studio-pro','50% 0%')},
 {id:'liferay',name:'Liferay',sub:'DXP · Page Editor',...shot('liferay-dxp','50% 0%')},
 {id:'soti',name:'SOTI MobiControl',sub:'Devices',...shot('soti-mobicontrol','12% 0%')}];

export default function AppShowcase(){
 const [i,setI]=useState(0),[paused,setPaused]=useState(false),[reduced,setReduced]=useState(false),[scale,setScale]=useState(1),wrap=useRef(null),n=APPS.length;
 useEffect(()=>{const m=window.matchMedia('(prefers-reduced-motion: reduce)'),f=()=>setReduced(m.matches);f();m.addEventListener('change',f);return()=>m.removeEventListener('change',f)},[]);
 useLayoutEffect(()=>{const el=wrap.current;if(!el)return;const f=()=>setScale(el.clientWidth/W);f();const ro=new ResizeObserver(f);ro.observe(el);return()=>ro.disconnect()},[]);
 useEffect(()=>{if(paused||reduced)return;const t=setTimeout(()=>setI(x=>(x+1)%n),DUR);return()=>clearTimeout(t)},[i,paused,reduced,n]);
 const go=k=>setI((k+n)%n),cur=APPS[i],tx=useRef(null),mouse=e=>e.pointerType==='mouse';
 return <div className="relative mx-auto w-full max-w-[540px]" role="group" aria-roledescription="carousel" aria-label="Product interface previews" onPointerEnter={e=>mouse(e)&&setPaused(true)} onPointerLeave={e=>mouse(e)&&setPaused(false)} onTouchStart={e=>{tx.current=e.touches[0].clientX}} onTouchEnd={e=>{const d=e.changedTouches[0].clientX-(tx.current??0);tx.current=null;if(Math.abs(d)>45)go(d<0?i+1:i-1)}} onFocusCapture={()=>setPaused(true)} onBlurCapture={()=>setPaused(false)}>
  <div ref={wrap} className="relative w-full overflow-hidden rounded-2xl bg-white shadow-[0_30px_80px_rgba(18,41,77,.18)] ring-1 ring-line" style={{aspectRatio:`${W}/${H}`}}>
   <div className="absolute left-0 top-0 origin-top-left whitespace-nowrap" style={{width:W,height:H,lineHeight:1.3,transform:`scale(${scale})`}}>
    {APPS.map(({id,name,sub,C,img,pos},k)=><div key={id} role="img" aria-label={`${name} ${sub} interface preview`} aria-hidden={k!==i} className={`absolute inset-0 transition-[opacity,visibility,transform] duration-500 ease-out ${k===i?'visible scale-100 opacity-100':'invisible scale-[.985] opacity-0'}`}>{C?<C/>:<img src={img} alt="" draggable={false} loading={k===1?'eager':'lazy'} decoding="async" style={{objectPosition:pos}} className="h-full w-full select-none object-cover"/>}</div>)}
   </div>
  </div>
  <div className="mt-3 flex flex-col items-center gap-1 sm:mt-4 sm:flex-row sm:justify-between sm:gap-3">
   <p className="min-w-0 max-w-full truncate text-xs" aria-live="polite"><b className="font-semibold text-ink">{cur.name}</b><span className="text-sub"> · {cur.sub}</span></p>
   <div className="flex shrink-0 items-center gap-0.5">
    <button type="button" aria-label="Previous preview" onClick={()=>go(i-1)} className="grid h-7 w-7 place-items-center rounded-full text-sub hover:bg-white hover:text-primary"><Icon n="chevL" className="h-4 w-4"/></button>
    {APPS.map((a,k)=><button key={a.id} type="button" aria-label={`Show ${a.name}`} aria-current={k===i} onClick={()=>go(k)} className="group p-1.5"><span className={`relative block h-1.5 overflow-hidden rounded-full bg-[#C9D6EA] transition-all duration-300 ${k===i?'w-6':'w-1.5 group-hover:bg-[#9FB3D4]'}`}>{k===i&&<i key={`${i}-${paused}`} className="absolute inset-0 origin-left rounded-full bg-primary" style={paused||reduced?undefined:{animation:`sc-fill ${DUR}ms linear forwards`}}/>}</span></button>)}
    <button type="button" aria-label="Next preview" onClick={()=>go(i+1)} className="grid h-7 w-7 place-items-center rounded-full text-sub hover:bg-white hover:text-primary"><Icon n="chevR" className="h-4 w-4"/></button>
   </div>
  </div></div>}
