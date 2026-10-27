// Mengganti alamat dan email kontak bawaan (data contoh) dengan data resmi perusahaan.
// Hanya baris yang masih berisi nilai bawaan lama (atau kosong) yang diganti, sehingga isian
// yang sudah diubah manual lewat CMS tidak tertimpa.
const OLD = { address: 'Jl. Innovation No. 123, Jakarta 10220', contact_email: 'hello@bigsolutions.co.id' };
const NEW = {
  address: 'PT. Bisnis Integrasi Gemilang Gedung Grand Slipi Tower Lt. 9 Unit O, CHR Office, Jalan Letjend S. Parman, Kav 22-24, Palmerah, Jakarta Barat, 11480',
  contact_email: 'marketing@big-solutions.co.id',
};
export async function up(k) {
  for (const col of Object.keys(NEW)) {
    await k('site_settings').where({ id: 1 }).where(b => b.where(col, OLD[col]).orWhereNull(col).orWhere(col, '')).update({ [col]: NEW[col] });
  }
}
export async function down(k) {
  for (const col of Object.keys(NEW)) await k('site_settings').where({ id: 1, [col]: NEW[col] }).update({ [col]: OLD[col] });
}
