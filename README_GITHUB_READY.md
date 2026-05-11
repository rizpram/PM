# PM Tracker - GitHub Ready

Bundle ini sudah dirapikan untuk push ke GitHub dan deploy ke Vercel.

## Yang sudah dirapikan
- `.gitignore` ditambahkan
- `.env.example` diperbaiki
- `lib/supabase.ts` support `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_KEY`, dan fallback publishable key
- `next.config.mjs` dibuat clean untuk Vercel
- `package.json` build/start disesuaikan untuk Next.js

## Push cepat
```bash
chmod +x push-to-github.sh
./push-to-github.sh
```

## ENV wajib di Vercel
```env
NEXT_PUBLIC_SUPABASE_URL=https://payqumlqfuavyhdrmkol.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=ISI_ANON_PUBLIC_KEY
NEXT_PUBLIC_SUPABASE_KEY=ISI_ANON_PUBLIC_KEY
```
