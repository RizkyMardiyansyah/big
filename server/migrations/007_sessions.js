// Session login di sisi server. Browser hanya menyimpan token acak di cookie httpOnly;
// tabel ini menyimpan hash SHA-256 token (bukan token aslinya), pemilik, dan masa berlaku.
export async function up(k) {
  await k.schema.createTable('sessions', t => {
    t.string('id', 64).primary(); // sha256(token)
    t.string('user_id', 36).notNullable(); t.foreign('user_id').references('id').inTable('users');
    t.timestamp('created_at').notNullable();
    t.timestamp('last_seen_at').notNullable();
    t.timestamp('expires_at').notNullable();
    t.string('ip', 64);
    t.string('user_agent', 300);
    t.index(['user_id']);
    t.index(['expires_at']);
  });
}
export async function down(k) {
  await k.schema.dropTableIfExists('sessions');
}
