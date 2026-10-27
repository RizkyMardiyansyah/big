import {useEffect,useRef,useState} from 'react';

// Scroll-reveal helpers. Content is shown immediately (no animation) when IntersectionObserver is missing or the visitor
// prefers reduced motion, so nothing can stay hidden. Each element animates once, the first time it enters the viewport.
const still=()=>typeof window==='undefined'||!('IntersectionObserver' in window)||window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function useInView(ref,{threshold=.15,margin='0px 0px -8% 0px'}={}){
 const [on,setOn]=useState(false);
 useEffect(()=>{const el=ref.current;if(!el)return;if(still()){setOn(true);return}
  const io=new IntersectionObserver(([e])=>{if(e.isIntersecting){setOn(true);io.disconnect()}},{threshold,rootMargin:margin});io.observe(el);return()=>io.disconnect()},[ref,threshold,margin]);
 return on}

// variant: up | left | right | zoom | fade. delay (ms) staggers siblings.
export default function Reveal({as:T='div',variant='up',delay=0,className='',style,children,...rest}){
 const ref=useRef(null),on=useInView(ref);
 return <T ref={ref} className={`rv rv-${variant} ${on?'rv-in':''} ${className}`} style={{transitionDelay:on?`${delay}ms`:undefined,...style}} {...rest}>{children}</T>}

// Counts a stat like "20+", "98%" or "2,486" up from zero when it scrolls into view; non-numeric values render as-is.
export function CountUp({value,duration=1400,className=''}){
 const ref=useRef(null),on=useInView(ref,{threshold:.4}),m=String(value??'').match(/^(\D*)(\d[\d.,]*)(.*)$/),[n,setN]=useState(0);
 const target=m?parseFloat(m[2].replace(/,/g,'')):0,dec=m&&/\.\d+$/.test(m[2])?m[2].split('.')[1].length:0,sep=m&&m[2].includes(',');
 useEffect(()=>{if(!on||!m)return;if(still()){setN(target);return}
  let raf,t0;const f=t=>{t0??=t;const p=Math.min((t-t0)/duration,1);setN(target*(1-Math.pow(1-p,3)));if(p<1)raf=requestAnimationFrame(f)};raf=requestAnimationFrame(f);return()=>cancelAnimationFrame(raf)},[on,target,duration]);// eslint-disable-line
 if(!m)return <span ref={ref} className={className}>{value}</span>;
 const shown=(on?n:0).toFixed(dec),txt=sep?Number(shown).toLocaleString('en-US',{minimumFractionDigits:dec,maximumFractionDigits:dec}):shown;
 return <span ref={ref} className={`tabular-nums ${className}`} aria-label={String(value)}><span aria-hidden="true">{m[1]}{txt}{m[3]}</span></span>}
