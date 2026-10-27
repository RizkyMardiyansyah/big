import {uid,bad,notify,audit} from './lib.js';
const T={leave:'leave_requests',reimbursement:'reimbursement_requests'};
export const notifyRole=async(trx,roleId,except,title,link)=>{const us=await trx('user_roles as ur').join('users as u','u.id','ur.user_id').where('ur.role_id',roleId).where('u.active',true).whereNot('u.id',except).select('u.id');for(const u of us)await notify(trx,u.id,title,link)};
export async function createInstance(trx,type,reqId,empId,no){
 const flow=await trx('approval_workflow_steps').where({request_type:type}).orderBy('step_no');
 if(!flow.length)throw bad('The approval workflow has not been configured',500);
 for(const [i,f] of flow.entries())await trx('approval_steps').insert({id:uid(),request_type:type,request_id:reqId,step_no:f.step_no,approver_role:f.role_id,status:i===0?'active':'waiting'});
 await notifyRole(trx,flow[0].role_id,empId,`Request ${no} is waiting for your approval`,'/app/approvals')}
export async function cancel(trx,type,id,me){
 const n=await trx(T[type]).where({id,employee_id:me,status:'pending'}).update({status:'cancelled'});
 if(!n)throw bad('This request cannot be cancelled',409);
 await trx('approval_steps').where({request_type:type,request_id:id}).whereIn('status',['waiting','active']).update({status:'cancelled'});
 await audit(trx,me,'cancel',`${type}_request`,id)}
export async function act(trx,{stepId,me,perms,decision,comment}){
 if(!['approved','rejected'].includes(decision))throw bad('Invalid decision');
 if(decision==='rejected'&&!String(comment||'').trim())throw bad('A comment is required when rejecting');
 if(!perms.includes('approvals.approve'))throw bad('You do not have permission to approve',403);
 const s=await trx('approval_steps').where({id:stepId}).first();
 if(!s||s.status!=='active')throw bad('This step is not active or has already been processed',409);
 const rq=await trx(T[s.request_type]).where({id:s.request_id}).first();
 if(rq.employee_id===me)throw bad('You cannot approve your own request',403);
 if(!await trx('user_roles').where({user_id:me,role_id:s.approver_role}).first())throw bad('You are not an approver for this step',403);
 // Update bersyarat = penjaga atomik terhadap aksi ganda/bersamaan (jalan di semua DB)
 const n=await trx('approval_steps').where({id:stepId,status:'active'}).update({status:decision,decided_by:me,comment:comment||null,decided_at:new Date()});
 if(!n)throw bad('This step has already been processed',409);
 const tbl=T[s.request_type],link=s.request_type==='leave'?'/app/leave-requests':'/app/reimbursements';
 const rest=trx('approval_steps').where({request_type:s.request_type,request_id:s.request_id});
 if(decision==='rejected'){await trx(tbl).where({id:rq.id}).update({status:'rejected'});await rest.clone().where({status:'waiting'}).update({status:'cancelled'})}
 else{const nx=await rest.clone().where({status:'waiting'}).orderBy('step_no').first();
  if(!nx)await trx(tbl).where({id:rq.id}).update(s.request_type==='leave'?{status:'approved'}:{status:'approved',finance_ready:true});
  else{await trx('approval_steps').where({id:nx.id}).update({status:'active'});await notifyRole(trx,nx.approver_role,rq.employee_id,`Request ${rq.request_number} is waiting for your approval`,'/app/approvals')}}
 await notify(trx,rq.employee_id,`Request ${rq.request_number} ${decision==='approved'?'was approved at one step':'was rejected'}`,link);
 await audit(trx,me,decision,`${s.request_type}_request`,rq.id,comment||'')}
