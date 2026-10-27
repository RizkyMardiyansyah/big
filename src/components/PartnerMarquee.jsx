import {PARTNERS} from '../lib/partners';
import Reveal from './Reveal';

// Infinite logo slider in two rows: the first slides right-to-left, the second (logos in reverse order) left-to-right.
// Infinite logo slider. The track holds two identical groups and slides left by exactly one group (-50%), so the loop is seamless.
// Each group repeats the logo set twice so it is wider than the viewport even with only a handful of partners.
// Pauses on hover; with prefers-reduced-motion it becomes a static, centered, wrapping row (no duplicates).
const Set_=({dup,list=PARTNERS})=><ul className={`flex shrink-0 items-center gap-12 pr-12 sm:gap-16 sm:pr-16 motion-reduce:flex-wrap motion-reduce:justify-center motion-reduce:gap-x-12 motion-reduce:gap-y-6 motion-reduce:pr-0 ${dup?'motion-reduce:hidden':''}`}>
 {list.map(p=><li key={p.name} className="flex shrink-0 items-center"><img src={p.logo} alt={dup?'':p.name} draggable={false} loading="lazy" className={`${p.h} w-auto max-w-none select-none opacity-60 grayscale transition duration-300 hover:opacity-100 hover:grayscale-0`}/></li>)}</ul>;

export default function PartnerMarquee(){
 const fade='linear-gradient(to right,transparent,#000 8%,#000 92%,transparent)';
 return <section id="partners" aria-labelledby="partners-title" className="border-y border-line bg-white"><div className="mx-auto max-w-6xl px-6 py-14">
  <Reveal className="mx-auto max-w-xl text-center"><p className="eyebrow">Our Partners</p><h2 id="partners-title" className="text-[26px] font-extrabold leading-tight text-ink">Powered by Leading Technology Partners</h2><p className="mt-3 leading-7 text-sub">We work with world-class platforms to deliver reliable, scalable, and secure solutions.</p></Reveal>
  <Reveal variant="fade" delay={150} className="group mt-10 space-y-8 overflow-hidden" style={{WebkitMaskImage:fade,maskImage:fade}}>
   {[{rev:false,list:PARTNERS},{rev:true,list:[...PARTNERS].reverse()}].map(({rev,list},r)=><div key={r} aria-hidden={r===1} className={`pm-row ${rev?'pm-rev':''} ${r===1?'motion-reduce:hidden':''}`}>
    {[0,1].map(g=><div key={g} aria-hidden={g===1} className={`flex shrink-0 motion-reduce:flex-wrap motion-reduce:justify-center ${g?'motion-reduce:hidden':''}`}><Set_ list={list} dup={g===1||r===1}/><Set_ list={list} dup/></div>)}
   </div>)}
  </Reveal></div></section>}
