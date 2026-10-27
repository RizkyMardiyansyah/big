// Konten landing sesuai desain BIG SOLUTIONS: ikon/jenis layanan, portofolio, testimoni, statistik, cover artikel.
export async function up(k){
 await k.schema.alterTable('services',t=>{t.string('icon',20);t.string('kind',10).notNullable().defaultTo('service');t.string('link',300)});
 await k.schema.alterTable('articles',t=>{t.string('cover',300);t.string('category',40)});
 await k.schema.alterTable('site_settings',t=>{for(const c of ['hero_badge','hero_highlight','about_label','about_title','phone','address'])t.string(c,300);t.string('about_text',1000);t.string('footer_text',1000)});
 await k.schema.createTable('portfolio_projects',t=>{t.string('id',36).primary();t.string('title',200).notNullable();t.string('category',100);t.string('image',300);t.string('link',300);t.integer('sort_order').notNullable().defaultTo(0);t.boolean('published').notNullable().defaultTo(false)});
 await k.schema.createTable('testimonials',t=>{t.string('id',36).primary();t.string('quote',600).notNullable();t.string('name',100).notNullable();t.string('role',200);t.integer('sort_order').notNullable().defaultTo(0);t.boolean('published').notNullable().defaultTo(false)});
 await k.schema.createTable('site_stats',t=>{t.string('id',36).primary();t.string('value',20).notNullable();t.string('label',100).notNullable();t.string('description',200);t.string('icon',20);t.integer('sort_order').notNullable().defaultTo(0)});
}
export async function down(k){for(const t of ['site_stats','testimonials','portfolio_projects'])await k.schema.dropTableIfExists(t);
 await k.schema.alterTable('articles',t=>{t.dropColumn('cover');t.dropColumn('category')});await k.schema.alterTable('services',t=>{t.dropColumn('icon');t.dropColumn('kind');t.dropColumn('link')})}
