# STISIPSU Backend

Express + Prisma + PostgreSQL (Neon) backend for STISIP Syamsul Ulum Sukabumi.

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
| `NEXT_PUBLIC_API_URL` | Ya | Base URL backend (e.g. `https://stisipsu-be.vercel.app/`) |
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

## Deploy ke Vercel

Push ke `main`, Vercel auto-deploy. Pastikan environment variables terisi di dashboard Vercel.
Migrations tidak jalan otomatis — jalankan `npx prisma migrate deploy` manual setelah deploy jika ada migrasi baru.
