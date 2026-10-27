// Dokumen, folder, avatar, izin baru. Aman dijalankan pada instalasi baru maupun yang sudah di-seed.
const NEW=['documents.view','documents.create','documents.edit','documents.delete','documents.manage','settings.manage'];
const G={'Super Admin':NEW,Manager:['documents.view','documents.create','documents.edit'],Employee:['documents.view','documents.create'],Finance:['documents.view','documents.create']};
export async function up(k){
 await k.schema.createTable('document_folders',t=>{t.string('id',36).primary();t.string('name',100).notNullable();t.string('created_by',36);t.timestamp('created_at').defaultTo(k.fn.now())});
 await k.schema.createTable('documents',t=>{t.string('id',36).primary();t.string('name',200).notNullable();t.string('original_name',200).notNullable();t.string('storage_file',40).notNullable();t.string('category',40).notNullable();
  t.string('folder_id',36);t.foreign('folder_id').references('id').inTable('document_folders');t.string('project_id',36);t.foreign('project_id').references('id').inTable('projects');
  t.string('visibility',10).notNullable().defaultTo('all');t.string('uploader_id',36).notNullable();t.foreign('uploader_id').references('id').inTable('users');
  t.integer('size').notNullable();t.string('mime',100).notNullable();t.boolean('archived').notNullable().defaultTo(false);t.timestamp('created_at').defaultTo(k.fn.now())});
 await k.schema.alterTable('users',t=>{t.string('avatar_mime',50)});
 if(await k('roles').first()){
  for(const c of NEW)if(!await k('permissions').where({code:c}).first())await k('permissions').insert({code:c,label:c});
  for(const [n,ps] of Object.entries(G)){const r=await k('roles').where({name:n}).first();if(!r)continue;for(const p of ps)if(!await k('role_permissions').where({role_id:r.id,perm:p}).first())await k('role_permissions').insert({role_id:r.id,perm:p})}}
}
export async function down(k){await k.schema.alterTable('users',t=>t.dropColumn('avatar_mime'));await k.schema.dropTableIfExists('documents');await k.schema.dropTableIfExists('document_folders')}
