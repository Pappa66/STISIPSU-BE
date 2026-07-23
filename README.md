# STISIPSU Backend

Express + Prisma backend for STISIP Syamsul Ulum Sukabumi.

**Deploy utama: VPS** (PM2 + Nginx + PostgreSQL lokal). \
**Alternatif: Vercel** (serverless + Neon). \
Kode ini dual-mode — tanpa perubahan kode.

> Panduan deploy lengkap ada di `DEPLOY.md` (root proyek).

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
| `DATABASE_URL` | Ya | PostgreSQL connection string (VPS: `postgresql://user:pass@localhost:5432/stisip`, Vercel: dari Neon) |
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

Panduan deploy lengkap (VPS + Vercel) ada di `DEPLOY.md` (root proyek).

### VPS (Produksi — Utama)
```bash
# Setup database dulu (lihat DEPLOY.md)
sudo -u postgres psql -c "CREATE DATABASE stisip;"
sudo -u postgres psql -c "CREATE USER stisip_user WITH PASSWORD '...';"
sudo -u postgres psql -c "GRANT ALL ON DATABASE stisip TO stisip_user;"

# Clone & run
git clone https://github.com/Pappa66/STISIPSU-BE.git /var/www/api
cd /var/www/api && npm install
cp .env.example .env && nano .env   # DATABASE_URL=postgresql://stisip_user:...@localhost:5432/stisip
npx prisma migrate deploy && npm run seed
pm2 start src/app.js --name stisip-api && pm2 save && pm2 startup
```
Lihat `DEPLOY.md` untuk setup Nginx, SSL, firewall lengkap.

### Vercel (Alternatif — Preview)
Push ke `main`, Vercel auto-deploy. Database pakai **Neon**. \
Migrations tidak jalan otomatis — jalankan `npx prisma migrate deploy` manual jika ada migrasi baru.
