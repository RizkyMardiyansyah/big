import {createHash,randomBytes} from 'crypto';import {db} from './db.js';import {wrap,bad} from './lib.js';

// ---- Session login (cookie httpOnly + tabel `sessions`)
// Browser menyimpan token acak di cookie `big_sid` (tidak terbaca JavaScript); database hanya menyimpan hash-nya.
// Masa berlaku "sliding": tiap pemakaian memperpanjang SESSION_DAYS hari (default 7), dibatasi total SESSION_MAX_DAYS hari (default 30).
export const COOKIE='big_sid';
const DAY=864e5,num=(v,d)=>Number(v)>0?Number(v):d;
export const IDLE_DAYS=num(process.env.SESSION_DAYS,7),MAX_DAYS=num(process.env.SESSION_MAX_DAYS,30);
const sha=s=>createHash('sha256').update(s).digest('hex');
const readCookie=(req,name)=>{for(const part of String(req.headers.cookie||'').split(';')){const i=part.indexOf('=');if(i>0&&part.slice(0,i).trim()===name){try{return decodeURIComponent(part.slice(i+1).trim())}catch{return null}}}return null};
const base=req=>({httpOnly:true,sameSite:'lax',secure:!!req.secure,path:'/'});
const expiryFor=(created,now)=>new Date(Math.min(now+IDLE_DAYS*DAY,new Date(created).getTime()+MAX_DAYS*DAY));

export async function createSession(req,res,userId){
 const token=randomBytes(32).toString('hex'),now=new Date(),exp=expiryFor(now,now.getTime());
 await db('sessions').where('expires_at','<',now).del(); // bersih-bersih sesi kedaluwarsa
 await db('sessions').insert({id:sha(token),user_id:userId,created_at:now,last_seen_at:now,expires_at:exp,ip:String(req.ip||'').slice(0,64)||null,user_agent:String(req.headers['user-agent']||'').slice(0,300)||null});
 res.cookie(COOKIE,token,{...base(req),expires:exp})}
export async function destroySession(req,res){const t=readCookie(req,COOKIE);if(t)await db('sessions').where({id:sha(t)}).del();res.clearCookie(COOKIE,base(req))}
// Cabut semua sesi pengguna (kecuali satu, mis. sesi yang sedang dipakai) - dipakai saat ganti/reset sandi atau akun dinonaktifkan.
export const destroyUserSessions=(x,userId,exceptId)=>x('sessions').where({user_id:userId}).modify(q=>{if(exceptId)q.whereNot({id:exceptId})}).del();

export const getPerms=async id=>(await db('user_roles as ur').join('role_permissions as rp','rp.role_id','ur.role_id').join('users as u','u.id','ur.user_id').where('ur.user_id',id).where('u.active',true).distinct('rp.perm')).map(r=>r.perm);

// Mengembalikan {user,perms,sid} bila sesi valid; {msg} bila tidak ada/kedaluwarsa.
export async function loadSession(req,res){
 const token=readCookie(req,COOKIE);if(!token)return {msg:'Not signed in'};
 const sid=sha(token),s=await db('sessions').where({id:sid}).first(),now=Date.now();
 const drop=async msg=>{await db('sessions').where({id:sid}).del();res.clearCookie(COOKIE,base(req));return {msg}};
 if(!s)return drop('Your session has expired. Please sign in again');
 if(new Date(s.expires_at).getTime()<=now||new Date(s.created_at).getTime()+MAX_DAYS*DAY<=now)return drop('Your session has expired. Please sign in again');
 const u=await db('users').where({id:s.user_id,active:true}).first();if(!u)return drop('This account is inactive');
 if(now-new Date(s.last_seen_at).getTime()>10*60e3){const exp=expiryFor(s.created_at,now); // perpanjang paling sering tiap 10 menit
  await db('sessions').where({id:sid}).update({last_seen_at:new Date(now),expires_at:exp});res.cookie(COOKIE,token,{...base(req),expires:exp})}
 return {user:{id:u.id,email:u.email,name:u.full_name},perms:await getPerms(u.id),sid}}

export const authn=wrap(async(req,res,next)=>{const s=await loadSession(req,res);if(!s.user)throw bad(s.msg,401);req.user=s.user;req.perms=s.perms;req.sessionId=s.sid;next()});
export const need=(...ps)=>(req,res,next)=>ps.some(p=>req.perms.includes(p))?next():next(bad('You do not have permission to perform this action',403));
