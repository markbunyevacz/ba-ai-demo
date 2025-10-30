# Microservices & ML Service Layer Átépítési Terv

## Jelenlegi Állapot vs. Célállapot

### Jelenlegi (Monolitikus)
```
Frontend (React) → Node.js Express Backend → Services
```

### Célállapot (Microservices + ML)
```
Frontend (React) 
    ↓
API Gateway (Nginx/Kong)
    ↓ ⇄ ⇄ ⇄
    │    │   │
    ├─ Node.js Backend      ├─ Python ML Service      ├─ Model Server
    └─ RabbitMQ/Kafka       └─ Vector Database        └─ Model Registry
```

## FÁZIS 1: Infrastruktúra (1-2 hét)
- [ ] Docker Compose Setup
- [ ] Nginx API Gateway
- [ ] RabbitMQ Message Queue
- [ ] Health monitoring

## FÁZIS 2: Python ML Service (2-3 hét)
- [ ] FastAPI backend
- [ ] Model abstraction layer
- [ ] RabbitMQ consumer
- [ ] Vector DB prep

## FÁZIS 3: Node.js Refactor (1-2 hét)
- [ ] ML Service communication
- [ ] Agent proxy layer
- [ ] Queue integration

## FÁZIS 4: Model Server (2-3 hét)
- [ ] TorchServe / Triton
- [ ] Model registry
- [ ] Versioning

## FÁZIS 5: Monitoring (1-2 hét)
- [ ] Distributed tracing (Jaeger)
- [ ] Prometheus metrics
- [ ] Grafana dashboards

## FÁZIS 6: Advanced ML (3+ hét)
- [ ] Fine-tuning pipeline
- [ ] Vector embeddings
- [ ] NLP pipeline

## Technológiai Stack
- API Gateway: Nginx / Kong
- Backend: Node.js (Express)
- ML Service: Python (FastAPI)
- Queue: RabbitMQ
- Model Server: TorchServe / Triton
- Vector DB: Pinecone / Weaviate
- Monitoring: Prometheus + Grafana + Jaeger

## MVP Timeline: 4-6 hét
1. Python ML Service (FastAPI)
2. RabbitMQ + TicketAgent integration
3. Basic monitoring
4. TicketAgent → ML Service proxy
