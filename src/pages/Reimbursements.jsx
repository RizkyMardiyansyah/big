import {useState} from 'react';import {useMutation,useQueryClient} from '@tanstack/react-query';import {api,useGet,openFile} from '../lib/api';import {useAuth} from '../lib/auth';import {Head,Badge,Err,Empty} from '../lib/ui';
export const openReceipt=id=>openFile(`/reimbursements/${id}/receipt`);
export default function Reimbursements(){const qc=useQueryClient(),{can,session}=useAuth(),uid=session.user.id,[f,setF]=useState({cat:'',amount:'',cur:'IDR',date:'',desc:''}),[file,setFile]=useState(null),[msg,setM]=useState(null);
 const cats=useGet('/expense-categories'),list=useGet('/reimbursements');
 const done=t=>()=>{setM({ok:1,t});qc.invalidateQueries({queryKey:['/reimbursements']});qc.invalidateQueries({queryKey:['/dashboard']})};
 const m=useMutation({mutationFn:()=>{if(file&&file.size>5*1024*1024)throw new Error('Receipt size must be 5 MB or less');const fd=new FormData();fd.append('category_id',f.cat);fd.append('amount',f.amount);fd.append('currency',f.cur);fd.append('expense_date',f.date);fd.append('description',f.desc);if(file)fd.append('receipt',file);return api('/reimbursements',{method:'POST',form:fd})},
  onSuccess:()=>{done('Request submitted.')();setFile(null);setF({cat:'',amount:'',cur:'IDR',date:'',desc:''})},onError:e=>setM({t:e.message})});
 const c=useMutation({mutationFn:id=>api(`/reimbursements/${id}/cancel`,{method:'POST'}),onSuccess:done('Request cancelled.'),onError:e=>setM({t:e.message})});
 return <div className="space-y-6"><Head title="Reimbursement"/>
 {can('reimbursements.submit')&&<form className="card grid gap-3 sm:grid-cols-2" onSubmit={e=>{e.preventDefault();setM(null);m.mutate()}}>
 <select required className="inp" value={f.cat} onChange={e=>setF({...f,cat:e.target.value})}><option value="">Category</option>{cats.data?.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select>
 <div className="flex gap-2"><select className="inp !w-24" value={f.cur} onChange={e=>setF({...f,cur:e.target.value})}><option>IDR</option><option>USD</option></select><input required type="number" min="0.01" step="0.01" className="inp" placeholder="Amount" value={f.amount} onChange={e=>setF({...f,amount:e.target.value})}/></div>
 <input required type="date" max={new Date().toISOString().slice(0,10)} aria-label="Expense date" className="inp" value={f.date} onChange={e=>setF({...f,date:e.target.value})}/>
 <input type="file" accept=".jpg,.jpeg,.png,.pdf" aria-label="Receipt" className="inp" onChange={e=>setFile(e.target.files[0]||null)}/>
 <input required className="sm:col-span-2 inp" placeholder="Business purpose" value={f.desc} onChange={e=>setF({...f,desc:e.target.value})}/>
 <div className="flex items-center gap-3 sm:col-span-2"><button className="btn" disabled={m.isPending}>{m.isPending?'Submitting…':'Submit request'}</button>{msg&&<span className={msg.ok?'text-ok':'text-bad'}>{msg.t}</span>}</div></form>}
 <div className="card overflow-x-auto"><Err e={list.error}/><table className="w-full text-left"><thead><tr><th>No.</th><th>Category</th><th>Amount</th><th>Date</th><th>Status</th><th/></tr></thead><tbody>
 {list.data?.map(r=><tr key={r.id} className="border-t border-line"><td>{r.request_number}</td><td>{r.category_name}</td><td>{r.currency} {Number(r.amount).toLocaleString('en-US')}</td><td>{r.expense_date}</td>
 <td><Badge s={r.status}/>{r.finance_ready&&<span className="ml-2 text-xs text-ok">Ready for finance</span>}</td>
 <td className="space-x-3">{r.has_receipt&&<button className="text-primary" onClick={()=>openReceipt(r.id)}>Receipt</button>}{r.status==='pending'&&r.employee_id===uid&&<button className="text-bad" onClick={()=>confirm('Cancel this request?')&&c.mutate(r.id)}>Cancel</button>}</td></tr>)}</tbody></table>
 {list.data?.length===0&&<Empty t="No requests yet."/>}</div></div>}
