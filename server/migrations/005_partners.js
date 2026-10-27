// Partners (external companies/people), multi-assignee tasks (users and/or partners), and document links for projects and tasks.
export async function up(k) {
  await k.schema.createTable('partners', t => {
    t.string('id', 36).primary();
    t.string('name', 200).notNullable();
    t.string('name_key', 200).notNullable().unique();
    t.string('email', 200); t.string('phone', 50); t.string('notes', 1000);
    t.string('created_by', 36);
    t.timestamp('created_at').defaultTo(k.fn.now());
  });
  await k.schema.alterTable('projects', t => { t.string('partner_id', 36); });
  await k.schema.createTable('task_assignees', t => {
    t.increments('seq');
    t.string('task_id', 36).notNullable(); t.foreign('task_id').references('id').inTable('tasks');
    t.string('user_id', 36);
    t.string('partner_id', 36);
    t.timestamp('created_at').defaultTo(k.fn.now());
    t.index(['task_id']);
  });
  await k.schema.createTable('task_documents', t => {
    t.string('task_id', 36).notNullable(); t.foreign('task_id').references('id').inTable('tasks');
    t.string('document_id', 36).notNullable(); t.foreign('document_id').references('id').inTable('documents');
    t.string('linked_by', 36);
    t.timestamp('created_at').defaultTo(k.fn.now());
    t.primary(['task_id', 'document_id']);
  });
  await k.schema.createTable('project_documents', t => {
    t.string('project_id', 36).notNullable(); t.foreign('project_id').references('id').inTable('projects');
    t.string('document_id', 36).notNullable(); t.foreign('document_id').references('id').inTable('documents');
    t.string('linked_by', 36);
    t.timestamp('created_at').defaultTo(k.fn.now());
    t.primary(['project_id', 'document_id']);
  });
  // Existing single assignees become the first entry of the new assignee list.
  for (const t of await k('tasks').whereNotNull('assignee_id').select('id', 'assignee_id')) await k('task_assignees').insert({ task_id: t.id, user_id: t.assignee_id, created_at: new Date() });
}
export async function down(k) {
  for (const t of ['project_documents', 'task_documents', 'task_assignees']) await k.schema.dropTableIfExists(t);
  await k.schema.alterTable('projects', t => { t.dropColumn('partner_id'); });
  await k.schema.dropTableIfExists('partners');
}
