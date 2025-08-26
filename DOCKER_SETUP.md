# Docker Setup for Publishing System

This guide covers running the Content Creation publishing system with Docker Compose.

## Quick Start

1. **Copy environment variables**:
   ```bash
   cp .env.example .env
   ```

2. **Configure credentials** in `.env` - add your platform API keys:
   ```bash
   # LinkedIn
   LINKEDIN_CLIENT_ID=your_client_id
   LINKEDIN_CLIENT_SECRET=your_client_secret  
   LINKEDIN_ACCESS_TOKEN=your_access_token
   
   # X (Twitter)
   X_CLIENT_ID=your_client_id
   X_CLIENT_SECRET=your_client_secret
   X_ACCESS_TOKEN=your_access_token
   ```

3. **Start the services**:
   ```bash
   # Development mode (default) - with live reload
   docker-compose up -d
   
   # Include web app (optional)
   docker-compose --profile web up -d
   
   # Production mode - static builds
   docker-compose -f docker-compose.prod.yml up -d
   ```

## 🔄 **Live Reload (Default)**

The main `docker-compose.yml` is configured for **development with live reload**:

- ✅ **File Changes**: Automatically reflected in containers
- ✅ **Hot Reload**: Bun's `--watch` flag restarts services on changes  
- ✅ **Fast Iteration**: No need to rebuild Docker images
- ✅ **Volume Mounts**: Source code mounted from your local machine

**What's mounted:**
- `./apps/api/src` → API source code
- `./apps/worker/src` → Worker source code  
- `./apps/web/src` → Web app source code (if using `--profile web`)
- `./packages` → Shared packages

## Services

### API Server (`api`)
- **Port**: 3000 
- **Health**: http://localhost:3000/health
- **Routes**: 
  - `POST /api/publisher/process` - Trigger publishing
  - `GET /api/publisher/queue` - View posts pending publication
  - `GET /api/publisher/status` - Check system health

### Worker (`worker`)
- **Purpose**: Automatically publishes scheduled posts
- **Interval**: Every 60 seconds (configurable)
- **Database**: Shared SQLite with API via volume
- **Logs**: `docker-compose logs worker -f`

### Web App (`web`) - Optional
- **Port**: 3001
- **Profile**: Include with `--profile web`

## Database

- **Type**: SQLite
- **Location**: `./data/content.db` (Docker volume)
- **Shared**: Between API and Worker services

## Environment Variables

Key configuration options:

```bash
# Worker behavior
WORKER_INTERVAL_SECONDS=60        # Check every 60 seconds
WORKER_RETRY_ATTEMPTS=3           # Retry failed posts 3 times

# Database
DATABASE_PATH=/app/data/content.db

# API server
PORT=3000
HOST=0.0.0.0

# Frontend (when using web service)
NEXT_PUBLIC_API_URL=http://localhost:3000
```

## Usage Examples

### View Publishing Queue
```bash
curl http://localhost:3000/api/publisher/queue
```

### Trigger Manual Publishing
```bash
curl -X POST http://localhost:3000/api/publisher/process \
  -H "Content-Type: application/json"
```

### Check System Status
```bash
curl http://localhost:3000/api/publisher/status
```

### Retry Failed Post
```bash
curl -X POST http://localhost:3000/api/publisher/retry/post_123 \
  -H "Content-Type: application/json"
```

## Monitoring

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs api -f
docker-compose logs worker -f
```

### Service Status
```bash
docker-compose ps
```

### Worker Health
```bash
# Check if worker is healthy
docker-compose exec worker bun index.js health
```

## Troubleshooting

### Worker Not Processing Posts
1. Check worker logs: `docker-compose logs worker`
2. Verify credentials in `.env`
3. Check database permissions: `ls -la data/`

### Database Issues
1. Ensure `data/` directory exists and is writable
2. Check database file: `ls -la data/content.db`
3. Restart services: `docker-compose restart`

### API Connection Issues
1. Verify port 3000 is available
2. Check health endpoint: `curl http://localhost:3000/health`
3. Review API logs: `docker-compose logs api`

## Development

### Build Images
```bash
docker-compose build
```

### Update Worker Only
```bash
docker-compose build worker
docker-compose up -d worker
```

### Access Database
```bash
# Install sqlite3 in API container
docker-compose exec api sh
sqlite3 /app/data/content.db
```

## Production Considerations

1. **Secrets Management**: Use Docker secrets instead of .env for production
2. **Database Backups**: Backup `./data/content.db` regularly
3. **Monitoring**: Add proper monitoring/alerting for worker health
4. **Scaling**: Can run multiple worker instances if needed
5. **SSL**: Put behind reverse proxy (nginx/traefik) for HTTPS