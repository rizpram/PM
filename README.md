# PM Tracker (Projects • Tasks • Panjar) + Executive Dashboard (No Login)

Ini bundle siap upload (Next.js + Tailwind + Supabase).

## Fitur utama
- Projects list + detail (members, tasks, panjar)
- Task tracking (pagination + quick status)
- Panjar tracking (jumlah, tanggal cair, penerima; due settlement otomatis)
- Rule panjar: **H+7 setelah project status `completed`** (due_settlement = end_date + 7)
- Export CSV per project (Tasks & Panjar)
- **Executive Dashboard** tanpa login via link token: `/executive?token=...&days=30`

## 1) Setup Supabase
### A. Jalankan SQL
1. Buka Supabase → SQL Editor
2. Run: `supabase/sql/01_setup.sql`
3. Run: `supabase/sql/02_public_dashboard.sql`

### B. Buat user di Supabase Auth
Buat 5 user:
- Rizpram (Lead)
- Leo (PM Specialist)
- Riswanto (PM)
- Yulius (PM)
- Fanio (PM)

Saat create user, isi metadata:
- `full_name`: "Rizpram"
- `role`: "pm_lead" (untuk Rizpram) atau "pm" untuk lainnya
  (Admin juga bisa pakai role "admin")

Trigger `handle_new_user()` otomatis bikin row `profiles`.

### C. Assign member project
Setiap project harus ada member agar PM bisa akses.
Cara cepat: setelah create project, insert ke `project_members` (Supabase Table Editor / SQL).

Contoh (ganti project_id & user_id):
```sql
insert into public.project_members (project_id, user_id, member_role)
values ('PROJECT_UUID', 'USER_UUID', 'pm');
```

Untuk Lead bisa juga:
```sql
insert into public.project_members (project_id, user_id, member_role)
values ('PROJECT_UUID', 'LEAD_USER_UUID', 'pm_lead');
```

## 2) Setup ENV (Next.js)
Buat file `.env.local` (di root):
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## 3) Jalankan local
```bash
npm install
npm run dev
```
Akses:
- http://localhost:3000/login
- http://localhost:3000/dashboard
- http://localhost:3000/projects
- http://localhost:3000/executive?token=TOKEN&days=30

## 4) Ambil token Executive Dashboard
Supabase → Table Editor → `public_dashboard_settings` → field `share_token`

Share link:
`/executive?token=TOKEN&days=7|30|90`

Regenerate token bila bocor:
```sql
update public.public_dashboard_settings
set share_token = encode(gen_random_bytes(18), 'hex'),
    created_at = now()
where id = 1;
```

## 5) Deploy ke server (paling gampang)
### Option A: VPS (Node)
```bash
npm install
npm run build
npm run start
```
Next sudah set `output: 'standalone'`, jadi bisa dipakai untuk docker/nginx reverse proxy.

### Option B: Vercel
- Import repo
- Set env vars (SUPABASE URL + ANON KEY)
- Deploy

## Catatan keamanan
- App utama butuh login Supabase.
- Executive Dashboard **tanpa login** tapi protected oleh **token**.
- Jangan share token di grup publik.
