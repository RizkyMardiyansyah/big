import {useState} from 'react';import {useMutation,useQueryClient} from '@tanstack/react-query';import {api,useGet} from '../lib/api';import {useAuth} from '../lib/auth';import {Head,Badge,Err,Empty} from '../lib/ui';
export default function Leave(){const qc=useQueryClient(),{can,session}=useAuth(),[f,setF]=useState({t:'',s:'',e:'',r:''}),[msg,setM]=useState(null);
 const types=useGet('/leave-types'),list=useGet('/leave');
 const done=t=>()=>{setM({ok:1,t});qc.invalidateQueries({queryKey:['/leave']});qc.invalidateQueries({queryKey:['/dashboard']})};
 const m=useMutation({mutationFn:()=>api('/leave',{method:'POST',body:{leave_type_id:f.t,start_date:f.s,end_date:f.e,reason:f.r}}),onSuccess:done('Request submitted.'),onError:e=>setM({t:e.message})});
 const c=useMutation({mutationFn:id=>api(`/leave/${id}/cancel`,{method:'POST'}),onSuccess:done('Request cancelled.'),onError:e=>setM({t:e.message})});
 return <div className="space-y-6"><Head title="Leave requests"/>
 {can('leave_requests.submit')&&<form className="card grid gap-3 sm:grid-cols-2" onSubmit={e=>{e.preventDefault();setM(null);m.mutate()}}>
 <select required className="inp" value={f.t} onChange={e=>setF({...f,t:e.target.value})}><option value="">Leave type</option>{types.data?.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select>
 <input required placeholder="Reason" className="inp" value={f.r} onChange={e=>setF({...f,r:e.target.value})}/>
 <input required type="date" aria-label="Start date" className="inp" value={f.s} onChange={e=>setF({...f,s:e.target.value})}/><input required type="date" aria-label="End date" className="inp" value={f.e} onChange={e=>setF({...f,e:e.target.value})}/>
 <div className="flex items-center gap-3 sm:col-span-2"><button className="btn" disabled={m.isPending}>Submit request</button>{msg&&<span className={msg.ok?'text-ok':'text-bad'}>{msg.t}</span>}</div></form>}
 <div className="card overflow-x-auto"><Err e={list.error}/><table className="w-full text-left"><thead><tr><th>No.</th><th>Type</th><th>Dates</th><th>Days</th><th>Status</th><th/></tr></thead><tbody>
 {list.data?.map(r=><tr key={r.id} className="border-t border-line"><td>{r.request_number}</td><td>{r.type_name}</td><td>{r.start_date} – {r.end_date}</td><td>{r.days}</td><td><Badge s={r.status}/></td>
 <td>{r.status==='pending'&&r.employee_id===session.user.id&&<button className="text-bad" onClick={()=>confirm('Cancel this request?')&&c.mutate(r.id)}>Cancel</button>}</td></tr>)}</tbody></table>
 {list.data?.length===0&&<Empty t="No requests yet."/>}</div></div>}
