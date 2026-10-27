import 'dotenv/config';import express from 'express';import helmet from 'helmet';import cors from 'cors';import {readFileSync,existsSync} from 'fs';import path from 'path';
import {db,migrationsDir} from './db.js';import {seed,seedContent} from './seedData.js';import authR from './routes/auth.js';import publicR from './routes/public.js';import appR from './routes/app.js';import adminR from './routes/admin.js';import docR from './routes/documents.js';import profR from './routes/profile.js';
const app=express();app.set('trust proxy',1);app.use(helmet());app.use(cors({origin:process.env.APP_URL||true,credentials:true}));app.use(express.json({limit:'100kb'}));
app.get('/api/health',async(req,res)=>{try{await db.raw('select 1 as ok');res.json({ok:true,db:process.env.DB_CLIENT||'mssql'})}catch(e){res.status(503).json({ok:false,error:e.message})}});
app.use('/api/auth',authR);app.use('/api/public',publicR);app.use('/api/admin',adminR);app.use('/api',docR);app.use('/api',profR);app.use('/api',appR);
app.use('/api',(req,res)=>res.status(404).json({error:'Endpoint not found'}));
// Produksi: layani hasil build frontend (dist/) dengan fallback SPA
const dist=path.resolve('dist');if(!process.env.VERCEL&&existsSync(dist)){app.use(express.static(dist));app.get('*',(req,res)=>res.sendFile(path.join(dist,'index.html')))}
app.use((e,req,res,next)=>{if(e.code==='LIMIT_FILE_SIZE')return res.status(400).json({error:'File size is too large (max '+(process.env.VERCEL?4:5)+' MB)'});const s=e.status||500;if(s>=500)console.error(e);res.status(s).json({error:s>=500?'A server error occurred':e.message})});
if(process.env.AUTO_MIGRATE!=='false'&&!process.env.VERCEL){try{const [,l]=await db.migrate.latest({directory:migrationsDir});if(l.length)console.log('Migrations run:',l.join(', '));await seed(db);await seedContent(db)}catch(e){console.error('Automatic migration/seed failed (check the DB connection in .env):',e.message)}}
// Di Vercel app diekspor sebagai Serverless Function (api/index.js); tidak ada listen.
if(!process.env.VERCEL){const port=Number(process.env.PORT||4000);app.listen(port,()=>console.log(`BIG API at http://localhost:${port} (DB: ${process.env.DB_CLIENT||'mssql'})`))}
export default app;
