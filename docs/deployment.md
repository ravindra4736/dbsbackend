# DBS CMS Backend Deployment

## PM2 Configuration

The backend is managed by PM2 using the configuration in `ecosystem.config.cjs`.

### Configuration

```javascript
module.exports = {
  apps: [
    {
      name: "dbsbackend",
      script: "dist/main.js",
      interpreter: "node",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "300M",
      env: {
        NODE_ENV: "production"
      }
    }
  ]
};
```

### PM2 Commands

```bash
# Start application
pm2 start ecosystem.config.cjs

# Stop application
pm2 stop dbsbackend

# Restart application
pm2 restart dbsbackend

# Delete application
pm2 delete dbsbackend

# View logs
pm2 logs dbsbackend

# Monitor
pm2 monit

# Save process list
pm2 save

# Setup startup script
pm2 startup
```

### PM2 Logs

PM2 logs are stored in `~/.pm2/logs/`:
- `dbsbackend-out.log` - Standard output
- `dbsbackend-error.log` - Error output
- `dbsbackend.log` - Combined logs

## Nginx Configuration

Nginx acts as a reverse proxy for the backend.

### Example Nginx Configuration

```nginx
upstream dbsbackend {
    server 127.0.0.1:3001;
}

server {
    listen 80;
    server_name dbsbackend.local;

    # API proxy
    location /api/ {
        proxy_pass http://dbsbackend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Health endpoint
    location /health {
        proxy_pass http://dbsbackend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }

    # Root endpoint
    location / {
        proxy_pass http://dbsbackend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }

    # Swagger docs (local/staging only)
    location /api/docs {
        proxy_pass http://dbsbackend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }

    # Static uploads
    location /uploads/ {
        proxy_pass http://dbsbackend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
```

### Media Library upload limits

Add to the Nginx `http` or `server` block that fronts the API/admin:

```nginx
client_max_body_size 100M;
```

Persistence: keep `UPLOAD_PATH` (default `uploads/`) outside deploy wipe paths and back it up alongside MySQL. Files must survive PM2 restarts and app redeploys.

Supported uploads (server-validated): images (JPEG/PNG/WebP/GIF/AVIF/SVG/BMP/TIFF/ICO/HEIC), video (MP4/WebM/MOV), audio (MP3/M4A/WAV/OGG/AAC), documents (PDF/Office/OpenDocument/TXT/CSV). Executables, HTML/JS, and generic archives remain blocked. SVG is accepted only after rejecting active content (`script`, event handlers, etc.).

### Nginx Commands

```bash
# Test configuration
sudo nginx -t

# Reload configuration
sudo nginx -s reload

# Restart Nginx
sudo systemctl restart nginx

# Check status
sudo systemctl status nginx
```

## Build Process

### Build Commands

```bash
# Clean build artifacts
npm run clean

# Build for production
npm run build

# Clean build (recommended for production)
npm run build:clean
```

### Build Output

The build process generates:
- `dist/` - Compiled JavaScript files
- `dist/*.js` - Application code
- `dist/*.d.ts` - TypeScript declaration files
- `dist/*.js.map` - Source maps for debugging

### Build Verification

After building, verify:
```bash
# Check dist folder exists
ls -la dist/

# Check main.js exists
ls -la dist/main.js

# Test production start
npm run start:prod
```

## Environment Variables

### Required Environment Variables

Create a `.env` file in the project root:

```bash
# Application
APP_NAME=DBS CMS Backend
APP_ENV=production
APP_URL=https://api.dbsbackend.com
PORT=3001
CORS_ORIGIN=https://admin.dbsbackend.com,https://www.dbsbackend.com

# Database
DATABASE_URL=mysql://user:password@localhost:3306/dbs_cms

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# Upload
UPLOAD_DRIVER=local
UPLOAD_PATH=uploads
LOG_LEVEL=info
```

### Environment-Specific Variables

**Local Development:**
```bash
APP_ENV=local
APP_URL=http://localhost:3001
CORS_ORIGIN=http://localhost:3000
```

**Staging:**
```bash
APP_ENV=staging
APP_URL=https://staging-api.dbsbackend.com
CORS_ORIGIN=https://staging-admin.dbsbackend.com
```

**Production:**
```bash
APP_ENV=production
APP_URL=https://api.dbsbackend.com
CORS_ORIGIN=https://admin.dbsbackend.com,https://www.dbsbackend.com
```

## Deployment Steps

### Initial Deployment

1. **Clone repository**
   ```bash
   git clone <repository-url>
   cd dbsbackend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with production values
   ```

4. **Generate Prisma client**
   ```bash
   npm run prisma:generate
   ```

5. **Run database migrations**
   ```bash
   npm run prisma:migrate
   ```

6. **Build application**
   ```bash
   npm run build:clean
   ```

7. **Start with PM2**
   ```bash
   pm2 start ecosystem.config.cjs
   pm2 save
   ```

8. **Configure Nginx**
   ```bash
   # Add Nginx configuration
   sudo nginx -t
   sudo nginx -s reload
   ```

### Subsequent Deployments

1. **Pull latest code**
   ```bash
   git pull origin main
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Generate Prisma client**
   ```bash
   npm run prisma:generate
   ```

4. **Run database migrations**
   ```bash
   npm run prisma:migrate
   ```

5. **Build application**
   ```bash
   npm run build:clean
   ```

6. **Restart PM2**
   ```bash
   pm2 restart dbsbackend
   ```

## Restart Process

### Graceful Restart

PM2 handles graceful restarts with zero downtime:

```bash
pm2 restart dbsbackend
```

The application:
1. Receives SIGTERM signal
2. Stops accepting new connections
3. Completes in-flight requests
4. Closes database connections
5. Closes Redis connections
6. Shuts down cleanly
7. PM2 starts new process

### Zero-Downtime Deployment

For zero-downtime deployment:
```bash
# Build new version
npm run build:clean

# Reload PM2 (graceful reload)
pm2 reload dbsbackend
```

## Troubleshooting

### Application Won't Start

Check PM2 logs:
```bash
pm2 logs dbsbackend --lines 100
```

Common issues:
- Port already in use
- Database connection failed
- Redis connection failed
- Missing environment variables

### Database Connection Issues

Verify DATABASE_URL in `.env`:
```bash
echo $DATABASE_URL
```

Test database connection:
```bash
npm run prisma:studio
```

### Redis Connection Issues

Verify Redis is running:
```bash
redis-cli ping
```

Check Redis configuration in `.env`.

### Build Errors

Clean build:
```bash
npm run clean
npm run build
```

If TypeScript errors persist, check:
- TypeScript version compatibility
- Node.js version (should be 25)
- Dependency conflicts

### PM2 Issues

Reset PM2:
```bash
pm2 delete dbsbackend
pm2 start ecosystem.config.cjs
pm2 save
```

Flush PM2 logs:
```bash
pm2 flush
```
