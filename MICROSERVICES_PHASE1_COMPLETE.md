# Microservices FÁZIS 1 Befejezés – Infrastruktúra Alapok

## Befejezett Komponensek

### ✅ 1. Docker Compose Orchestration (`docker-compose.dev.yml`)

**6 szolgáltatás definiálva:**

1. **Nginx API Gateway** (port 80)
   - Request routing: `/api/*` → Node.js, `/ml/*` → Python
   - Rate limiting (10 req/s API, 5 req/s ML)
   - CORS headers
   - Load balancing

2. **Node.js Backend** (port 5000)
   - Current Express app (agent rendszer)
   - RabbitMQ integráció előkészítve
   - Environment: NODE_ENV=development

3. **Python ML Service** (port 8000)
   - FastAPI placeholder
   - RabbitMQ client konfigurálva
   - PYTHONUNBUFFERED=1

4. **RabbitMQ Message Queue** (ports 5672, 15672)
   - Management UI: http://localhost:15672
   - Persistent volumes
   - Health checks

5. **PostgreSQL Database** (port 5432)
   - Database: ba_ai
   - User: ba_ai / Password: development
   - Model registry később

6. **Redis Cache** (port 6379)
   - Session management
   - Caching layer
   - Persistence enabled

**Hálózatkezelés:**
- Unified bridge network: `ba-ai-network`
- Service-to-service kommunikáció DNS-en keresztül

---

### ✅ 2. Nginx API Gateway Konfiguráció (`nginx.conf`)

**Hlavní funkciók:**

- **Upstream definitions:**
  - Backend: backend:5000 (with failover)
  - ML Service: ml-service:8000

- **Rate Limiting:**
  - API: 10 req/s (burst 20)
  - ML: 5 req/s (burst 10)

- **Proxy Headers:**
  - X-Real-IP, X-Forwarded-For
  - Connection upgrades (WebSocket support)
  - Longer timeouts for ML (120s read/send)

- **CORS Headers:**
  - Automatic preflight OPTIONS handling
  - All origins allowed (dev)

- **Gzip Compression:**
  - Enabled for JSON, CSS, JS, XML

- **Production HTTPS Template:**
  - SSL/TLS commented config
  - HSTS headers
  - Security headers (X-Frame-Options, X-Content-Type-Options)

---

### ✅ 3. RabbitMQ inicializálás (`rabbitmq-init.sh`)

**Beállított queue-k:**

```
Exchanges:
  - ml.exchange (topic)

Queues:
  - ticket.processing
  - ml.inference
  - batch.processing
  - ticket.completed
  - ml.completed
  - dl.ticket.processing (Dead Letter)
  - dl.ml.inference (Dead Letter)

Bindings:
  - ticket.* → ticket.processing
  - ml.* → ml.inference
  - batch.* → batch.processing
```

---

### ✅ 4. Node.js Backend Dockerfile (`Dockerfile.backend`)

```dockerfile
FROM node:20-alpine
WORKDIR /app
RUN npm ci --only=production
HEALTHCHECK: /api/health
CMD: node server.js
```

---

## Indítási Útmutató

### 1. Előfeltételek

```bash
# Docker & Docker Compose installáció szükséges
docker --version
docker-compose --version
```

### 2. Helyi Fejlesztés Indítása

```bash
# Az aktuális repó gyökeréből
docker-compose -f docker-compose.dev.yml up -d

# Szolgáltatások elérhető:
# - API Gateway: http://localhost/
# - Node.js Backend: http://localhost:5000
# - Python ML (még üres): http://localhost:8000
# - RabbitMQ UI: http://localhost:15672 (guest/guest)
# - PostgreSQL: localhost:5432
# - Redis: localhost:6379
```

### 3. Logok Megtekintése

```bash
# Összes service loga
docker-compose -f docker-compose.dev.yml logs -f

# Csak Backend
docker-compose -f docker-compose.dev.yml logs -f backend

# Csak ML Service
docker-compose -f docker-compose.dev.yml logs -f ml-service

# RabbitMQ
docker-compose -f docker-compose.dev.yml logs -f rabbitmq
```

### 4. Leállítás

```bash
docker-compose -f docker-compose.dev.yml down

# Volumes törlésével (clean slate)
docker-compose -f docker-compose.dev.yml down -v
```

---

## RabbitMQ Management UI

Hozzáférés: http://localhost:15672
- **Default felhasználó:** guest
- **Default jelszó:** guest

Lehetőségek:
- Queue-k monitorozása
- Message-k megtekintése
- Connection debug

---

## Következő Lépés: FÁZIS 2

### Python ML Service (FastAPI) fejlesztése

Szükséges komponensek:

1. **`python-ml-service/` könyvtár struktura:**
   ```
   python-ml-service/
   ├── Dockerfile
   ├── requirements.txt
   ├── app.py                 # FastAPI main
   ├── config.py
   ├── models/
   │   ├── __init__.py
   │   ├── base.py           # ModelProvider ABC
   │   ├── anthropic_provider.py
   │   ├── openrouter_provider.py
   │   └── local_provider.py
   ├── workers/
   │   ├── __init__.py
   │   ├── consumer.py       # RabbitMQ consumer
   │   ├── inference.py      # NLP pipeline
   │   └── batch.py          # Batch processing
   └── .env.example
   ```

2. **FastAPI Endpoints:**
   - `POST /ml/inference` – LLM hívások
   - `POST /ml/batch` – Batch feldolgozás
   - `GET /ml/models` – Modell lista
   - `GET /ml/health` – Health check

3. **Model Abstraction Layer:**
   - Abstract base class ModelProvider
   - Anthropic, OpenRouter, Local implementations
   - Provider selection runtime-ban

4. **RabbitMQ Worker:**
   - Async consumer pool
   - Task processing
   - Retry logika

---

## Kockázatok és Megjegyzések

| Kockázat | Megoldás |
|----------|----------|
| Docker volumes nem működnek Windows-on | WSL2 vagy native Docker Desktop use |
| Port konfliktusok | Módosítsd a `docker-compose.dev.yml` port mappingeket |
| RabbitMQ init script nem fut | `chmod +x rabbitmq-init.sh` futtatása szükséges |
| Network DNS rezolúció | Ellenőrizd, hogy a `ba-ai-network` bridge hálózat létezik |

---

## Production Deployment Előkészítés

A `docker-compose.dev.yml` alapján production `docker-compose.prod.yml` jöhet később:

- Kubernetes Helm charts
- Persistent storage
- Secret management (Vault / AWS Secrets Manager)
- CI/CD pipeline (GitHub Actions / GitLab CI)
- Multi-region deployment (opcionális)

---

## Status

✅ **FÁZIS 1 KÉSZ**
- Docker Compose: ✅
- Nginx API Gateway: ✅
- RabbitMQ: ✅
- Node.js Dockerfile: ✅
- Initializáció scriptek: ✅

**Kezdési ideje: FÁZIS 2 (Python ML Service)**
