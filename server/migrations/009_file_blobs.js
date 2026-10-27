// Berkas (dokumen, struk, foto profil) disimpan di database agar tidak bergantung pada disk server.
export async function up(k) {
  const mysql = String(k.client.config.client || '').startsWith('mysql');
  await k.schema.createTable('file_blobs', t => {
    t.string('id', 120).primary(); // "<jenis>/<id berkas>"
    if (mysql) t.specificType('data', 'longblob'); else t.binary('data');
    t.timestamp('created_at').notNullable();
  });
}
export async function down(k) {
  await k.schema.dropTableIfExists('file_blobs');
}
