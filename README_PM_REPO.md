# PM Tracker - Siap Upload ke GitHub Repo PM

Repo tujuan:
https://github.com/rizpram/PM.git

## Struktur root yang benar
Setelah extract, file-file ini harus langsung ada di root folder:

- package.json
- app/
- lib/
- components/
- next.config.mjs
- .gitignore
- .env.example

## Cara push cepat

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

Kalau repo lama sudah ada isi dan mau ditimpa:

```bash
git push -u origin main --force
```

## Deploy Vercel

Import repo:
`rizpram/PM`

Environment Variables:

```env
NEXT_PUBLIC_SUPABASE_URL=https://payqumlqfuavyhdrmkol.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=ISI_ANON_PUBLIC_KEY_DARI_SUPABASE
NEXT_PUBLIC_SUPABASE_KEY=ISI_ANON_PUBLIC_KEY_DARI_SUPABASE
```

Catatan:
- Jangan taruh service_role key di GitHub/Vercel.
- Gunakan anon public key dari Supabase → Project Settings → API.
