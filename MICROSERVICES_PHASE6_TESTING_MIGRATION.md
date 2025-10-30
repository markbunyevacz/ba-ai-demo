# Microservices FÁZIS 6 – Tesztelés & Migráció

**Dátum**: 2025-10-30  
**Státusz**: ✅ Fázis teljesítve (tesztcsomag + migrációs útmutató)

---

## 🧪 Backend Tesztek

### 1. Pytest struktúra

```
python-backend/
└── tests/
    ├── conftest.py                 # FastAPI TestClient + provider stubok
    ├── test_services/
    │   └── test_grounding_service.py
    └── test_api/
        ├── test_health.py
        ├── test_ai_models.py
        ├── test_grounding.py
        └── test_upload.py
```

### 2. Új integrációs tesztek
- **Health** (`/api/health`) – státusz, backend mezők ellenőrzése  
- **AI Models** (`/api/ai/models`) – Anthropic/OpenRouter stubokkal  
- **Grounding** (`/api/grounding`) – stats + validate  
- **Upload** (`/api/upload`, `/api/upload/document`) – 422 / 400 verifikáció

### 3. Futtatás
```bash
cd python-backend
pytest
pytest tests/test_api/test_upload.py -vv
```

### 4. CI ajánlás
- Adj hozzá GitHub Actions lépést: `pip install -r python-backend/requirements.txt && pytest python-backend/tests`
- A provider stuboknak köszönhetően nincs hálózati függőség

---

## ⚙️ Frontend tesztek
- React komponensek továbbra is `vitest`-tel futnak (`npm run test`)  
- Javasolt E2E (Playwright/Cypress) szkriptek:
  - Upload → Ticket pipeline  
  - Jira OAuth happy path  
  - AI modell választás fallback flow  

---

## 🚀 Migrációs Stratégia

### 1. Előkészületek
- [x] Python backend futtatása `uvicorn main:app --reload --port 5000`
- [x] React dev szerver `npm run dev` (proxy `/api`, `/auth` → Python backend)  
- [x] `.env` frissítése (frontend):
  ```env
  VITE_API_URL=/api
  VITE_AUTH_URL=/auth
  VITE_DEV_SERVER_PORT=3000
  BACKEND_HOST=localhost
  BACKEND_PORT=5000
  ```

### 2. Párhuzamos futtatás (opcionális)
| Komponens | Port | Megjegyzés |
|-----------|------|------------|
| Python FastAPI | 5000 | Új backend |
| Node.js Express | 5001 | Legacy fallback (ha szükséges) |
| React dev szerver | 3000 | Proxy `/api`, `/auth` → 5000 |
| Nginx gateway | 80/443 | Későbbi cutoverhez |

### 3. Cutover lépések
1. **Előzetes**: Pipeline (CI/CD) futtatása + `pytest` + `npm run build`  
2. **Konfiguráció**: Nginx upstream `/api` → FastAPI  
3. **Monitoring**: FastAPI `GET /api/health` + Prometheus (MonitoringService)  
4. **Rollback terv**: Nginx switch vissza Express-re, adatbázis rollback nem szükséges

### 4. Post-cutover checklist
- [ ] Jira OAuth redirect (AUTH_BASE_URL) ellenőrzése  
- [ ] AI modell lista betöltés (OpenRouter kulcs)  
- [ ] Upload + grounding + compliance flow  
- [ ] Diagram generálás  
- [ ] Monitoring metrikák frissülnek

---

## 📄 Dokumentáció frissítések
- `MICROSERVICES_PHASE5_FRONTEND_COMPLETE.md` – frontend átállás  
- Jelen dokumentum – teszt+cutover útmutató  
- Ajánlott: README → „Running backend tests” szekció bővítése (következő lépés)

---

## ✅ Eredmény
- Automata backend integrációs tesztek (provider stubok, hálózat nélkül)  
- Egységes migrációs terv (parallel futtatás → cutover → rollback)  
- Frontend API kliens kész Python backendhez  

**FÁZIS 6** teljesítve – rendszer készen áll a teljes cutoverre. Következő feladat: folyamatos monitorozás + finomhangolás.  
