import {Router} from 'express';import bcrypt from 'bcryptjs';import {db} from '../db.js';import {authn,need,destroyUserSessions} from '../auth.js';import {wrap,bad,uid,audit,pick} from '../lib.js';
const r=Router();r.use(authn);
const lastSA=async(t,userId)=>{const sa=await t('roles').where({name:'Super Admin'}).first();if(!sa||!await t('user_roles').where({user_id:userId,role_id:sa.id}).first())return false;
 return Number((await t('user_roles as ur').join('users as u','u.id','ur.user_id').where({'ur.role_id':sa.id,'u.active':true}).count({c:'*'}).first()).c)<=1};
// ---- Pengguna
r.get('/users',need('users.view'),wrap(async(req,res)=>{const us=await db('users').select('id','email','full_name','department','job_title','active').orderBy('full_name');
 const ur=await db('user_roles as ur').join('roles as r','r.id','ur.role_id').select('ur.user_id','r.id','r.name');res.json(us.map(u=>({...u,roles:ur.filter(x=>x.user_id===u.id).map(({id,name})=>({id,name}))})))}));
r.post('/users',need('users.manage'),wrap(async(req,res)=>{const {email='',full_name='',password='',role_ids=[]}=req.body||{};
 if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)||full_name.trim().length<2)throw bad('Invalid email or name');if(password.length<8)throw bad('Temporary password must be at least 8 characters');
 if(await db('users').whereRaw('lower(email)=?',[email.toLowerCase()]).first())throw bad('This email is already registered',409);const id=uid();
 await db.transaction(async t=>{await t('users').insert({id,email:email.toLowerCase(),full_name:full_name.trim(),password_hash:await bcrypt.hash(password,10),active:true,created_at:new Date()});
  if(req.perms.includes('roles.manage'))for(const rid of role_ids)await t('user_roles').insert({user_id:id,role_id:rid});await audit(t,req.user.id,'create','users',id,email)});res.status(201).json({id})}));
r.post('/users/:id/roles',need('roles.manage'),wrap(async(req,res)=>{const {role_id,grant}=req.body||{};
 await db.transaction(async t=>{if(grant){if(!await t('user_roles').where({user_id:req.params.id,role_id}).first())await t('user_roles').insert({user_id:req.params.id,role_id})}
  else{const sa=await t('roles').where({name:'Super Admin'}).first();if(sa&&sa.id===role_id&&await lastSA(t,req.params.id))throw bad('The last active Super Admin cannot be revoked',409);await t('user_roles').where({user_id:req.params.id,role_id}).del()}
  await audit(t,req.user.id,grant?'grant_role':'revoke_role','user_roles',req.params.id,role_id)});res.json({ok:true})}));
r.post('/users/:id/active',need('users.manage'),wrap(async(req,res)=>{const a=!!req.body?.active;
 await db.transaction(async t=>{if(!a&&(req.params.id===req.user.id||await lastSA(t,req.params.id)))throw bad('This account cannot be deactivated',409);await t('users').where({id:req.params.id}).update({active:a});if(!a)await destroyUserSessions(t,req.params.id);await audit(t,req.user.id,a?'activate':'deactivate','users',req.params.id)});res.json({ok:true})}));
r.post('/users/:id/reset-password',need('users.manage'),wrap(async(req,res)=>{const p=req.body?.password||'';if(p.length<8)throw bad('Password must be at least 8 characters');
 await db('users').where({id:req.params.id}).update({password_hash:await bcrypt.hash(p,10)});await destroyUserSessions(db,req.params.id);await audit(db,req.user.id,'admin_reset_password','users',req.params.id);res.json({ok:true})}));
// ---- Peran & izin
r.get('/roles',need('roles.manage','users.view'),wrap(async(req,res)=>{const rs=await db('roles').orderBy('name'),rp=await db('role_permissions');res.json(rs.map(x=>({...x,perms:rp.filter(p=>p.role_id===x.id).map(p=>p.perm)})))}));
r.get('/permissions',need('roles.manage'),wrap(async(req,res)=>res.json(await db('permissions').orderBy('code'))));
const saveRole=wrap(async(req,res)=>{const {name='',description='',perms=[]}=req.body||{};if(!name.trim())throw bad('Role name is required');let id=req.params.id;
 await db.transaction(async t=>{if(!id){if(await t('roles').where({name:name.trim()}).first())throw bad('A role with this name already exists',409);id=uid();await t('roles').insert({id,name:name.trim(),description,is_system:false})}
  else{const x=await t('roles').where({id}).first();if(!x)throw bad('Role not found',404);if(x.is_system)throw bad('System roles cannot be changed',409);await t('roles').where({id}).update({name:name.trim(),description})}
  await t('role_permissions').where({role_id:id}).del();const ok=await t('permissions').whereIn('code',perms).pluck('code');for(const c of ok)await t('role_permissions').insert({role_id:id,perm:c});await audit(t,req.user.id,'save_role','roles',id,name)});res.json({id})});
r.post('/roles',need('roles.manage'),saveRole);r.put('/roles/:id',need('roles.manage'),saveRole);
r.delete('/roles/:id',need('roles.manage'),wrap(async(req,res)=>{const x=await db('roles').where({id:req.params.id}).first();if(!x)throw bad('Role not found',404);if(x.is_system)throw bad('System roles cannot be deleted',409);
 if(await db('user_roles').where({role_id:x.id}).first())throw bad('This role is still assigned to users',409);
 if(await db('approval_workflow_steps').where({role_id:x.id}).first()||await db('approval_steps').where({approver_role:x.id}).whereIn('status',['waiting','active']).first())throw bad('This role is used in an approval workflow',409);
 await db.transaction(async t=>{await t('role_permissions').where({role_id:x.id}).del();await t('roles').where({id:x.id}).del();await audit(t,req.user.id,'delete_role','roles',x.id,x.name)});res.json({ok:true})}));
r.get('/audit-logs',need('audit_logs.view'),wrap(async(req,res)=>res.json(await db('audit_logs').orderBy('created_at','desc').limit(100))));
// ---- CMS
const cms=need('landing_content.manage');
r.put('/site',cms,wrap(async(req,res)=>{const b=pick(req.body||{},['company_name','hero_badge','hero_title','hero_highlight','hero_subtitle','about_label','about_title','about_text','phone','address','contact_email','footer_text']);
 await db.transaction(async t=>{if(await t('site_settings').where({id:1}).first())await t('site_settings').where({id:1}).update(b);else await t('site_settings').insert({id:1,...b});await audit(t,req.user.id,'update','site_settings',1)});res.json({ok:true})}));
const SORTED=['services','portfolio_projects','testimonials','site_stats'];
const crud=(p,table,fields,prep)=>{
 r.get(p,cms,wrap(async(req,res)=>res.json(await db(table).orderBy(SORTED.includes(table)?'sort_order':'created_at',SORTED.includes(table)?'asc':'desc'))));
 r.post(p,cms,wrap(async(req,res)=>{const id=uid();await db(table).insert({id,...await prep(pick(req.body||{},fields),null,req)});await audit(db,req.user.id,'create',table,id);res.status(201).json({id})}));
 r.put(`${p}/:id`,cms,wrap(async(req,res)=>{const old=await db(table).where({id:req.params.id}).first();if(!old)throw bad('Not found',404);await db(table).where({id:old.id}).update(await prep(pick(req.body||{},fields),old,req));await audit(db,req.user.id,'update',table,old.id);res.json({ok:true})}));
 r.delete(`${p}/:id`,cms,wrap(async(req,res)=>{await db(table).where({id:req.params.id}).del();await audit(db,req.user.id,'delete',table,req.params.id);res.json({ok:true})}))};
crud('/services','services',['title','description','icon','kind','link','sort_order','published'],async b=>{if('title'in b&&!String(b.title).trim())throw bad('Title is required');return b});
crud('/articles','articles',['title','slug','excerpt','content','category','cover','published'],async(b,old,req)=>{if(b.slug!==undefined&&!/^[a-z0-9-]+$/.test(b.slug))throw bad('Slug may only contain lowercase letters, numbers, and hyphens');
 if(!old&&(!b.title||!b.slug||!b.content))throw bad('Title, slug, and content are required');
 const pub=b.published!==undefined?!!b.published:old?.published;if(b.published!==undefined)b.published=!!b.published;
 if(pub)b.published_at=old?.published_at||new Date();else if(b.published!==undefined)b.published_at=null;if(!old)b.author_id=req.user.id;return b});
const same=async b=>b;
crud('/portfolio','portfolio_projects',['title','category','image','link','sort_order','published'],async b=>{if('title'in b&&!String(b.title).trim())throw bad('Title is required');return b});
crud('/testimonials','testimonials',['quote','name','role','sort_order','published'],async b=>{if('quote'in b&&String(b.quote).length>600)throw bad('Quote must be 600 characters or fewer');return b});
crud('/stats','site_stats',['value','label','description','icon','sort_order'],same);
// ---- Pengaturan master data & alur persetujuan
const set=need('settings.manage');
const master=(p,table,fields)=>{
 r.get(p,set,wrap(async(req,res)=>res.json(await db(table).orderBy('name'))));
 r.post(p,set,wrap(async(req,res)=>{const b=pick(req.body||{},fields);if(!String(b.name||'').trim())throw bad('Name is required');const id=uid();await db(table).insert({id,...b,name:b.name.trim(),active:true});await audit(db,req.user.id,'create',table,id,b.name);res.status(201).json({id})}));
 r.put(`${p}/:id`,set,wrap(async(req,res)=>{const b=pick(req.body||{},[...fields,'active']);if('name'in b&&!String(b.name).trim())throw bad('Name is required');await db(table).where({id:req.params.id}).update(b);await audit(db,req.user.id,'update',table,req.params.id);res.json({ok:true})}))};
master('/leave-types','leave_types',['name']);master('/expense-categories','expense_categories',['name','receipt_required']);
r.get('/workflows',set,wrap(async(req,res)=>{const st=await db('approval_workflow_steps').orderBy('step_no');res.json({leave:st.filter(s=>s.request_type==='leave').map(s=>s.role_id),reimbursement:st.filter(s=>s.request_type==='reimbursement').map(s=>s.role_id)})}));
r.put('/workflows/:type',set,wrap(async(req,res)=>{const type=req.params.type,ids=req.body?.role_ids;if(!['leave','reimbursement'].includes(type))throw bad('Invalid type');
 if(!Array.isArray(ids)||ids.length<1||ids.length>5)throw bad('A workflow must have 1 to 5 steps');if(await db('roles').whereIn('id',ids).count({c:'*'}).first().then(x=>Number(x.c))!==new Set(ids).size)throw bad('Invalid role');
 await db.transaction(async t=>{await t('approval_workflow_steps').where({request_type:type}).del();for(const [i,id] of ids.entries())await t('approval_workflow_steps').insert({id:uid(),request_type:type,step_no:i+1,role_id:id});await audit(t,req.user.id,'save_workflow',type,type,`${ids.length} steps`)});res.json({ok:true})}));
export default r;
