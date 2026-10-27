import {Link,useParams} from 'react-router-dom';import {useGet} from '../lib/api';import PublicShell from '../components/PublicShell';import {Err,Empty} from '../lib/ui';import {artSrc} from '../components/Icon';
const fmt=d=>d?new Date(d).toLocaleDateString('en-US',{dateStyle:'long'}):'';
export function News(){const q=useGet('/public/articles');
 return <PublicShell><div className="mx-auto max-w-4xl px-6 py-16"><h1 className="mb-8 text-3xl font-semibold">News & insights</h1><Err e={q.error}/>{q.data?.length===0&&<Empty t="No articles published yet."/>}
 <div className="space-y-4">{q.data?.map(x=><Link key={x.slug} to={`/news/${x.slug}`} className="card block hover:border-primary"><div className="flex gap-4"><img src={artSrc(x.cover)} alt="" className="hidden h-24 w-40 rounded-lg object-cover sm:block"/><div><span className="text-[11px] font-bold text-primary">{x.category}</span><p className="text-xs text-sub">{fmt(x.published_at)}</p><h2 className="mt-1 text-lg font-bold">{x.title}</h2></div></div></Link>)}</div></div></PublicShell>}
export function NewsDetail(){const {slug}=useParams();
 const q=useGet('/public/articles/'+slug,{retry:false});
 return <PublicShell><article className="mx-auto max-w-2xl px-6 py-16"><Err e={q.error}/> {q.data&&<><p className="text-xs text-sub">{fmt(q.data.published_at)}</p><img src={artSrc(q.data.cover)} alt="" className="mb-6 h-64 w-full rounded-2xl object-cover"/><h1 className="mt-2 mb-6 text-3xl font-extrabold">{q.data.title}</h1>
 {/* Isi artikel disimpan sebagai teks biasa dan dirender sebagai teks (bukan HTML), sehingga aman dari XSS. */}
 {q.data.content.split(/\n{2,}/).map((p,i)=><p key={i} className="mb-4 leading-7">{p}</p>)}</>}</article></PublicShell>}
