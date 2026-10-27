import {Router} from 'express';import multer from 'multer';import {mkdir,writeFile,unlink} from 'fs/promises';import path from 'path';
import {db} from '../db.js';import {authn,need} from '../auth.js';import {wrap,bad,uid,audit,notify,nextNumber,isD,pick} from '../lib.js';import {createInstance,cancel,act} from '../approvals.js';
const r=Router();r.use(authn);
const STORE=path.resolve(process.env.STORAGE_DIR||'./storage','receipts');
const up=multer({storage:multer.memoryStorage(),limits:{fileSize:5*1024*1024,files:1}});
const MAGIC={'image/jpeg':[0xFF,0xD8,0xFF],'image/png':[0x89,0x50,0x4E,0x47],'application/pdf':[0x25,0x50,0x44,0x46]};
const workdays=(s,e)=>{let n=0;for(let d=new Date(s+'T00:00:00Z');d<=new Date(e+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+1)){const w=d.getUTCDay();if(w&&w<6)n++}return n};
const count=async q=>Number((await q.count({c:'*'}).first()).c);
// akses proyek: manage = semua; selain itu manajer/pembuat/anggota
const scope=(req,q)=>req.perms.includes('projects.manage')?q:q.where(b=>b.where('manager_id',req.user.id).orWhere('created_by',req.user.id).orWhereIn('id',db('project_members').select('project_id').where('user_id',req.user.id)));
const canSee=async(req,pid)=>!!await scope(req,db('projects').where({id:pid})).first();
const isOwner=async(req,pid)=>req.perms.includes('projects.manage')||!!await db('projects').where({id:pid}).where(b=>b.where('manager_id',req.user.id).orWhere('created_by',req.user.id)).first();

r.get('/directory',wrap(async(req,res)=>res.json(await db('users').where({active:true}).select('id','full_name').orderBy('full_name'))));
r.get('/dashboard',need('dashboard.view'),wrap(async(req,res)=>{const me=req.user.id,all=req.perms.includes('leave_requests.manage'),allReimb=req.perms.includes('reimbursements.manage');
 const roles=await db('user_roles').where({user_id:me}).pluck('role_id');
 const ids=scope(req,db('projects')).select('id');
 const leaveQ=()=>db('leave_requests').modify(q=>all||q.where({employee_id:me})),reimbQ=()=>db('reimbursement_requests').modify(q=>allReimb||q.where({employee_id:me}));
 // Tren 30 hari: dihitung di JS agar portabel antar database (MSSQL/PG/MySQL/SQLite)
 const now=Date.now(),D30=30*864e5,trend=async q=>{const rows=await q.select('created_at').orderBy('created_at','desc').limit(5000);let cur=0,prev=0;
  for(const x of rows){const t=new Date(x.created_at).getTime();if(isNaN(t))continue;const a=now-t;if(a<=D30)cur++;else if(a<=2*D30)prev++}
  return {cur,prev,pct:prev?Math.round((cur-prev)/prev*100):null}};
 const byStatus=async(q,col='status')=>Object.fromEntries((await q.select(col).count({c:'*'}).groupBy(col)).map(r=>[r[col],Number(r.c)]));
 const tasksQ=()=>db('tasks').whereIn('project_id',ids);
 const top=await db('tasks').whereIn('tasks.project_id',ids).whereIn('tasks.status',['todo','in_progress','in_review']).join('projects as p','p.id','tasks.project_id').select('p.id','p.name','p.code').count({c:'*'}).groupBy('p.id','p.name','p.code').orderBy('c','desc').limit(5);
 const recent=await db('notifications').where({user_id:me}).orderBy('created_at','desc').limit(4).select('id','title','link','is_read','created_at');
 const approvals=req.perms.includes('approvals.approve')?await count(db('approval_steps').where({status:'active'}).whereIn('approver_role',roles)):0;
 res.json({leave_pending:await count(leaveQ().where({status:'pending'})),
  reimb_pending:await count(reimbQ().where({status:'pending'})),
  approvals,
  projects_active:await count(scope(req,db('projects').where({status:'in_progress'}))),
  tasks_open:await count(tasksQ().whereIn('status',['todo','in_progress','in_review'])),
  trends:{leave_pending:await trend(leaveQ()),reimb_pending:await trend(reimbQ()),projects_active:await trend(scope(req,db('projects'))),tasks_open:await trend(tasksQ())},
  tasks_by_status:await byStatus(tasksQ()),
  projects_by_status:await byStatus(scope(req,db('projects'))),
  top_projects:top.map(t=>({id:t.id,name:t.name,code:t.code,open:Number(t.c)})),
  recent})}));

// ---- Cuti
r.get('/leave-types',wrap(async(req,res)=>res.json(await db('leave_types').where({active:true}))));
r.get('/leave',need('leave_requests.view'),wrap(async(req,res)=>res.json(await db('leave_requests as l').join('leave_types as t','t.id','l.leave_type_id').modify(q=>req.perms.includes('leave_requests.manage')||q.where('l.employee_id',req.user.id)).select('l.*','t.name as type_name').orderBy('l.created_at','desc').limit(100))));
r.post('/leave',need('leave_requests.submit'),wrap(async(req,res)=>{const {leave_type_id,start_date:s,end_date:e,reason}=req.body||{};
 if(!leave_type_id||!isD(s)||!isD(e))throw bad('Incomplete data');if(e<s)throw bad('End date must be on or after the start date');if(!String(reason||'').trim())throw bad('A reason is required');
 if(!await db('leave_types').where({id:leave_type_id,active:true}).first())throw bad('Invalid leave type');
 const days=workdays(s,e);if(!days)throw bad('The range only contains weekend days');const id=uid();
 await db.transaction(async t=>{if(await t('leave_requests').where({employee_id:req.user.id}).whereIn('status',['pending','approved']).where('start_date','<=',e).where('end_date','>=',s).first())throw bad('These dates overlap with another request',409);
  const no=await nextNumber(t,'LV');await t('leave_requests').insert({id,request_number:no,employee_id:req.user.id,leave_type_id,start_date:s,end_date:e,days,reason:String(reason).trim().slice(0,1000),status:'pending',created_at:new Date()});
  await createInstance(t,'leave',id,req.user.id,no);await audit(t,req.user.id,'submit','leave_request',id,`${days} days`)});res.status(201).json({id})}));
r.post('/leave/:id/cancel',wrap(async(req,res)=>{await db.transaction(t=>cancel(t,'leave',req.params.id,req.user.id));res.json({ok:true})}));

// ---- Reimbursement
r.get('/expense-categories',wrap(async(req,res)=>res.json(await db('expense_categories').where({active:true}))));
r.get('/reimbursements',need('reimbursements.view'),wrap(async(req,res)=>res.json((await db('reimbursement_requests as x').join('expense_categories as c','c.id','x.category_id').modify(q=>req.perms.includes('reimbursements.manage')||q.where('x.employee_id',req.user.id)).select('x.*','c.name as category_name').orderBy('x.created_at','desc').limit(100)).map(({receipt_file,...o})=>({...o,has_receipt:!!receipt_file})))));
r.post('/reimbursements',need('reimbursements.submit'),up.single('receipt'),wrap(async(req,res)=>{const b=req.body||{},f=req.file,amount=Number(b.amount);
 const c=await db('expense_categories').where({id:b.category_id,active:true}).first();if(!c)throw bad('Invalid category');
 if(!(amount>0))throw bad('Amount must be greater than 0');if(!isD(b.expense_date)||b.expense_date>new Date().toISOString().slice(0,10))throw bad('Invalid expense date');
 if(!String(b.description||'').trim())throw bad('Business purpose is required');if(c.receipt_required&&!f)throw bad('A receipt is required for this category');
 let fname=null;if(f){const m=MAGIC[f.mimetype];if(!m||!m.every((x,i)=>f.buffer[i]===x))throw bad('The receipt must be a valid JPG, PNG, or PDF');fname=uid();await mkdir(STORE,{recursive:true});await writeFile(path.join(STORE,fname),f.buffer)}
 const id=uid();try{await db.transaction(async t=>{const no=await nextNumber(t,'RB');
  await t('reimbursement_requests').insert({id,request_number:no,employee_id:req.user.id,category_id:c.id,amount,currency:String(b.currency||'IDR').toUpperCase().slice(0,3),expense_date:b.expense_date,description:String(b.description).trim().slice(0,1000),receipt_file:fname,receipt_name:f?.originalname?.slice(0,200)||null,receipt_mime:f?.mimetype||null,status:'pending',finance_ready:false,created_at:new Date()});
  await createInstance(t,'reimbursement',id,req.user.id,no);await audit(t,req.user.id,'submit','reimbursement_request',id,`${b.currency||'IDR'} ${amount}`)})}catch(e){if(fname)await unlink(path.join(STORE,fname)).catch(()=>{});throw e}
 res.status(201).json({id})}));
r.post('/reimbursements/:id/cancel',wrap(async(req,res)=>{await db.transaction(t=>cancel(t,'reimbursement',req.params.id,req.user.id));res.json({ok:true})}));
r.get('/reimbursements/:id/receipt',wrap(async(req,res)=>{const x=await db('reimbursement_requests').where({id:req.params.id}).first();if(!x||!x.receipt_file)throw bad('Receipt not found',404);
 const roles=await db('user_roles').where({user_id:req.user.id}).pluck('role_id');
 const ok=x.employee_id===req.user.id||req.perms.includes('reimbursements.manage')||!!await db('approval_steps').where({request_type:'reimbursement',request_id:x.id}).whereIn('approver_role',roles).first();
 if(!ok)throw bad('You do not have permission',403);res.set({'Content-Type':x.receipt_mime,'X-Content-Type-Options':'nosniff','Content-Disposition':'inline'});res.sendFile(path.join(STORE,x.receipt_file))}));

// ---- Persetujuan
r.get('/approvals',need('approvals.view'),wrap(async(req,res)=>{const me=req.user.id,roles=await db('user_roles').where({user_id:me}).pluck('role_id');if(!req.perms.includes('approvals.approve'))return res.json([]);
 const base=(tbl,type)=>db('approval_steps as s').join(`${tbl} as q`,'q.id','s.request_id').join('users as u','u.id','q.employee_id').where({'s.request_type':type,'s.status':'active'}).whereIn('s.approver_role',roles).whereNot('q.employee_id',me);
 const L=(await base('leave_requests','leave').select('s.id as step_id','s.request_type','q.request_number','u.full_name as requester','q.days','q.start_date','q.end_date','q.reason')).map(x=>({step_id:x.step_id,request_type:'leave',request_number:x.request_number,requester:x.requester,summary:`${x.days} days, ${x.start_date} to ${x.end_date}. ${x.reason||''}`}));
 const X=(await base('reimbursement_requests','reimbursement').select('s.id as step_id','q.id as request_id','q.request_number','u.full_name as requester','q.currency','q.amount','q.description','q.receipt_file')).map(x=>({step_id:x.step_id,request_type:'reimbursement',request_number:x.request_number,requester:x.requester,summary:`${x.currency} ${x.amount} - ${x.description}`,receipt_for:x.receipt_file?x.request_id:null}));
 res.json([...L,...X])}));
r.post('/approvals/:stepId/act',wrap(async(req,res)=>{await db.transaction(t=>act(t,{stepId:req.params.stepId,me:req.user.id,perms:req.perms,decision:req.body?.decision,comment:req.body?.comment}));res.json({ok:true})}));

// ---- Notifikasi
r.get('/notifications',wrap(async(req,res)=>res.json(await db('notifications').where({user_id:req.user.id}).orderBy('created_at','desc').limit(50))));
r.get('/notifications/unread-count',wrap(async(req,res)=>res.json({count:await count(db('notifications').where({user_id:req.user.id,is_read:false}))})));
r.post('/notifications/read',wrap(async(req,res)=>{await db('notifications').where({user_id:req.user.id,is_read:false}).modify(q=>req.body?.id&&q.where({id:req.body.id})).update({is_read:true});res.json({ok:true})}));

// ---- Projects & issues (Jira-style)
const PRI=['low','medium','high'],PST=['planning','in_progress','on_hold','completed','cancelled'],TST=['todo','in_progress','in_review','completed','cancelled'],TYP=['task','bug','story'];
import {canAccessDoc} from '../docAccess.js';
const PTYPE=['project','support','presales'];
const KEY=/^[A-Z][A-Z0-9]{1,9}$/,LINK=(pid,tid)=>`/app/projects/${pid}/board?selectedTask=${tid}`;
r.get('/projects',need('projects.view'),wrap(async(req,res)=>{const rows=await scope(req,db('projects')).orderBy('created_at','desc').limit(200);
 const cnt=rows.length?await db('tasks').whereIn('project_id',rows.map(p=>p.id)).select('project_id','status').count({c:'*'}).groupBy('project_id','status'):[];
 res.json(rows.map(p=>{const mine=cnt.filter(c=>c.project_id===p.id),total=mine.reduce((a,c)=>a+Number(c.c),0),done=mine.filter(c=>c.status==='completed').reduce((a,c)=>a+Number(c.c),0);return {...p,issue_total:total,issue_done:done}}))}));
r.post('/projects',need('projects.create'),wrap(async(req,res)=>{const b=req.body||{},code=String(b.code||'').trim().toUpperCase();if(!code||!String(b.name||'').trim())throw bad('Key and name are required');
 if(b.type&&!PTYPE.includes(b.type))throw bad('Invalid project type');
 if(!KEY.test(code))throw bad('Key must be 2-10 characters: letters and numbers, starting with a letter');
 if(await db('projects').where({code}).first())throw bad('This project key is already in use',409);const id=uid();
 await db('projects').insert({id,code,name:b.name.trim().slice(0,200),description:b.description||null,manager_id:b.manager_id||null,due_date:isD(b.due_date)?b.due_date:null,partner_id:b.partner_name?await partnerId(db,b.partner_name,req.user.id):await partnerOrNull(db,b.partner_id),customer_id:b.customer_name?await customerId(db,b.customer_name,req.user.id):await customerOrNull(db,b.customer_id),type:PTYPE.includes(b.type)?b.type:'project',priority:PRI.includes(b.priority)?b.priority:'medium',status:'planning',progress:0,issue_counter:0,created_by:req.user.id,created_at:new Date()});
 await audit(db,req.user.id,'create','project',id,b.name);res.status(201).json({id})}));
r.patch('/projects/:id',need('projects.edit'),wrap(async(req,res)=>{if(!await isOwner(req,req.params.id))throw bad('You do not have permission',403);const raw=req.body||{},b=pick(raw,['name','description','manager_id','due_date','priority','status','progress','partner_id','customer_id','type']);if(b.type&&!PTYPE.includes(b.type))throw bad('Invalid project type');if('customer_name'in raw)b.customer_id=await customerId(db,raw.customer_name,req.user.id);else if('customer_id'in b)b.customer_id=await customerOrNull(db,b.customer_id);if('partner_name'in raw)b.partner_id=await partnerId(db,raw.partner_name,req.user.id);else if('partner_id'in b)b.partner_id=await partnerOrNull(db,b.partner_id);
 if(b.status&&!PST.includes(b.status))throw bad('Invalid status');if(b.priority&&!PRI.includes(b.priority))throw bad('Invalid priority');
 if('name'in b&&!String(b.name).trim())throw bad('Name is required');if('manager_id'in b)b.manager_id=b.manager_id||null;if('due_date'in b)b.due_date=isD(b.due_date)?b.due_date:null;
 await db('projects').where({id:req.params.id}).update(b);await audit(db,req.user.id,'update','project',req.params.id,JSON.stringify(b).slice(0,300));res.json({ok:true})}));
r.get('/projects/:id/members',need('projects.view'),wrap(async(req,res)=>{if(!await canSee(req,req.params.id))throw bad('Project not found',404);res.json(await db('project_members').where({project_id:req.params.id}).select('user_id'))}));
r.post('/projects/:id/members',need('projects.edit'),wrap(async(req,res)=>{if(!await isOwner(req,req.params.id))throw bad('You do not have permission',403);const u=req.body?.user_id;
 if(!await db('users').where({id:u,active:true}).first())throw bad('Invalid user');if(!await db('project_members').where({project_id:req.params.id,user_id:u}).first())await db('project_members').insert({project_id:req.params.id,user_id:u});
 await notify(db,u,'You were added to a project',`/app/projects/${req.params.id}/board`);res.status(201).json({ok:true})}));
r.delete('/projects/:id/members/:userId',need('projects.edit'),wrap(async(req,res)=>{if(!await isOwner(req,req.params.id))throw bad('You do not have permission',403);await db('project_members').where({project_id:req.params.id,user_id:req.params.userId}).del();res.json({ok:true})}));

const needAny=(...ps)=>(req,res,next)=>ps.some(p=>req.perms.includes(p))?next():next(bad('You do not have permission to perform this action',403));
const cleanName=n=>String(n||'').trim().replace(/\s+/g,' ');
const partnerId=async(x,name,by)=>{const n=cleanName(name);if(!n)throw bad('Partner name is required');if(n.length>200)throw bad('Partner name must be 200 characters or fewer');
 const k=n.toLowerCase(),ex=await x('partners').where({name_key:k}).first();if(ex)return ex.id;const id=uid();await x('partners').insert({id,name:n,name_key:k,created_by:by,created_at:new Date()});await audit(x,by,'create','partner',id,n);return id};
const partnerOrNull=async(x,id)=>{if(!id)return null;if(!await x('partners').where({id}).first())throw bad('Invalid partner');return id};

const withMeta=async pid=>{const rows=await db('tasks').where({project_id:pid}).orderBy('rank').orderBy('created_at');
 const as=await db('task_assignees as a').join('tasks as t','t.id','a.task_id').where('t.project_id',pid).orderBy('a.seq').select('a.task_id','a.user_id','a.partner_id');
 const dc=await db('task_documents as d').join('tasks as t','t.id','d.task_id').where('t.project_id',pid).select('d.task_id').count({c:'*'}).groupBy('d.task_id');
 const am={},dm=Object.fromEntries(dc.map(x=>[x.task_id,Number(x.c)]));as.forEach(a=>(am[a.task_id]??=[]).push(a.user_id?{type:'user',id:a.user_id}:{type:'partner',id:a.partner_id}));
 return rows.map(t=>({...t,assignees:am[t.id]||[],doc_count:dm[t.id]||0}))};
// Assignees are a list of {type:'user'|'partner', id} (a partner may also be given by name; unknown names are created on the fly).
const normAssignees=async(x,list,by)=>{if(!Array.isArray(list))throw bad('Invalid assignees');if(list.length>15)throw bad('A task can have at most 15 assignees');const out=[],seen=new Set();
 for(const a of list){let type=a?.type,id=a?.id;
  if(type==='user'){if(!await x('users').where({id,active:true}).first())throw bad('Invalid assignee')}
  else if(type==='partner'){if(!id&&a.name)id=await partnerId(x,a.name,by);else if(!await x('partners').where({id}).first())throw bad('Invalid partner')}
  else throw bad('Invalid assignee');const k=type+':'+id;if(!seen.has(k)){seen.add(k);out.push({type,id})}}return out};
const writeAssignees=async(x,taskId,list)=>{await x('task_assignees').where({task_id:taskId}).del();for(const a of list)await x('task_assignees').insert({task_id:taskId,user_id:a.type==='user'?a.id:null,partner_id:a.type==='partner'?a.id:null,created_at:new Date()});
 await x('tasks').where({id:taskId}).update({assignee_id:list.find(a=>a.type==='user')?.id||null})};
const assigneeNames=async(x,taskId)=>(await x('task_assignees as a').leftJoin('users as u','u.id','a.user_id').leftJoin('partners as p','p.id','a.partner_id').where('a.task_id',taskId).orderBy('a.seq').select('u.full_name as un','p.name as pn')).map(v=>v.un||v.pn);
const asList=b=>Array.isArray(b.assignees)?b.assignees:(b.assignee_id?[{type:'user',id:b.assignee_id}]:[]);

r.get('/projects/:id/tasks',need('tasks.view'),wrap(async(req,res)=>{if(!await canSee(req,req.params.id))throw bad('Project not found',404);res.json(await withMeta(req.params.id))}));
r.post('/projects/:id/tasks',need('tasks.create'),wrap(async(req,res)=>{if(!await canSee(req,req.params.id))throw bad('Project not found',404);const b=req.body||{};if(!String(b.title||'').trim())throw bad('Summary is required');
 const status=TST.includes(b.status)&&b.status!=='cancelled'?b.status:'todo',id=uid();let no,users=[];
 await db.transaction(async t=>{await t('projects').where({id:req.params.id}).increment('issue_counter',1);no=(await t('projects').where({id:req.params.id}).first()).issue_counter;
  const mx=await t('tasks').where({project_id:req.params.id,status}).max({m:'rank'}).first();
  await t('tasks').insert({id,project_id:req.params.id,issue_no:no,title:b.title.trim().slice(0,300),description:String(b.description||'').slice(0,10000)||null,type:TYP.includes(b.type)?b.type:'task',assignee_id:null,due_date:isD(b.due_date)?b.due_date:null,priority:PRI.includes(b.priority)?b.priority:'medium',status,rank:(Number(mx?.m)||0)+1000,completion:status==='completed'?100:0,created_by:req.user.id,created_at:new Date(),updated_at:new Date()});
  const list=await normAssignees(t,asList(b),req.user.id);await writeAssignees(t,id,list);users=list.filter(a=>a.type==='user').map(a=>a.id)});
 for(const u of users)if(u!==req.user.id)await notify(db,u,`New task assigned to you: ${b.title.trim().slice(0,200)}`,LINK(req.params.id,id));res.status(201).json({id,issue_no:no})}));
const loadTask=async(req,id)=>{const t=await db('tasks').where({id}).first();if(!t||!await canSee(req,t.project_id))throw bad('Task not found',404);return t};
r.get('/tasks/:id',need('tasks.view'),wrap(async(req,res)=>{const t=await loadTask(req,req.params.id);
 const comments=await db('task_comments as c').join('users as u','u.id','c.user_id').where('c.task_id',t.id).orderBy('c.created_at').select('c.id','c.user_id','u.full_name as author','c.body','c.created_at');
 const history=await db('task_history as h').leftJoin('users as u','u.id','h.user_id').where('h.task_id',t.id).orderBy('h.created_at').select('h.id','h.user_id','u.full_name as author','h.field','h.from_value','h.to_value','h.created_at');
 const as=await db('task_assignees').where({task_id:t.id}).orderBy('seq').select('user_id','partner_id');
 const documents=await db('task_documents as l').join('documents as d','d.id','l.document_id').join('users as u','u.id','d.uploader_id').where('l.task_id',t.id).orderBy('l.created_at').select('d.id','d.name','d.original_name','d.size','d.category','d.created_at','u.full_name as uploader');
 res.json({task:{...t,assignees:as.map(a=>a.user_id?{type:'user',id:a.user_id}:{type:'partner',id:a.partner_id}),doc_count:documents.length},comments,history,documents})}));
r.patch('/tasks/:id',need('tasks.edit'),wrap(async(req,res)=>{const t=await loadTask(req,req.params.id),raw=req.body||{};
 const b=pick(raw,['title','description','due_date','priority','status','type','rank','completion']),hasAs='assignees'in raw||'assignee_id'in raw;
 if(b.status&&!TST.includes(b.status))throw bad('Invalid status');if(b.priority&&!PRI.includes(b.priority))throw bad('Invalid priority');if(b.type&&!TYP.includes(b.type))throw bad('Invalid task type');
 if('title'in b){b.title=String(b.title).trim().slice(0,300);if(!b.title)throw bad('Summary is required')}
 if('description'in b)b.description=String(b.description||'').slice(0,10000)||null;
 if('due_date'in b)b.due_date=isD(b.due_date)?b.due_date:null;
 if('rank'in b&&!Number.isFinite(Number(b.rank)))throw bad('Invalid rank');if('rank'in b)b.rank=Number(b.rank);
 if(b.status&&b.status!==t.status&&b.completion===undefined)b.completion=b.status==='completed'?100:(t.status==='completed'?0:t.completion);
 const H=[],chg=(f,a,c)=>{if((a??null)!==(c??null))H.push({id:uid(),task_id:t.id,user_id:req.user.id,field:f,from_value:a==null?null:String(a).slice(0,300),to_value:c==null?null:String(c).slice(0,300),created_at:new Date()})};
 if('status'in b)chg('status',t.status,b.status);if('priority'in b)chg('priority',t.priority,b.priority);if('type'in b)chg('type',t.type,b.type);if('due_date'in b)chg('due_date',t.due_date,b.due_date);
 if('title'in b)chg('summary',t.title,b.title);if('description'in b&&(b.description||null)!==(t.description||null))chg('description',null,null);
 if(!Object.keys(b).length&&!hasAs)return res.json({ok:true});let added=[];
 await db.transaction(async x=>{
  if(hasAs){const list=await normAssignees(x,asList(raw),req.user.id),before=await assigneeNames(x,t.id),old=await x('task_assignees').where({task_id:t.id}).whereNotNull('user_id').pluck('user_id');
   await writeAssignees(x,t.id,list);const after=await assigneeNames(x,t.id);if(before.join('|')!==after.join('|'))chg('assignees',before.join(', ')||null,after.join(', ')||null);added=list.filter(a=>a.type==='user'&&!old.includes(a.id)).map(a=>a.id)}
  await x('tasks').where({id:t.id}).update({...b,updated_at:new Date()});for(const h of H)await x('task_history').insert(h)});
 for(const u of added)if(u!==req.user.id)await notify(db,u,`Task assigned to you: ${t.title.slice(0,200)}`,LINK(t.project_id,t.id));res.json({ok:true})}));
// ---- Kalender: task yang di-assign ke pengguna yang sedang login, berdasarkan due date
r.get('/calendar',need('tasks.view'),wrap(async(req,res)=>{const {from,to}=req.query;if(!isD(from)||!isD(to))throw bad('from and to are required (YYYY-MM-DD)');
 if(to<from||(Date.parse(to)-Date.parse(from))/864e5>400)throw bad('Invalid date range');const me=req.user.id;
 const rows=await db('tasks as t').join('projects as p','p.id','t.project_id').whereNotNull('t.due_date').whereBetween('t.due_date',[from,to]).whereNot('t.status','cancelled')
  .where(b=>b.whereIn('t.id',db('task_assignees').select('task_id').where('user_id',me)).orWhere('t.assignee_id',me))
  .select('t.id','t.title','t.issue_no','t.status','t.priority','t.type','t.due_date','t.project_id','p.code as project_code','p.name as project_name').orderBy('t.due_date').orderBy('t.rank').limit(2000);
 // can_open: pengguna di-assign tetapi belum tentu boleh melihat proyeknya; tandai agar frontend tidak mengarah ke 404
 const ids=[...new Set(rows.map(x=>x.project_id))],vis=new Set(ids.length?(await scope(req,db('projects').whereIn('id',ids)).select('id')).map(x=>x.id):[]);
 res.json(rows.map(x=>({...x,can_open:vis.has(x.project_id)})))}));
r.delete('/tasks/:id',need('tasks.delete'),wrap(async(req,res)=>{const t=await loadTask(req,req.params.id);await db.transaction(async x=>{for(const tb of ['task_comments','task_history','task_assignees','task_documents'])await x(tb).where({task_id:t.id}).del();await x('tasks').where({id:t.id}).del()});res.json({ok:true})}));
r.post('/tasks/:id/comments',need('tasks.view'),wrap(async(req,res)=>{const t=await loadTask(req,req.params.id),body=String(req.body?.body||'').trim();if(!body)throw bad('Comment cannot be empty');if(body.length>4000)throw bad('Comment is too long (max 4000 characters)');
 const id=uid();await db('task_comments').insert({id,task_id:t.id,user_id:req.user.id,body,created_at:new Date()});await db('tasks').where({id:t.id}).update({updated_at:new Date()});
 for(const u of new Set([t.assignee_id,t.created_by]))if(u&&u!==req.user.id)await notify(db,u,`${req.user.name} commented on: ${t.title.slice(0,200)}`,LINK(t.project_id,t.id));res.status(201).json({id})}));
r.delete('/comments/:id',wrap(async(req,res)=>{const c=await db('task_comments').where({id:req.params.id}).first();if(!c)throw bad('Comment not found',404);await loadTask(req,c.task_id);
 if(c.user_id!==req.user.id&&!req.perms.includes('projects.manage'))throw bad('You can only delete your own comments',403);await db('task_comments').where({id:c.id}).del();res.json({ok:true})}));
// ---- Linked documents (tasks and projects). Linking shares the file with every member of the project.
const linkDoc=async(req,id)=>{const d=await db('documents').where({id}).first();if(!d||d.archived||!await canAccessDoc(req,d))throw bad('Document not found',404);return d};
const hist=(req,t,from,to)=>db('task_history').insert({id:uid(),task_id:t.id,user_id:req.user.id,field:'document',from_value:from,to_value:to,created_at:new Date()});
r.post('/tasks/:id/documents',need('tasks.edit'),wrap(async(req,res)=>{const t=await loadTask(req,req.params.id),d=await linkDoc(req,req.body?.document_id);
 if(!await db('task_documents').where({task_id:t.id,document_id:d.id}).first()){await db('task_documents').insert({task_id:t.id,document_id:d.id,linked_by:req.user.id,created_at:new Date()});await hist(req,t,null,d.name.slice(0,300))}
 await db('tasks').where({id:t.id}).update({updated_at:new Date()});res.status(201).json({ok:true})}));
r.delete('/tasks/:id/documents/:docId',need('tasks.edit'),wrap(async(req,res)=>{const t=await loadTask(req,req.params.id),d=await db('documents').where({id:req.params.docId}).first();
 if(await db('task_documents').where({task_id:t.id,document_id:req.params.docId}).del()&&d)await hist(req,t,d.name.slice(0,300),null);await db('tasks').where({id:t.id}).update({updated_at:new Date()});res.json({ok:true})}));
r.get('/projects/:id/documents',need('projects.view'),wrap(async(req,res)=>{const pid=req.params.id;if(!await canSee(req,pid))throw bad('Project not found',404);
 const base=()=>db('documents as d').join('users as u','u.id','d.uploader_id').where('d.archived',false).select('d.id','d.name','d.original_name','d.category','d.size','d.created_at','d.uploader_id','u.full_name as uploader');
 const direct=await base().join('project_documents as l','l.document_id','d.id').where('l.project_id',pid).select(db.raw("1 as linked"));
 const uploaded=await base().where('d.project_id',pid);
 const viaTask=await base().join('task_documents as l','l.document_id','d.id').join('tasks as t','t.id','l.task_id').where('t.project_id',pid).select('t.id as task_id','t.issue_no','t.title as task_title');
 const m=new Map(),get=d=>{if(!m.has(d.id))m.set(d.id,{id:d.id,name:d.name,original_name:d.original_name,category:d.category,size:d.size,created_at:d.created_at,uploader:d.uploader,project_linked:false,uploaded_here:false,tasks:[]});return m.get(d.id)};
 direct.forEach(d=>{get(d).project_linked=true});uploaded.forEach(d=>{get(d).uploaded_here=true});viaTask.forEach(d=>get(d).tasks.push({id:d.task_id,issue_no:d.issue_no,title:d.task_title}));
 res.json([...m.values()].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)))}));
r.post('/projects/:id/documents',need('tasks.edit'),wrap(async(req,res)=>{if(!await canSee(req,req.params.id))throw bad('Project not found',404);const d=await linkDoc(req,req.body?.document_id);
 if(!await db('project_documents').where({project_id:req.params.id,document_id:d.id}).first())await db('project_documents').insert({project_id:req.params.id,document_id:d.id,linked_by:req.user.id,created_at:new Date()});res.status(201).json({ok:true})}));
r.delete('/projects/:id/documents/:docId',need('tasks.edit'),wrap(async(req,res)=>{if(!await canSee(req,req.params.id))throw bad('Project not found',404);await db('project_documents').where({project_id:req.params.id,document_id:req.params.docId}).del();res.json({ok:true})}));

// ---- Partners (external companies/people). Anyone who can create or edit tasks/projects can add one; managing needs projects.edit.
r.get('/partners',need('projects.view'),wrap(async(req,res)=>{const rows=await db('partners').orderBy('name'),vis=await scope(req,db('projects')).whereNotNull('partner_id').select('id','name','code','partner_id');
 const tc=await db('task_assignees').whereNotNull('partner_id').select('partner_id').countDistinct({c:'task_id'}).groupBy('partner_id');
 res.json(rows.map(p=>({id:p.id,name:p.name,email:p.email,phone:p.phone,notes:p.notes,created_at:p.created_at,projects:vis.filter(v=>v.partner_id===p.id).map(v=>({id:v.id,name:v.name,code:v.code})),task_count:Number(tc.find(c=>c.partner_id===p.id)?.c||0)})))}));
r.post('/partners',needAny('tasks.create','tasks.edit','projects.create','projects.edit'),wrap(async(req,res)=>{const b=req.body||{},n=cleanName(b.name),ex=n&&await db('partners').where({name_key:n.toLowerCase()}).first();
 if(ex)return res.json({id:ex.id,existed:true});const id=await partnerId(db,n,req.user.id);
 const extra=pick(b,['email','phone','notes']);for(const k of Object.keys(extra))extra[k]=String(extra[k]||'').trim().slice(0,k==='notes'?1000:k==='phone'?50:200)||null;if(Object.keys(extra).length)await db('partners').where({id}).update(extra);res.status(201).json({id})}));
r.patch('/partners/:id',need('projects.edit'),wrap(async(req,res)=>{const p=await db('partners').where({id:req.params.id}).first();if(!p)throw bad('Partner not found',404);const b=pick(req.body||{},['name','email','phone','notes']);
 for(const k of ['email','phone','notes'])if(k in b)b[k]=String(b[k]||'').trim().slice(0,k==='notes'?1000:k==='phone'?50:200)||null;
 if('name'in b){const n=cleanName(b.name);if(!n)throw bad('Partner name is required');if(n.length>200)throw bad('Partner name must be 200 characters or fewer');const dup=await db('partners').where({name_key:n.toLowerCase()}).whereNot({id:p.id}).first();if(dup)throw bad('A partner with this name already exists',409);b.name=n;b.name_key=n.toLowerCase()}
 if(Object.keys(b).length)await db('partners').where({id:p.id}).update(b);await audit(db,req.user.id,'update','partner',p.id,p.name);res.json({ok:true})}));
r.delete('/partners/:id',need('projects.edit'),wrap(async(req,res)=>{const p=await db('partners').where({id:req.params.id}).first();if(!p)throw bad('Partner not found',404);
 await db.transaction(async x=>{await x('projects').where({partner_id:p.id}).update({partner_id:null});await x('task_assignees').where({partner_id:p.id}).del();await x('partners').where({id:p.id}).del()});await audit(db,req.user.id,'delete','partner',p.id,p.name);res.json({ok:true})}));
// ---- Customers (who a project is for). Same behavior as partners: typing a new name creates it.
const customerId=async(x,name,by)=>{const n=cleanName(name);if(!n)throw bad('Customer name is required');if(n.length>200)throw bad('Customer name must be 200 characters or fewer');
 const k=n.toLowerCase(),ex=await x('customers').where({name_key:k}).first();if(ex)return ex.id;const id=uid();await x('customers').insert({id,name:n,name_key:k,created_by:by,created_at:new Date()});await audit(x,by,'create','customer',id,n);return id};
const customerOrNull=async(x,id)=>{if(!id)return null;if(!await x('customers').where({id}).first())throw bad('Invalid customer');return id};
r.get('/customers',need('projects.view'),wrap(async(req,res)=>{const rows=await db('customers').orderBy('name'),vis=await scope(req,db('projects')).whereNotNull('customer_id').select('id','name','code','customer_id');
 res.json(rows.map(c=>({id:c.id,name:c.name,email:c.email,phone:c.phone,notes:c.notes,created_at:c.created_at,projects:vis.filter(v=>v.customer_id===c.id).map(v=>({id:v.id,name:v.name,code:v.code}))})))}));
r.post('/customers',needAny('projects.create','projects.edit'),wrap(async(req,res)=>{const b=req.body||{},n=cleanName(b.name),ex=n&&await db('customers').where({name_key:n.toLowerCase()}).first();
 if(ex)return res.json({id:ex.id,existed:true});const id=await customerId(db,n,req.user.id);
 const extra=pick(b,['email','phone','notes']);for(const k of Object.keys(extra))extra[k]=String(extra[k]||'').trim().slice(0,k==='notes'?1000:k==='phone'?50:200)||null;if(Object.keys(extra).length)await db('customers').where({id}).update(extra);res.status(201).json({id})}));
r.patch('/customers/:id',need('projects.edit'),wrap(async(req,res)=>{const c=await db('customers').where({id:req.params.id}).first();if(!c)throw bad('Customer not found',404);const b=pick(req.body||{},['name','email','phone','notes']);
 for(const k of ['email','phone','notes'])if(k in b)b[k]=String(b[k]||'').trim().slice(0,k==='notes'?1000:k==='phone'?50:200)||null;
 if('name'in b){const n=cleanName(b.name);if(!n)throw bad('Customer name is required');if(n.length>200)throw bad('Customer name must be 200 characters or fewer');const dup=await db('customers').where({name_key:n.toLowerCase()}).whereNot({id:c.id}).first();if(dup)throw bad('A customer with this name already exists',409);b.name=n;b.name_key=n.toLowerCase()}
 if(Object.keys(b).length)await db('customers').where({id:c.id}).update(b);await audit(db,req.user.id,'update','customer',c.id,c.name);res.json({ok:true})}));
r.delete('/customers/:id',need('projects.edit'),wrap(async(req,res)=>{const c=await db('customers').where({id:req.params.id}).first();if(!c)throw bad('Customer not found',404);
 await db.transaction(async x=>{await x('projects').where({customer_id:c.id}).update({customer_id:null});await x('customers').where({id:c.id}).del()});await audit(db,req.user.id,'delete','customer',c.id,c.name);res.json({ok:true})}));
export default r;
