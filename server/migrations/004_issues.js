// Jira-style issues: per-project issue numbers (KEY-1), issue type, board rank, comments and change history.
// Also renames the original Indonesian default master data to English (only rows that still carry the old default name).
const RENAME = {
  leave_types: [['Cuti Tahunan', 'Annual Leave'], ['Cuti Sakit', 'Sick Leave'], ['Cuti Pribadi', 'Personal Leave'], ['Cuti Tanpa Gaji', 'Unpaid Leave']],
  expense_categories: [['Transportasi', 'Transportation'], ['Makan', 'Meals'], ['Akomodasi', 'Accommodation'], ['Perlengkapan Kantor', 'Office Supplies'], ['Biaya Klien', 'Client Expenses'], ['Lainnya', 'Other']],
};
const ROLE_DESC = [['Akses penuh', 'Full access'], ['Menyetujui cuti dan reimbursement', 'Approves leave and reimbursements'], ['Karyawan', 'Employee'], ['Persetujuan akhir reimbursement', 'Final reimbursement approval']];

export async function up(k) {
  await k.schema.alterTable('projects', t => { t.integer('issue_counter').notNullable().defaultTo(0); });
  await k.schema.alterTable('tasks', t => {
    t.integer('issue_no');
    t.string('type', 10).notNullable().defaultTo('task');
    t.double('rank');
    t.timestamp('updated_at');
  });
  await k.schema.createTable('task_comments', t => {
    t.string('id', 36).primary();
    t.string('task_id', 36).notNullable(); t.foreign('task_id').references('id').inTable('tasks');
    t.string('user_id', 36).notNullable(); t.foreign('user_id').references('id').inTable('users');
    t.text('body').notNullable();
    t.timestamp('created_at').defaultTo(k.fn.now());
  });
  await k.schema.createTable('task_history', t => {
    t.string('id', 36).primary();
    t.string('task_id', 36).notNullable(); t.foreign('task_id').references('id').inTable('tasks');
    t.string('user_id', 36);
    t.string('field', 30).notNullable();
    t.string('from_value', 300);
    t.string('to_value', 300);
    t.timestamp('created_at').defaultTo(k.fn.now());
  });

  // Backfill existing tasks: sequential issue numbers + spaced ranks per project, in creation order.
  for (const p of await k('projects').select('id')) {
    const rows = await k('tasks').where({ project_id: p.id }).orderBy('created_at').orderBy('id').select('id', 'created_at');
    for (const [i, r] of rows.entries()) await k('tasks').where({ id: r.id }).update({ issue_no: i + 1, rank: (i + 1) * 1000, updated_at: r.created_at });
    await k('projects').where({ id: p.id }).update({ issue_counter: rows.length });
  }

  for (const [tbl, pairs] of Object.entries(RENAME)) for (const [from, to] of pairs) await k(tbl).where({ name: from }).update({ name: to });
  for (const [from, to] of ROLE_DESC) await k('roles').where({ description: from }).update({ description: to });
}

export async function down(k) {
  await k.schema.dropTableIfExists('task_history');
  await k.schema.dropTableIfExists('task_comments');
  await k.schema.alterTable('tasks', t => { t.dropColumn('issue_no'); t.dropColumn('type'); t.dropColumn('rank'); t.dropColumn('updated_at'); });
  await k.schema.alterTable('projects', t => { t.dropColumn('issue_counter'); });
}
