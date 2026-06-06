# Deploy to Digital Ocean — Step-by-Step

## Stack recap
- **API**: NestJS (port 3000) + PostgreSQL 17 + Redis 7
- **Web**: Next.js (port 3001)
- **CI/CD**: GitHub Actions → build images → GHCR → SSH deploy to VPS
- **Reverse proxy**: Nginx (handle domain + SSL)

---

## 1. Chọn Droplet

| Tier | Spec | Giá | Dùng khi |
|------|------|-----|----------|
| **Min viable** | 2 vCPU / 2 GB RAM / 60 GB SSD | ~$18/mo | Demo, test load nhẹ |
| **Recommended** | 2 vCPU / 4 GB RAM / 80 GB SSD | ~$24/mo | Production ổn định |

> Stack này chạy 4 container (api, web, postgres, redis). 2 GB RAM sẽ tight khi migrate + seed lần đầu. **Dùng 4 GB** nếu có budget.

**Tạo Droplet:**
1. Vào digitalocean.com → **Create → Droplets**
2. Region: **Singapore** (gần VN nhất)
3. Image: **Ubuntu 24.04 LTS**
4. Size: Basic → Regular → **$24/mo** (2vCPU/4GB)
5. Authentication: **SSH Key** (paste public key)
6. Hostname: `event-ticket-prod`
7. Click **Create Droplet** → ghi lại IP

---

## 2. Setup VPS lần đầu

SSH vào server:
```bash
ssh root@<YOUR_VPS_IP>
```

### 2a. Tạo user non-root
```bash
adduser deploy
usermod -aG sudo deploy
# Copy SSH key cho user deploy
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy
```

### 2b. Cài Docker
```bash
# Chạy với user root
curl -fsSL https://get.docker.com | sh
usermod -aG docker deploy

# Verify
docker --version        # Docker 27.x
docker compose version  # Docker Compose v2.x
```

### 2c. Cài Nginx + Certbot
```bash
apt update && apt install -y nginx certbot python3-certbot-nginx ufw

# Firewall
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
```

### 2d. Tạo thư mục project
```bash
mkdir -p /opt/event-ticket-system
chown deploy:deploy /opt/event-ticket-system
```

---

## 3. Tạo file cấu hình trên VPS

**SSH vào bằng user deploy:**
```bash
ssh deploy@<YOUR_VPS_IP>
```

### 3a. Tạo `docker-compose.prod.yaml`

```bash
cat > /opt/event-ticket-system/docker-compose.yaml << 'EOF'
services:
  postgres:
    image: postgres:17.9-alpine
    restart: unless-stopped
    volumes:
      - event-ticket-db:/var/lib/postgresql/data
    environment:
      POSTGRES_USER: ${DATABASE_USERNAME}
      POSTGRES_PASSWORD: ${DATABASE_PASSWORD}
      POSTGRES_DB: ${DATABASE_NAME}
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DATABASE_USERNAME}"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

  api:
    image: ghcr.io/<YOUR_GITHUB_USERNAME>/<YOUR_REPO_NAME>/api:latest
    restart: unless-stopped
    ports:
      - "3000:3000"
    env_file:
      - ./api.env
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

  web:
    image: ghcr.io/<YOUR_GITHUB_USERNAME>/<YOUR_REPO_NAME>/web:latest
    restart: unless-stopped
    ports:
      - "3001:3000"
    env_file:
      - ./web.env
    depends_on:
      - api

volumes:
  event-ticket-db:
EOF
```

> Thay `<YOUR_GITHUB_USERNAME>/<YOUR_REPO_NAME>` = lowercase repo path, ví dụ: `kyotranma/event-ticket-system`

### 3b. Tạo `api.env`
```bash
cat > /opt/event-ticket-system/api.env << 'EOF'
NODE_ENV=production
APP_PORT=3000
FRONTEND_DOMAIN=https://yourdomain.com
BACKEND_DOMAIN=https://api.yourdomain.com

DATABASE_TYPE=postgres
DATABASE_HOST=postgres
DATABASE_PORT=5432
DATABASE_USERNAME=prod_user
DATABASE_PASSWORD=CHANGE_ME_STRONG_PASSWORD
DATABASE_NAME=event_ticket_db
DATABASE_SYNCHRONIZE=false
DATABASE_MAX_CONNECTIONS=100

REDIS_HOST=redis
REDIS_PORT=6379
WORKER_HOST=redis://redis:6379/1

FILE_DRIVER=local

MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your@gmail.com
MAIL_PASSWORD=your_app_password
MAIL_IGNORE_TLS=false
MAIL_SECURE=false
MAIL_REQUIRE_TLS=true
MAIL_DEFAULT_EMAIL=noreply@yourdomain.com
MAIL_DEFAULT_NAME=EventTicket

AUTH_JWT_SECRET=CHANGE_ME_64_CHAR_RANDOM_STRING
AUTH_JWT_TOKEN_EXPIRES_IN=15m
AUTH_REFRESH_SECRET=CHANGE_ME_64_CHAR_RANDOM_STRING_2
AUTH_REFRESH_TOKEN_EXPIRES_IN=30d
AUTH_FORGOT_SECRET=CHANGE_ME_64_CHAR_RANDOM_STRING_3
AUTH_FORGOT_TOKEN_EXPIRES_IN=30m
AUTH_CONFIRM_EMAIL_SECRET=CHANGE_ME_64_CHAR_RANDOM_STRING_4
AUTH_CONFIRM_EMAIL_TOKEN_EXPIRES_IN=1d

STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
TICKET_QR_SECRET=CHANGE_ME_64_CHAR_RANDOM_STRING_5
EOF
chmod 600 /opt/event-ticket-system/api.env
```

**Generate random secrets:**
```bash
# Chạy 5 lần, paste vào từng AUTH_*_SECRET
openssl rand -hex 32
```

### 3c. Tạo `web.env`
```bash
cat > /opt/event-ticket-system/web.env << 'EOF'
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api/v1
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
NEXT_PUBLIC_GOOGLE_CLIENT_ID=
EOF
chmod 600 /opt/event-ticket-system/web.env
```

---

## 4. Cấu hình Nginx reverse proxy

### 4a. Config API subdomain
```bash
cat > /etc/nginx/sites-available/api.yourdomain.com << 'EOF'
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        client_max_body_size 10M;
    }
}
EOF
```

### 4b. Config Web domain
```bash
cat > /etc/nginx/sites-available/yourdomain.com << 'EOF'
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

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
    }
}
EOF
```

### 4c. Enable + SSL
```bash
ln -s /etc/nginx/sites-available/api.yourdomain.com /etc/nginx/sites-enabled/
ln -s /etc/nginx/sites-available/yourdomain.com /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# SSL (trỏ DNS trước khi chạy)
certbot --nginx -d yourdomain.com -d www.yourdomain.com
certbot --nginx -d api.yourdomain.com
```

> **DNS**: Trỏ A record `yourdomain.com` và `api.yourdomain.com` → VPS IP trước bước này.

---

## 5. Cấu hình GitHub Secrets

Vào repo GitHub → **Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Giá trị |
|--------|---------|
| `VPS_HOST` | IP của Droplet |
| `VPS_USER` | `deploy` |
| `VPS_SSH_KEY` | Private key (nội dung file `~/.ssh/id_rsa` trên máy local) |

> `GITHUB_TOKEN` đã tự động có, không cần thêm.

### Thêm SSH key cho deploy user trên VPS (nếu chưa có)

Trên máy local:
```bash
# Tạo key riêng cho CI (không dùng key cá nhân)
ssh-keygen -t ed25519 -f ~/.ssh/deploy_key -N ""
cat ~/.ssh/deploy_key.pub   # → paste vào VPS
cat ~/.ssh/deploy_key       # → paste vào GitHub Secret VPS_SSH_KEY
```

Trên VPS:
```bash
# SSH vào với key hiện tại, thêm deploy key
echo "ssh-ed25519 AAAA..." >> /home/deploy/.ssh/authorized_keys
```

---

## 6. Setup GitHub Packages (GHCR) - package visibility

Vào GitHub → **Settings → Packages** → tìm package `api` và `web` → **Package settings** → đổi thành **Public** (hoặc giữ Private và dùng token auth).

Nếu Private, deploy script đã có login step — đảm bảo `VPS_USER` có quyền đọc package.

---

## 7. Deploy lần đầu thủ công

```bash
ssh deploy@<YOUR_VPS_IP>
cd /opt/event-ticket-system

# Login GHCR thủ công lần đầu (thay YOUR_GITHUB_PAT = Personal Access Token với read:packages)
echo YOUR_GITHUB_PAT | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin

# Pull và chạy
docker compose pull
docker compose up -d

# Xem log
docker compose logs -f api
docker compose logs -f web
```

Chờ API log ra `Application is running on: http://0.0.0.0:3000` → thành công.

---

## 8. Verify

```bash
# Health check API
curl https://api.yourdomain.com/api/v1

# Check containers
docker compose ps

# Check disk / memory
df -h && free -h
```

---

## 9. Luồng CI/CD sau khi setup xong

```
git push → main
    ↓
GitHub Actions: lint-test.yml chạy CI
    ↓ (pass)
GitHub Actions: deploy.yml
    ↓
Build docker image API + Web → push lên GHCR
    ↓
SSH vào VPS:
  docker compose pull   ← image mới
  docker compose up -d  ← rolling restart
  docker image prune -f ← dọn image cũ
```

Xem kết quả tại: **GitHub repo → Actions tab**

---

## 10. Vận hành

### Xem logs
```bash
docker compose logs -f api     # API logs
docker compose logs -f web     # Web logs
docker compose logs --tail=100 # 100 dòng gần nhất
```

### Restart service
```bash
docker compose restart api
```

### Backup DB
```bash
docker compose exec postgres pg_dump -U prod_user event_ticket_db > backup-$(date +%Y%m%d).sql
```

### Update env (không cần redeploy code)
```bash
# Sửa api.env
nano /opt/event-ticket-system/api.env
docker compose up -d api  # restart chỉ api
```

---

## Checklist trước khi push lên main lần đầu

- [ ] Droplet đã tạo, SSH vào được bằng `deploy` user
- [ ] Docker đã cài, `docker compose version` OK
- [ ] `/opt/event-ticket-system/api.env` và `web.env` đã có đủ secrets
- [ ] `docker-compose.yaml` trên VPS đã thay đúng image path
- [ ] DNS trỏ đúng IP VPS
- [ ] Nginx config đúng domain, SSL đã cấp
- [ ] GitHub Secrets: `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY` đã set
- [ ] GHCR package visibility đúng (public hoặc deploy user có quyền pull)
- [ ] Deploy thủ công lần đầu thành công (`docker compose up -d`)
