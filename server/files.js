// Penyimpanan berkas di database (tabel file_blobs) agar jalan di hosting serverless (Vercel)
// yang tidak punya disk persisten. Berkas lama di STORAGE_DIR (instalasi sebelumnya) tetap bisa dibaca.
import {readFile} from 'fs/promises';import path from 'path';
import {db} from './db.js';
const legacy=(kind,id)=>path.resolve(process.env.STORAGE_DIR||'./storage',kind,id);
export const LIMIT=n=>process.env.VERCEL?Math.min(n,4*1024*1024):n; // batas body fungsi Vercel ~4,5 MB
export async function putFile(kind,id,buf){const key=`${kind}/${id}`;await db('file_blobs').where({id:key}).del();await db('file_blobs').insert({id:key,data:buf,created_at:new Date()})}
export async function getFile(kind,id){const row=await db('file_blobs').where({id:`${kind}/${id}`}).first();if(row&&row.data)return Buffer.from(row.data);try{return await readFile(legacy(kind,id))}catch{return null}}
export const delFile=(kind,id)=>db('file_blobs').where({id:`${kind}/${id}`}).del().catch(()=>{});
