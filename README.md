# STISIPSU Backend

Express + Prisma + PostgreSQL (Neon) backend for STISIP Syamsul Ulum Sukabumi.

Kode ini mendukung dual-mode deployment: **VPS** (self-managed) atau **Vercel** (serverless) tanpa perubahan kode. \
Awalnya berjalan di VPS (`145.79.8.29:3000`) menggunakan Docker, lalu dimigrasi ke Vercel + Neon + Supabase.

> Panduan deploy lengkap (Vercel + VPS) ada di `DEPLOY.md` di root proyek.

## Setup

```bash
npm install
cp .env.example .env   # isi DATABASE_URL dan lainnya
npx prisma migrate deploy
npm run seed            # opsional
npm run dev
```

## Environment Variables

| Variable | Wajib | Kegunaan |
|---|---|---|
| `DATABASE_URL` | Ya | PostgreSQL (Neon) connection string |
| `JWT_SECRET` | Ya | Secret key untuk JWT token |
| `NEXT_PUBLIC_API_URL` | Ya | Base URL backend (e.g. `https://api.stisipsu.ac.id/`) |
| `SUPABASE_URL` | Untuk upload | Supabase storage bucket URL |
| `SUPABASE_KEY` | Untuk upload | Supabase anon/service key |
| `UPSTASH_REDIS_URL` | Opsional | Redis URL untuk rate limiting distribusi (Vercel) |
| `REDIS_URL` | Opsional | Alternatif Redis URL |

## Rate Limiting

Public endpoints dibatasi 60 request/menit/IP. Jika `UPSTASH_REDIS_URL` atau `REDIS_URL` di-set, rate limit data disimpan di Redis (work di Vercel serverless). Jika tidak, pakai in-memory default.

Config di `src/middleware/rateLimiter.js`.

## Activity Log

Semua aktivitas create/update/delete/review tercatat otomatis ke tabel `ActivityLog`.

- **Endpoint user**: `GET /api/activity-logs` (paginated, milik user login)
- **Endpoint admin**: `GET /api/activity-logs/all` (semua user)
- **Helper**: `src/utils/activityLog.js`

## Struktur

```
src/
  controllers/    # Logic handler tiap fitur
  middleware/     # Auth, rate limiter, etc
  routes/        # Express router per fitur
  utils/         # Helper: activityLog, redis, storage
api/             # Vercel serverless entry point (overrides)
prisma/          # Schema + migrations
```

## Deploy

Panduan deploy lengkap (Vercel + VPS) ada di `DEPLOY.md` di root proyek.

### Vercel (Production)
Push ke `main`, Vercel auto-deploy. Pastikan environment variables terisi di dashboard Vercel.

### VPS (Alternatif)
```bash
git clone https://github.com/Pappa66/STISIPSU-BE.git /var/www/api
cd /var/www/api && npm install
cp .env.example .env && nano .env
npx prisma migrate deploy
pm2 start src/app.js --name stisip-api && pm2 save && pm2 startup
```

### Catatan
- Migrations tidak jalan otomatis di Vercel — jalankan `npx prisma migrate deploy` manual setelah deploy jika ada migrasi baru.
- Lihat `DEPLOY.md` untuk setup Nginx, SSL, dan firewall lengkap.
