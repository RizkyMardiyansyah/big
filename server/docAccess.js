import {db} from './db.js';
// Shared document access rules. A document is also readable by members of any project it is linked to
// (directly, or through one of that project's tasks), so every project member can open "project documents".
export const inProject=(req,pid)=>req.perms.includes('projects.manage')?true:db('projects').where({id:pid}).where(b=>b.where('manager_id',req.user.id).orWhere('created_by',req.user.id).orWhereIn('id',db('project_members').select('project_id').where('user_id',req.user.id))).first().then(Boolean);
const viaLink=async(req,d)=>{const ids=[...await db('project_documents').where({document_id:d.id}).pluck('project_id'),...await db('task_documents as l').join('tasks as t','t.id','l.task_id').where('l.document_id',d.id).pluck('t.project_id')];
 for(const p of new Set(ids))if(await inProject(req,p))return true;return false};
export const canAccessDoc=async(req,d)=>req.perms.includes('documents.manage')||d.uploader_id===req.user.id||d.visibility==='all'||(d.visibility==='project'&&!!d.project_id&&await inProject(req,d.project_id))||await viaLink(req,d);
