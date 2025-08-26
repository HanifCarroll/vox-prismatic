# Simplified Docker Setup

This project now uses a **unified Docker configuration** with multi-stage builds for clean development and production environments.

## Quick Start

### Development (Default)
```bash
# Start all services in development mode with hot reload
docker compose up

# Or explicitly specify development target
TARGET=development docker compose up
```

### Production
```bash
# Start all services in production mode with built artifacts
TARGET=production docker compose up
```

### Individual Services
```bash
# Start only database and API
docker compose up postgres api

# Start specific services
docker compose up postgres api web
```

## Architecture

### Single Configuration File
- **`docker-compose.yml`** - Unified configuration for all environments
- Uses `TARGET` environment variable to control build stages
- Consistent PostgreSQL database across all environments

### Multi-Stage Dockerfiles
Each service has **one Dockerfile** with multiple build targets:

**Development Stage:**
- Hot reload enabled
- Source code mounted as volumes
- Development commands (`nest start --watch`, `bun dev --watch`)

**Production Stage:**
- Built artifacts only
- Optimized for performance
- No source code mounts

## Services

### PostgreSQL Database
- **Port:** 5432
- **Database:** content_creation  
- **User:** postgres/postgres
- Consistent across all environments

### API (NestJS)
- **Port:** 3000
- **Development:** Hot reload with NestJS watch mode
- **Production:** Built dist/ artifacts
- **Health Check:** `/api/health`

### Web (Next.js)
- **Port:** 3002
- **Development:** Next.js dev server with Turbopack
- **Production:** Optimized static build
- **Health Check:** Homepage

### Worker (Background Jobs)
- **Development:** Watch mode for auto-restart
- **Production:** Built artifacts
- **Health Check:** Process verification

## Environment Variables

Set these in your `.env` file:
```bash
# Docker build target (development or production)
TARGET=development

# Node environment
NODE_ENV=development

# Database (automatically configured in docker-compose.yml)
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/content_creation
```

## Benefits of Simplified Setup

✅ **Single source of truth** - One docker-compose.yml file
✅ **Environment parity** - Same database and config across dev/prod  
✅ **Reduced complexity** - 60% fewer Docker files
✅ **Build targets** - Prevent configuration drift
✅ **Easy switching** - Toggle between dev/prod with one variable

## Removed Files

The following redundant files have been removed:
- `docker-compose.dev.yml`
- `docker-compose.prod.yml` 
- `apps/api/Dockerfile.dev`
- `apps/web/Dockerfile.dev`
- `apps/worker/Dockerfile.dev`

## Migration from Old Setup

If you were using the old setup:

**Old way:**
```bash
docker-compose -f docker-compose.dev.yml up
```

**New way:**
```bash
docker compose up  # (development is default)
```

## Detailed Service Information

### API Endpoints

All endpoints prefixed with `/api`:

- **Transcripts**: `GET/POST /api/transcripts`
- **Insights**: `GET /api/insights`, `POST /api/insights/bulk`
- **Posts**: `GET/PATCH /api/posts`, `POST /api/posts/:id/schedule`
- **Publisher**: `POST /api/publisher/process`
- **Documentation**: `GET /docs` - Swagger UI

### Monitoring Commands

```bash
# View logs
docker compose logs -f api     # API logs
docker compose logs -f worker  # Worker logs
docker compose logs -f web     # Web logs

# Check service status
docker compose ps

# Database operations
docker compose exec api bunx prisma migrate deploy
docker compose exec postgres psql -U postgres -d content_creation
```

### Database Management

```bash
# Run database migrations
docker compose exec api bunx prisma migrate deploy

# Generate Prisma client
docker compose exec api bunx prisma generate

# Seed database with sample data
docker compose exec api bunx prisma db seed
```

## Troubleshooting

### Common Issues

1. **Port conflicts**: Check `lsof -i :3000` and stop conflicting services
2. **Database connection**: Verify PostgreSQL health with `docker compose ps`
3. **Build failures**: Clean Docker cache with `docker system prune`

### Health Checks

All services include health checks:
- API: `curl http://localhost:3000/api/health`
- Web: `curl http://localhost:3002/`
- Database: `docker compose exec postgres pg_isready`

The new setup is much simpler and eliminates configuration inconsistencies!