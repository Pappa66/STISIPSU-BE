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

## Deploy ke VPS (Ubuntu/Debian)

### 1. Prasyarat
- Node.js 20+ (`curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash - && sudo apt install -y nodejs`)
- PM2 untuk process manager (`npm install -g pm2`)
- Nginx sebagai reverse proxy
- Domain mengarah ke IP VPS

### 2. Clone & Setup

```bash
git clone https://github.com/Pappa66/STISIPSU-BE.git /var/www/api
cd /var/www/api
npm install
cp .env.example .env
nano .env   # isi semua environment variables
npx prisma migrate deploy
pm2 start src/app.js --name stisip-api
pm2 save
pm2 startup   # ikuti instruksi untuk enable on reboot
```

### 3. Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name api.stisipsu.ac.id;  # ganti dengan domain kamu

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        client_max_body_size 100M;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/stisip-api /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### 4. SSL (HTTPS) dengan Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.stisipsu.ac.id
```

### 5. Maintenance

```bash
pm2 logs stisip-api          # lihat log real-time
pm2 restart stisip-api       # restart setelah update kode
git pull origin main && npm install && npx prisma migrate deploy && pm2 restart stisip-api
```

### 6. Firewall

```bash
sudo ufw allow 22/tcp        # SSH
sudo ufw allow 80/tcp        # HTTP
sudo ufw allow 443/tcp       # HTTPS
sudo ufw enable
```

## Deploy ke Vercel

Push ke `main`, Vercel auto-deploy. Pastikan environment variables terisi di dashboard Vercel.
Migrations tidak jalan otomatis — jalankan `npx prisma migrate deploy` manual setelah deploy jika ada migrasi baru.
