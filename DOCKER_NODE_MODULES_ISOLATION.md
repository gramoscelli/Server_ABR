# Docker Node Modules Isolation

## Problem
Previously, `node_modules` directories were being shared between the host and Docker containers, causing:
- Cross-platform compatibility issues (Windows/WSL2/Linux)
- Permission conflicts (Docker runs as root, creates root-owned files on host)
- Unnecessary disk usage on host
- Potential version conflicts between host and container environments

## Solution Implemented

### 1. Created `.dockerignore` Files
Prevents Docker from copying `node_modules` from host during build:

**Frontend (`/frontend/.dockerignore`):**
- Excludes `node_modules`, build outputs, cache directories, and environment files
- Ensures only source code is copied to container during build

**Backend (`/app/.dockerignore`):**
- Excludes `node_modules`, logs, test files, and environment files
- Keeps Docker images lean and focused on production code

### 2. Created/Updated `.gitignore` Files
Prevents `node_modules` from being committed to Git:

**Root (`.gitignore`):**
```
app/node_modules/
frontend/node_modules/
node_modules/
```

**Frontend (`/frontend/.gitignore`):**
- Excludes dependencies, build outputs, cache, IDE files

**Backend (`/app/.gitignore`):**
- Excludes dependencies, logs, runtime data, IDE files

### 3. Updated `docker-compose.yml`
Added anonymous volume to exclude `node_modules` from host bind mount:

```yaml
app:
  volumes:
    - ./app:/usr/src/app
    # Exclude node_modules from host mount - keep it in container only
    - /usr/src/app/node_modules
```

This creates an **anonymous volume** for `node_modules` that:
- ✅ Exists only inside the container
- ✅ Persists between container restarts (but not rebuilds)
- ✅ Prevents bind-mounting from host
- ✅ Maintains proper Linux permissions inside container

### 4. Dockerfile Best Practices
Both Dockerfiles already follow multi-stage build patterns:

**Frontend:**
1. `deps` stage: Installs dependencies in container
2. `builder` stage: Copies deps and builds application
3. `runner` stage: Serves static files with nginx

**Backend:**
1. Copies only `package.json` first
2. Runs `npm install` inside container
3. Copies source code last

## How It Works Now

### Development Workflow
```bash
# 1. No need to run npm install on host
# 2. Build containers (dependencies install inside container)
docker compose build --no-cache app
docker compose build --no-cache frontend

# 3. Run containers
docker compose up -d

# 4. node_modules exists ONLY in containers, not on host
```

### Where Dependencies Live
- **Host:** Only `package.json` and `package-lock.json` (tracked in Git)
- **Container:** Full `node_modules` directory (Linux-compatible, root-owned)
- **Anonymous Volume:** Persists `node_modules` between container restarts

### Benefits
1. ✅ **Platform Independence:** Host OS doesn't matter
2. ✅ **No Permission Issues:** Container manages its own dependencies
3. ✅ **Consistent Environments:** Same Linux environment in all containers
4. ✅ **Faster Builds:** `.dockerignore` skips unnecessary files
5. ✅ **Clean Host:** No unnecessary files on host machine

## Existing Host node_modules (Old Files)

Los `node_modules` viejos en el host fueron creados por Docker con permisos de root. Ya no se usan gracias a:
- `.dockerignore` (excluye del build)
- Volúmenes anónimos en docker-compose.yml (excluye del mount en runtime)

### Para eliminarlos del host:

**Opción 1 - Script automático (recomendado):**
```bash
cd /home/gustavo/biblio-server
./cleanup_node_modules.sh
```

**Opción 2 - Manual:**
```bash
sudo rm -rf /home/gustavo/biblio-server/app/node_modules
sudo rm -rf /home/gustavo/biblio-server/frontend/node_modules
```

**Nota:** El frontend ya no tiene node_modules en el host. Solo `app/node_modules` necesita ser eliminado.

## Verification

### Check node_modules is in container only:
```bash
# Should show node_modules in container
docker compose exec app ls -la /usr/src/app/ | grep node_modules

# Should NOT create new node_modules on host
ls -la app/ | grep node_modules  # (old one from before still there)
ls -la frontend/ | grep node_modules  # (old one from before still there)
```

### Check containers are working:
```bash
# Both should be running without errors
docker compose ps
docker compose logs app
docker compose logs frontend
```

## Summary
All Node.js dependencies are now managed exclusively inside Docker containers, following industry best practices for containerized development. The host machine only needs source code and configuration files - no platform-specific dependencies required.
