# Deploy PM Tracker ke Vercel

## 1. Push ke GitHub

Pastikan root repo berisi:
- package.json
- app/
- lib/
- components/
- next.config.mjs

Command:
```bash
git init
git add .
git commit -m "Initial PM Tracker"
git branch -M main
git remote add origin https://github.com/rizpram/PM.git
git push -u origin main
```

Kalau remote sudah ada:
```bash
git remote set-url origin https://github.com/rizpram/PM.git
git push -u origin main
```

## 2. Import ke Vercel
- Vercel → Add New → Project
- Import repo `rizpram/PM`
- Framework: Next.js
- Root Directory: `./`
- Build Command: `npm run build`
- Install Command: `npm install`

## 3. Environment Variables
Isi di Vercel → Settings → Environment Variables:

```env
NEXT_PUBLIC_SUPABASE_URL=https://payqumlqfuavyhdrmkol.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=ISI_ANON_PUBLIC_KEY_DARI_SUPABASE
NEXT_PUBLIC_SUPABASE_KEY=ISI_ANON_PUBLIC_KEY_DARI_SUPABASE
```

Catatan:
- Gunakan `anon public key` dari Supabase Project Settings → API.
- Jangan gunakan `service_role`.
- Jika kamu hanya punya key format `sb_publishable_...`, app ini tetap sudah support fallback, tapi rekomendasi utama tetap `anon public key`.

## 4. Deploy
Klik Deploy.

Test:
- `/login`
- `/dashboard`
- `/executive?token=TOKEN&days=30`

## 5. Custom Domain
Vercel → Settings → Domains → Add:
`pm.rizpram.cloud`

Ikuti DNS record yang diberikan Vercel.
