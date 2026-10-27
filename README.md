# BIG Enterprise Workspace v0.2 (MSSQL, DB dapat diganti lewat .env)

Website perusahaan + workspace internal. Arsitektur: **React (Vite)** -> **API Node/Express** -> **database apa pun lewat Knex**. Supabase tidak dipakai lagi.

## Arsitektur singkat
- Browser tidak pernah bicara langsung ke database. Semua lewat API (`server/`), yang memeriksa login (session) dan izin (RBAC) di setiap endpoint.
- Database dipilih lewat `DB_CLIENT` di `.env`. Skema (`server/migrations`) memakai Knex sehingga jalan di MSSQL, PostgreSQL, MySQL, dan SQLite tanpa mengubah kode. Tidak ada SQL khusus vendor, tidak ada stored procedure; logika (persetujuan atomik, RBAC) ada di kode aplikasi.
- Berkas struk disimpan di disk server (`STORAGE_DIR`), privat, hanya bisa diunduh lewat API dengan pemeriksaan izin.

## Prasyarat
Node.js 18+ dan npm, serta database kosong yang bisa dijangkau server (untuk MSSQL: SQL Server 2017+ / Azure SQL; buat database kosong, mis. `big`).

## Setup
1. `npm install`
2. `cp .env.example .env`, lalu isi blok database (`JWT_SECRET` tidak lagi dipakai; login memakai session). Contoh MSSQL:
   `DB_CLIENT=mssql`, `DB_HOST=localhost`, `DB_PORT=1433`, `DB_USER=sa`, `DB_PASSWORD=...`, `DB_NAME=big`
   (untuk server dengan sertifikat valid set `DB_ENCRYPT=true` dan `DB_TRUST_CERT=false`).
3. `npm run db:migrate` (membuat tabel)
4. `npm run db:seed` (peran, izin, alur persetujuan, data contoh fiktif)
5. Admin pertama: `ADMIN_PASSWORD='SandiKuat123' npm run create-admin -- admin@perusahaan.com "Nama Admin"`
   Tanpa `ADMIN_PASSWORD`, kata sandi acak dicetak sekali di terminal. Tidak ada kredensial bawaan.
6. `npm run dev` (API di http://localhost:4000, web di http://localhost:5174)
7. Masuk, lalu buat pengguna lain lewat menu Pengguna dan beri peran Employee / Manager / Finance.

**Halaman landing kosong?** Artinya API tidak bisa membaca konten (biasanya migrasi belum jalan atau server belum direstart). Dengan `AUTO_MIGRATE=true` (default di `.env.example`) server menjalankan migrasi dan data awal sendiri saat start; lihat log server untuk galatnya dan cek `http://localhost:4000/api/health`. Jika API mati, landing tetap menampilkan konten bawaan sesuai desain.

## Mengganti database
Hanya ubah `.env`, lalu `npm run db:migrate && npm run db:seed` pada database baru.
- PostgreSQL: `npm i pg`, `DB_CLIENT=pg`, isi `DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME` atau `DB_URL=postgres://...`
- MySQL/MariaDB: `npm i mysql2`, `DB_CLIENT=mysql2`
- SQLite (dev): `npm i sqlite3`, `DB_CLIENT=sqlite3`, `DB_FILE=./big.sqlite`
Hanya MSSQL yang sudah disiapkan driver-nya (`mssql`). Klien lain belum diuji.

## Produksi
`npm run build` menghasilkan `dist/`. `npm start` menjalankan API sekaligus melayani `dist/` (fallback SPA bawaan). Set `APP_URL` ke URL publik. Pasang di belakang HTTPS (reverse proxy). Cadangkan `STORAGE_DIR` bersama database.

## Deploy di Vercel (semua dalam satu proyek)
Frontend dibuild Vite (`dist/`), API Express berjalan sebagai Serverless Function lewat `api/index.js`; `vercel.json` meneruskan `/api/*` ke fungsi itu dan sisanya ke `index.html`.
1. Siapkan database online (mis. Postgres di Neon/Supabase; `DB_CLIENT=pg`, `DB_URL=...`). Gunakan connection string *pooled* bila tersedia.
2. Dari komputer Anda, isi `.env` dengan database online lalu jalankan `npm install`, `npm run db:migrate`, `npm run db:seed`, dan `create-admin`.
3. Import repo ke Vercel (preset Vite). Isi Environment Variables seperti di `.env.example` (blok "Deploy di Vercel") dan `AUTO_MIGRATE=false`.
4. Cek `https://domain-anda.vercel.app/api/health` harus `{"ok":true,...}`.
- Berkas (dokumen, struk, foto profil) kini disimpan di tabel `file_blobs` (migrasi `009`), bukan di disk. Berkas lama di `STORAGE_DIR` tetap terbaca.
- Batas upload di Vercel 4 MB per berkas (batas body fungsi ~4,5 MB).
- Cold start pertama bisa lebih lambat; menjalankan di server Node biasa (`npm run build && npm start`) tetap didukung.

## Fitur
Landing publik (hero, layanan, berita, form kontak dengan rate limit); login, ubah dan reset kata sandi; profil dengan foto; RBAC dinamis (peran, matriks izin); pengguna (buat, peran, aktif/nonaktif, reset sandi; Super Admin aktif terakhir dilindungi); proyek + Kanban task; cuti (Senin-Jumat, tanpa libur nasional, cek tabrakan); reimbursement + struk privat; mesin persetujuan sekuensial dengan penjaga aksi ganda; pembatalan; notifikasi; audit log; CMS (umum, layanan, artikel teks biasa anti-XSS).
- **Dokumen**: unggah (maks 10 MB; PDF, PNG, JPG, TXT, CSV, DOCX, XLSX, PPTX; tipe dicek dari ekstensi dan isi berkas), folder, kategori, pencarian dan filter, pratinjau (PDF/gambar), unduh, ubah nama, arsip/pulihkan, hapus. Akses per dokumen: semua pengguna, anggota proyek, atau hanya pengunggah (pengelola dokumen melihat semua). Riwayat versi belum ada.
- **Pengaturan** (izin `settings.manage`): jenis cuti, kategori biaya (struk wajib atau tidak), dan alur persetujuan yang bisa diurutkan (1-5 langkah per tipe; berlaku untuk pengajuan baru).

## Landing page (sesuai desain BIG SOLUTIONS)
Halaman `/` mengikuti desain Anda: header + hero dengan mockup dashboard, About + 4 statistik, Services (6 kartu), Products, Portfolio, Testimonials, Latest News, dan footer gelap. Semua teks, statistik, layanan/produk, portofolio, testimoni, dan artikel dikelola dari **Administrasi > Konten Landing** tanpa deploy ulang (`npm run db:seed` mengisi konten awal dari desain; aman diulang).
- Font: Plus Jakarta Sans (mendekati font pada desain); warna biru `#0B6FFB`, navy `#0D1B30`/`#12294D`.
- Foto portofolio/berita di desain tidak tersedia, jadi dipakai **ilustrasi SVG pengganti** di `public/img/` (city, server, laptop, work, cloud, team). Ganti lewat kolom Gambar/Cover (isi nama ilustrasi atau URL https). Unggah gambar langsung dari CMS belum ada.
- Mockup dashboard di hero adalah ilustrasi statis, bukan data nyata. Avatar testimoni berupa inisial. Tombol "Watch Demo" menggulir ke bagian About (belum ada video).
- Aplikasi internal dan halaman login memakai gaya yang sama (sidebar navy, tombol gradien biru, kartu putih lembut).

## Keamanan
Kata sandi di-hash bcrypt; login memakai session server-side: cookie `big_sid` (httpOnly, SameSite=Lax, tidak terbaca JavaScript) berisi token acak, dan hanya hash-nya yang disimpan di tabel `sessions`. Masa berlaku sliding 7 hari (`SESSION_DAYS`), maksimum 30 hari sejak login (`SESSION_MAX_DAYS`). Ganti sandi, reset sandi, dan penonaktifan akun mencabut sesi terkait. Pasang di belakang HTTPS agar cookie ikut bertanda Secure. Login dan reset dibatasi laju. Pemilik izin `roles.manage` dapat memberi izin ke dirinya sendiri, berikan hanya ke admin tepercaya. Jangan commit `.env`.

## Belum ada / batasan
- **Belum dijalankan dan diuji**: sandbox pembuatan tanpa jaringan dan tanpa SQL Server. Hanya sintaks yang diperiksa. Mohon jalankan langkah setup lalu laporkan galat.
- Lupa kata sandi: belum ada email; tautan reset dicetak di log server (sambungkan SMTP untuk produksi).
- Belum ada: detail proyek lengkap (progress, rentang tanggal, tab aktivitas), halaman detail permintaan, navigasi/footer yang dapat diatur penuh, upload gambar CMS, pencarian global, grafik dashboard, tes otomatis, shadcn/ui, Recharts, email/push, riwayat versi dokumen.
- Alur bawaan: cuti 1 langkah (Manager), reimbursement 2 langkah (Manager lalu Finance); ubah di Pengaturan. Pastikan tiap peran di alur punya pengguna.
- `npm run db:migrate` menjalankan 001-003 (003 = kolom/tabel konten landing). Untuk instalasi lama jalankan juga `npm run db:seed` agar konten desain terisi.

## v0.3.3 changes
- **Contact details**: footer/contact address is now `PT. Bisnis Integrasi Gemilang Gedung Grand Slipi Tower Lt. 9 Unit O, CHR Office, Jalan Letjend S. Parman, Kav 22-24, Palmerah, Jakarta Barat, 11480` and email `marketing@big-solutions.co.id` (defaults in `src/lib/defaults.js` and `server/seedData.js`). Migration `008_contact_info.js` updates an existing database only if it still holds the old sample values, so anything already edited in Administration > Landing page is kept.
- **Session login**: signing in creates a server-side session (migration `007_sessions.js`, httpOnly cookie `big_sid`). Reopening the site or the app keeps you signed in until the session expires; the Login page redirects straight to the app when a session exists, and the public "Login" button becomes "Dashboard". After login you return to the page you were trying to open. Log out ends the session on the server. `GET /auth/me` returns `{user:null}` instead of 401 when nobody is signed in; new `POST /auth/logout`. `.env`: `SESSION_DAYS` (default 7, sliding) and `SESSION_MAX_DAYS` (default 30). `JWT_SECRET` is no longer needed.
- **Calendar** (new menu, `src/pages/Calendar.jsx`): month view of the tasks assigned to the signed-in user, placed on their due dates (overdue in red, done in green). Click a day for the list, click a task to open it. Project filter and "Show done" toggle. Changing a task's due date or assignees updates the calendar. API: `GET /calendar?from=YYYY-MM-DD&to=YYYY-MM-DD` (needs `tasks.view`; cancelled tasks are left out). Run `npm run db:migrate` (or start with `AUTO_MIGRATE=true`).
- Known limitation (already existed): being assigned to a task does not add you to the project's members, so a task from a project you cannot access shows on your calendar with a lock icon and cannot be opened.

## v0.3.2 changes
- **Customers** (new menu, `src/pages/Customers.jsx`): who a project is for. A project has one customer, set from the project header, Create project, or Settings. Typing a new name creates it automatically (case-insensitive, no duplicates). Managing needs `projects.edit`; adding needs `projects.create` or `projects.edit`.
- **Project type**: Project / Support / Presales, shown in the project header (editable), the Create project form, Settings and the Projects list. The Projects list also has Type, Customer and Partner columns and filters for status, type and customer. Task types (Task / Bug / Story) are unchanged.
- API: `GET/POST /customers`, `PATCH/DELETE /customers/:id`; projects accept `type`, `customer_id` or `customer_name`. New migration `006_customers.js`; existing projects default to type `project`.

## v0.3.1 changes
- Wording: "issue" is now "task" everywhere in the UI. Dashboard greeting emoji removed; Help card button tidied.
- **Partners** (new menu, `src/pages/Partners.jsx`): external companies/people. A project has one partner (set from the project header, Create project, or Settings). Typing a new name in any partner field or in the assignee picker creates it automatically (case-insensitive, no duplicates) and it appears in the Partners menu. Managing (edit/delete) needs `projects.edit`; adding needs any of `tasks.create`, `tasks.edit`, `projects.create`, `projects.edit`.
- **Multiple assignees per task**: any mix of users and partners. `tasks.assignee_id` is kept in sync with the first user for compatibility; existing assignees were migrated (migration `005_partners.js`).
- **Documents linked to tasks and projects**: each task has a Documents section (link from the Documents library, click to open, unlink). Each project has a Documents tab that lists every file linked to the project, uploaded for it, or attached to one of its tasks (with the task key; click to open). Linking shares the file with all project members (`server/docAccess.js`); non-members still get 404.
- API additions: `GET/POST /partners`, `PATCH/DELETE /partners/:id`, `POST/DELETE /tasks/:id/documents`, `GET/POST/DELETE /projects/:id/documents`; tasks accept `assignees: [{type:'user'|'partner', id | name}]`; projects accept `partner_id` or `partner_name`.
- Run `npm run db:migrate` (or start with `AUTO_MIGRATE=true`).

## UI v0.3 changes
- **Language**: the whole UI, API error messages, seed data and scripts are now English. Migration `004_issues.js` also renames the old Indonesian default leave types / expense categories / role descriptions to English (only rows still carrying the original names).
- **App shell** (`src/pages/AppLayout.jsx`): full-width top bar (logo, search with notifications, help, user menu); sidebar with section labels, expandable groups with a tree line and active marker, collapsible to an icon rail (remembered), mobile drawer; breadcrumb above the page. Colors unchanged (blue theme). All icons are Lucide (`src/components/Icon.jsx` maps the old icon names to Lucide).
- **Projects, Jira-style** (`src/pages/projects/`): Projects list (search, status filter, stars, lead, progress, Create project with a key such as `WEB`, tasks are numbered `WEB-1`...); Board (To Do / In Progress / In Review / Done, drag and drop with persisted rank, inline Create task, search, assignee filters, Only my tasks, Recently updated, Group by assignee/priority); Task view modal (shareable `?selectedTask=`, inline edit, status, assignee, priority, type, due date, comments, history); Summary; List; Settings (details, members).
- **API**: new `GET /tasks/:id`, `POST /tasks/:id/comments`, `DELETE /comments/:id`, `DELETE /projects/:id/members/:userId`; `PATCH /tasks/:id` accepts `rank`, `type`, `description`; project keys are 2-10 letters/numbers.
- Run `npm install` (new: `lucide-react`, `@hello-pangea/dnd`) then `npm run db:migrate`.
- Not included (needs a data model first): sprints/backlog, epics, sub-tasks, labels, attachments, custom workflows, timeline.

## Perubahan UI v0.2.1 (mengikuti referensi dashboard)
- **Shell aplikasi** (`src/pages/AppLayout.jsx`): sidebar putih dengan ikon (aktif = biru muda), header dengan kotak pencarian (pintasan Ctrl/Cmd+K, mencari halaman yang boleh diakses pengguna), lonceng notifikasi dengan titik merah, tombol bantuan, dan menu pengguna (foto/inisial, nama, peran, Profil/Notifikasi/Keluar). Di layar kecil sidebar menjadi laci geser.
- **Dashboard** (`src/pages/Dashboard.jsx`): sapaan sesuai jam, 3 aksi cepat, 4 kartu KPI dengan tren 30 hari, donat Tasks by Status, batang Projects by Status, Quick Insights, Recent Activities (dari notifikasi), Top Projects by Open Tasks, dan kartu Need Help.
- **API** `GET /api/dashboard` ditambah: `trends`, `tasks_by_status`, `projects_by_status`, `top_projects`, `recent` (kunci lama tetap ada). `GET /api/profile` kini mengembalikan `roles`.
- Gaya global (`src/index.css`): kartu `rounded-2xl` dengan bayangan lembut, tombol/input `rounded-xl`, latar gradasi biru muda. Semua halaman lain otomatis ikut gaya ini.
- Data referensi (Total Host, OS, dst.) tidak ada di aplikasi ini, jadi kartu dihubungkan ke data nyata (cuti, reimbursement, proyek, task).
