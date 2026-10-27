import {Router} from 'express';import rateLimit from 'express-rate-limit';import {db} from '../db.js';import {wrap,bad,uid} from '../lib.js';
const r=Router();
r.get('/site',wrap(async(req,res)=>res.json(await db('site_settings').first()||{})));
const safe=(p,f)=>Promise.resolve(p).catch(e=>{console.error('[public/home]',e.message);return f});
r.get('/home',wrap(async(req,res)=>{const pub=t=>db(t).where({published:true}).orderBy('sort_order');const sv=await safe(pub('services'),[]);
 res.json({site:await safe(db('site_settings').first(),{})||{},stats:await safe(db('site_stats').orderBy('sort_order'),[]),services:sv.filter(x=>x.kind!=='product'),products:sv.filter(x=>x.kind==='product'),portfolio:await safe(pub('portfolio_projects'),[]),testimonials:await safe(pub('testimonials'),[]),
  articles:await safe(db('articles').where({published:true}).select('slug','title','excerpt','published_at','cover','category').orderBy('published_at','desc').limit(3),[])})}));
r.get('/services',wrap(async(req,res)=>res.json(await db('services').where({published:true}).orderBy('sort_order'))));
r.get('/articles',wrap(async(req,res)=>res.json(await db('articles').where({published:true}).select('slug','title','excerpt','published_at','cover','category').orderBy('published_at','desc').limit(Number(req.query.limit)||50))));
r.get('/articles/:slug',wrap(async(req,res)=>{const a=await db('articles').where({slug:req.params.slug,published:true}).select('slug','title','excerpt','content','published_at','cover','category').first();if(!a)throw bad('Article not found',404);res.json(a)}));
r.post('/contact',rateLimit({windowMs:3600e3,limit:5,message:{error:'Too many messages. Please try again later.'}}),wrap(async(req,res)=>{const {name='',email='',message=''}=req.body||{};
 if(name.trim().length<2||name.length>100||message.trim().length<5||message.length>2000||!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)||email.length>200)throw bad('Invalid input');
 await db('contact_messages').insert({id:uid(),name:name.trim(),email,message:message.trim(),created_at:new Date()});res.status(201).json({ok:true})}));
export default r;
