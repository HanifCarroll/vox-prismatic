# Docker Setup & Port Configuration

## Overview

This document describes the Docker configuration and port assignments for the Content Creation monorepo.

## Port Assignments

| Service       | Port | Description                     |
|--------------|------|---------------------------------|
| API Server   | 3000 | NestJS API server               |
| Web App      | 3002 | Next.js web application         |
| PostgreSQL   | 5432 | Database server                 |

## Directory Structure

```
apps/
├── api/          # NestJS API - Port 3000
├── web/          # Next.js Web App - Port 3002
└── worker/       # Background worker service
```

## Quick Start

### 1. Copy environment variables
```bash
cp .env.example .env
```

### 2. Configure credentials in `.env`
```env
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/content_creation

# NestJS API
PORT=3000
HOST=0.0.0.0
NODE_ENV=development

# Authentication
JWT_SECRET=your-secret-key

# External Services  
GOOGLE_GEMINI_API_KEY=your-api-key
LINKEDIN_CLIENT_ID=your-client-id
LINKEDIN_CLIENT_SECRET=your-client-secret
LINKEDIN_ACCESS_TOKEN=your-access-token
X_CLIENT_ID=your-client-id
X_CLIENT_SECRET=your-client-secret
X_ACCESS_TOKEN=your-access-token
```

### 3. Start the services

```bash
# Production mode - optimized builds
docker-compose up --build

# Development mode - with hot reload
docker-compose -f docker-compose.dev.yml up

# Start specific services
docker-compose up api postgres  # Just API and database
```

## Service Details

### API Server (NestJS) - Port 3000

- **Dockerfile**: `apps/api/Dockerfile`
- **Dev Dockerfile**: `apps/api/Dockerfile.dev`
- **Health Check**: `http://localhost:3000/api/health`
- **Swagger Docs**: `http://localhost:3000/docs`
- **Features**:
  - Full TypeScript with decorators
  - Swagger/OpenAPI documentation
  - Class-validator for request validation
  - Prisma ORM integration
  - Exception filters and interceptors
  - Global modules with dependency injection


### PostgreSQL Database - Port 5432

- **Image**: postgres:16-alpine
- **Database Name**: content_creation
- **Credentials**: postgres/postgres (development)
- **Data Volume**: postgres_data

### Web Application - Port 3002

- **API Connection**: Points to NestJS API on port 3000
- **Environment Variables**:
  - `NEXT_PUBLIC_API_BASE_URL=http://localhost:3000`
  - `API_BASE_URL=http://api:3000` (internal Docker network)

### Worker Service

- **Purpose**: Automatically publishes scheduled posts
- **Interval**: Every 60 seconds (configurable via `WORKER_INTERVAL_SECONDS`)
- **Database**: Shared PostgreSQL with API services
- **Dependencies**: Requires API service to be healthy

## Development with Live Reload

The `docker-compose.dev.yml` file is configured for development with hot reload:

- ✅ **File Changes**: Automatically reflected in containers
- ✅ **Hot Reload**: Bun's `--watch` flag and NestJS watch mode
- ✅ **Fast Iteration**: No need to rebuild Docker images
- ✅ **Volume Mounts**: Source code mounted from your local machine

**What's mounted:**
- `./apps/api/src` → API source code
- `./apps/worker/src` → Worker source code
- `./apps/web/src` → Web app source code
- `./packages` → Shared packages

## API Endpoints

### NestJS API (Port 3000)

All endpoints prefixed with `/api`:

- **Transcripts**:
  - `GET /api/transcripts`
  - `POST /api/transcripts`
  - `PATCH /api/transcripts/:id`
  
- **Insights**:
  - `GET /api/insights`
  - `PATCH /api/insights/:id`
  - `POST /api/insights/bulk`
  
- **Posts**:
  - `GET /api/posts`
  - `PATCH /api/posts/:id`
  - `POST /api/posts/:id/schedule`
  
- **Publisher**:
  - `POST /api/publisher/process`
  - `GET /api/publisher/queue`
  - `GET /api/publisher/status`
  - `POST /api/publisher/immediate`
  
- **Documentation**:
  - `GET /docs` - Swagger UI

## Usage Examples

### Check Health Status
```bash
curl http://localhost:3000/api/health
```

### View Publishing Queue
```bash
curl http://localhost:3000/api/publisher/queue
```

### Trigger Manual Publishing
```bash
curl -X POST http://localhost:3000/api/publisher/process \
  -H "Content-Type: application/json"
```

## Monitoring

### View Logs
```bash
# All services
docker-compose logs -f

# Specific services
docker-compose logs api -f        # API logs
docker-compose logs postgres -f  # Database logs
docker-compose logs worker -f    # Worker logs
docker-compose logs web -f       # Web app logs
```

### Service Status
```bash
docker-compose ps
```

## Building Docker Images

### Production Build
```bash
# Build API
docker build -f apps/api/Dockerfile -t content-api:latest .
```

### Development Build
```bash
# Build with development Dockerfile
docker build -f apps/api/Dockerfile.dev -t content-api:dev .
```

## Database Management

### Run Migrations
```bash
# NestJS API (Prisma)
docker-compose exec api bunx prisma migrate deploy

# Generate Prisma Client
docker-compose exec api bunx prisma generate
```

### Access Database
```bash
# Connect to PostgreSQL
docker-compose exec postgres psql -U postgres -d content_creation
```

## Troubleshooting

### Port Conflicts
If you encounter port conflicts:
1. Check for running services: `lsof -i :3000`
2. Stop conflicting services or change ports in `docker-compose.yml`

### Database Connection Issues
1. Ensure PostgreSQL is healthy: `docker-compose ps postgres`
2. Check connection string in `.env`
3. Verify database migrations: `docker-compose exec api bunx prisma migrate deploy`

### Hot Reload Not Working
1. Ensure you're using `docker-compose.dev.yml`
2. Check volume mounts are correct
3. Verify file watchers are enabled in your Docker settings

### Worker Not Processing Posts
1. Check worker logs: `docker-compose logs worker`
2. Verify credentials in `.env`
3. Check database connectivity

## Architecture Notes

### API Server Features
- **Framework**: NestJS with full TypeScript support
- **Database**: PostgreSQL with Prisma ORM for type-safe queries
- **Documentation**: Auto-generated Swagger/OpenAPI at `/docs`
- **Validation**: Request validation using class-validator decorators
- **Error Handling**: Global exception filters for consistent error responses
- **Authentication**: JWT-based authentication with guards
- **Dependency Injection**: Full IoC container with module system

## Production Considerations

1. **Secrets Management**: Use Docker secrets or external secret management instead of .env files
2. **Database**: Use managed PostgreSQL service for production
3. **Monitoring**: Add proper monitoring/alerting (Prometheus, Grafana)
4. **SSL/TLS**: Put behind reverse proxy (nginx/traefik) for HTTPS
5. **Scaling**: Use orchestration platform (Kubernetes, Docker Swarm) for scaling
6. **Health Checks**: All services include health check endpoints for monitoring
7. **Logging**: Centralize logs with ELK stack or similar solution