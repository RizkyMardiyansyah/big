import {randomUUID} from 'crypto';
export const uid=randomUUID;
export class HttpError extends Error{constructor(s,m){super(m);this.status=s}}
export const bad=(m,s=400)=>new HttpError(s,m);
export const wrap=fn=>(req,res,next)=>Promise.resolve(fn(req,res,next)).catch(next);
export const audit=(db,actor,action,resource,id,summary='')=>db('audit_logs').insert({id:uid(),actor,action,resource,resource_id:String(id||''),summary:String(summary).slice(0,500),created_at:new Date()});
export const notify=(db,userId,title,link)=>db('notifications').insert({id:uid(),user_id:userId,title:String(title).slice(0,300),link,is_read:false,created_at:new Date()});
export async function nextNumber(trx,prefix){const y=new Date().getFullYear(),k=`${prefix}-${y}`;
 const n=await trx('counters').where({name:k}).increment('value',1);
 if(!n)await trx('counters').insert({name:k,value:1});
 const r=await trx('counters').where({name:k}).first();return `${k}-${String(r.value).padStart(5,'0')}`}
export const isD=s=>/^\d{4}-\d{2}-\d{2}$/.test(s||'')&&!isNaN(Date.parse(s));
export const pick=(o,ks)=>Object.fromEntries(ks.filter(k=>o[k]!==undefined).map(k=>[k,o[k]]));
