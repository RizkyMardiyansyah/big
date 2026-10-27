import {Router} from 'express';import multer from 'multer';import {putFile,getFile,delFile,LIMIT} from '../files.js';
import {db} from '../db.js';import {authn,need} from '../auth.js';import {wrap,bad,uid,audit,pick} from '../lib.js';
const r=Router();r.use(authn);
const EXT={pdf:'application/pdf',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',txt:'text/plain',csv:'text/csv',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',pptx:'application/vnd.openxmlformats-officedocument.presentationml.presentation'};
const MAG={pdf:[0x25,0x50,0x44,0x46],png:[0x89,0x50,0x4E,0x47],jpg:[0xFF,0xD8,0xFF],jpeg:[0xFF,0xD8,0xFF],docx:[0x50,0x4B],xlsx:[0x50,0x4B],pptx:[0x50,0x4B]};
const PREVIEW=['pdf','png','jpg','jpeg'],CATS=['General','Project Documents','Contracts','Policies','Procedures','Reports','Other'],VIS=['all','project','private'];
const up=multer({storage:multer.memoryStorage(),limits:{fileSize:LIMIT(10*1024*1024),files:1}});
import {inProject,canAccessDoc} from '../docAccess.js';
const canAccess=canAccessDoc;
const canEdit=(req,d)=>req.perms.includes('documents.manage')||d.uploader_id===req.user.id;
const load=async(req,id)=>{const d=await db('documents').where({id}).first();if(!d||!await canAccess(req,d))throw bad('Document not found',404);return d};
r.get('/folders',need('documents.view'),wrap(async(req,res)=>res.json(await db('document_folders').orderBy('name'))));
r.post('/folders',need('documents.create'),wrap(async(req,res)=>{const n=String(req.body?.name||'').trim();if(!n||n.length>100)throw bad('Invalid folder name');const id=uid();await db('document_folders').insert({id,name:n,created_by:req.user.id,created_at:new Date()});await audit(db,req.user.id,'create','document_folder',id,n);res.status(201).json({id})}));
r.get('/documents',need('documents.view'),wrap(async(req,res)=>{const {q='',category,folder_id,archived}=req.query;
 const rows=await db('documents as d').join('users as u','u.id','d.uploader_id').where('d.archived',archived==='1').modify(x=>{if(q)x.where('d.name','like',`%${q}%`);if(category)x.where('d.category',category);if(folder_id)x.where('d.folder_id',folder_id)})
  .select('d.id','d.name','d.original_name','d.category','d.folder_id','d.project_id','d.visibility','d.uploader_id','d.size','d.mime','d.archived','d.created_at','u.full_name as uploader').orderBy('d.created_at','desc').limit(300);
 const ok=await Promise.all(rows.map(d=>canAccess(req,d)));res.json(rows.filter((_,i)=>ok[i]).map(d=>({...d,can_edit:canEdit(req,d),previewable:PREVIEW.includes(d.original_name.split('.').pop().toLowerCase())})))}));
r.post('/documents',need('documents.create'),up.single('file'),wrap(async(req,res)=>{const f=req.file,b=req.body||{};if(!f)throw bad('Please choose a file');
 const orig=Buffer.from(f.originalname,'latin1').toString('utf8').slice(0,200),ext=(orig.split('.').pop()||'').toLowerCase();
 if(!EXT[ext])throw bad('File type not allowed (PDF, PNG, JPG, TXT, CSV, DOCX, XLSX, PPTX)');const m=MAG[ext];if(m&&!m.every((x,i)=>f.buffer[i]===x))throw bad('File content does not match its extension');
 const category=CATS.includes(b.category)?b.category:'General',visibility=VIS.includes(b.visibility)?b.visibility:'all',project_id=b.project_id||null,folder_id=b.folder_id||null;
 if(visibility==='project'&&(!project_id||!await inProject(req,project_id)))throw bad('Select a project you belong to for project access');
 if(folder_id&&!await db('document_folders').where({id:folder_id}).first())throw bad('Folder not found');
 const id=uid(),file=uid();await putFile('documents',file,f.buffer);
 try{await db('documents').insert({id,name:(String(b.name||'').trim()||orig).slice(0,200),original_name:orig,storage_file:file,category,folder_id,project_id,visibility,uploader_id:req.user.id,size:f.size,mime:EXT[ext],archived:false,created_at:new Date()});await audit(db,req.user.id,'upload','document',id,orig)}
 catch(e){await delFile('documents',file);throw e}res.status(201).json({id})}));
r.get('/documents/:id/download',need('documents.view'),wrap(async(req,res)=>{const d=await load(req,req.params.id),ext=d.original_name.split('.').pop().toLowerCase();
 const inline=req.query.inline==='1'&&PREVIEW.includes(ext);res.set({'Content-Type':d.mime,'X-Content-Type-Options':'nosniff','Content-Security-Policy':"sandbox; default-src 'none'",'Content-Disposition':`${inline?'inline':'attachment'}; filename*=UTF-8''${encodeURIComponent(d.original_name)}`});
 const buf=await getFile('documents',d.storage_file);if(!buf)throw bad('File not found',404);res.send(buf)}));
r.patch('/documents/:id',need('documents.edit'),wrap(async(req,res)=>{const d=await load(req,req.params.id);if(!canEdit(req,d))throw bad('Only the uploader or a document manager can do this',403);
 const b=pick(req.body||{},['name','category','folder_id','visibility','archived']);if('name'in b){b.name=String(b.name).trim().slice(0,200);if(!b.name)throw bad('Name is required')}
 if(b.category&&!CATS.includes(b.category))throw bad('Invalid category');if(b.visibility&&!VIS.includes(b.visibility))throw bad('Invalid access setting');if('archived'in b)b.archived=!!b.archived;if('folder_id'in b)b.folder_id=b.folder_id||null;
 await db('documents').where({id:d.id}).update(b);await audit(db,req.user.id,'update','document',d.id,JSON.stringify(b).slice(0,300));res.json({ok:true})}));
r.delete('/documents/:id',need('documents.delete'),wrap(async(req,res)=>{const d=await load(req,req.params.id);if(!canEdit(req,d))throw bad('Only the uploader or a document manager can do this',403);
 await db('task_documents').where({document_id:d.id}).del();await db('project_documents').where({document_id:d.id}).del();await db('documents').where({id:d.id}).del();await delFile('documents',d.storage_file);await audit(db,req.user.id,'delete','document',d.id,d.original_name);res.json({ok:true})}));
export default r;
