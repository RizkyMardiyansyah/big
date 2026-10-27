import {Router} from 'express';import bcrypt from 'bcryptjs';import {createHash,randomBytes} from 'crypto';import rateLimit from 'express-rate-limit';
import {db} from '../db.js';import {authn,loadSession,getPerms,createSession,destroySession,destroyUserSessions} from '../auth.js';import {wrap,bad,uid,audit} from '../lib.js';
const r=Router(),lim=rateLimit({windowMs:15*60*1000,limit:30,standardHeaders:true,legacyHeaders:false,message:{error:'Too many attempts. Please try again later.'}});
const sha=s=>createHash('sha256').update(s).digest('hex');
r.post('/login',lim,wrap(async(req,res)=>{const {email='',password=''}=req.body||{};
 const u=await db('users').whereRaw('lower(email)=?',[String(email).toLowerCase()]).first();
 const ok=u&&u.active&&await bcrypt.compare(String(password),u.password_hash);
 if(!ok)throw bad('Incorrect email or password',401);
 await createSession(req,res,u.id);
 res.json({user:{id:u.id,email:u.email,name:u.full_name},permissions:await getPerms(u.id)})}));
// Tidak melempar 401 bila belum login: dipakai frontend untuk mengecek sesi yang masih ada saat halaman dibuka.
r.get('/me',wrap(async(req,res)=>{const s=await loadSession(req,res);res.json(s.user?{user:s.user,permissions:s.perms}:{user:null,permissions:[]})}));
r.post('/logout',wrap(async(req,res)=>{await destroySession(req,res);res.json({ok:true})}));
r.post('/change-password',authn,wrap(async(req,res)=>{const {current,next}=req.body||{};if(String(next||'').length<8)throw bad('New password must be at least 8 characters');
 const u=await db('users').where({id:req.user.id}).first();if(!await bcrypt.compare(String(current||''),u.password_hash))throw bad('Current password is incorrect');
 await db('users').where({id:u.id}).update({password_hash:await bcrypt.hash(next,10)});await destroyUserSessions(db,u.id,req.sessionId);await audit(db,u.id,'change_password','users',u.id);res.json({ok:true})}));
r.post('/forgot',lim,wrap(async(req,res)=>{const u=await db('users').whereRaw('lower(email)=?',[String(req.body?.email||'').toLowerCase()]).where({active:true}).first();
 if(u){const t=randomBytes(24).toString('hex');await db('password_resets').insert({id:uid(),user_id:u.id,token_hash:sha(t),expires_at:new Date(Date.now()+3600e3),used:false});
  // Belum ada pengiriman email. Tautan dicetak di log server; sambungkan SMTP/penyedia email untuk produksi.
  console.log(`[RESET PASSWORD] ${u.email}: ${process.env.APP_URL||''}/reset-password?token=${t}`)}
 res.json({ok:true})}));
r.post('/reset',lim,wrap(async(req,res)=>{const {token='',password=''}=req.body||{};if(password.length<8)throw bad('Password must be at least 8 characters');
 const pr=await db('password_resets').where({token_hash:sha(token),used:false}).where('expires_at','>',new Date()).first();if(!pr)throw bad('This link is invalid or has expired');
 await db.transaction(async t=>{const n=await t('password_resets').where({id:pr.id,used:false}).update({used:true});if(!n)throw bad('This link has already been used');await t('users').where({id:pr.user_id}).update({password_hash:await bcrypt.hash(password,10)});await destroyUserSessions(t,pr.user_id);await audit(t,pr.user_id,'reset_password','users',pr.user_id)});res.json({ok:true})}));
export default r;
