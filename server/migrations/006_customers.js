// Customers (who the project is for) and project type (project / support / presales).
export async function up(k) {
  await k.schema.createTable('customers', t => {
    t.string('id', 36).primary();
    t.string('name', 200).notNullable();
    t.string('name_key', 200).notNullable().unique();
    t.string('email', 200); t.string('phone', 50); t.string('notes', 1000);
    t.string('created_by', 36);
    t.timestamp('created_at').defaultTo(k.fn.now());
  });
  await k.schema.alterTable('projects', t => {
    t.string('customer_id', 36);
    t.string('type', 10).notNullable().defaultTo('project');
  });
}
export async function down(k) {
  await k.schema.alterTable('projects', t => { t.dropColumn('customer_id'); t.dropColumn('type'); });
  await k.schema.dropTableIfExists('customers');
}
