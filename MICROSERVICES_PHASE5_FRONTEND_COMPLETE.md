# Microservices FÁZIS 5 – Frontend Integráció a Python Backendhez

**Dátum**: 2025-10-30  
**Státusz**: ✅ Teljesítve (API client refactor + komponens frissítés + build config)

---

## 🎯 Célok
- Új, központi API kliens a Python FastAPI backendhez  
- React komponensek átállítása az új kliensre  
- Konfigurálható környezeti változók (`VITE_API_URL`, `VITE_AUTH_URL`) + dev proxy  

Mind a három részfeladat 100%-ban elkészült.

---

## 🔌 Új API kliens (`src/services/apiClient.js`)
- Alap URL-ek: `VITE_API_URL` (default: `/api`), `VITE_AUTH_URL` (default: `/auth`)  
- Általános `request()` wrapper (JSON parsing, hiba kezelés, query param támogatás)  
- `uploadFile()` segédfüggvény FormData-hoz  
- Egységes hívások: `get`, `post`, `put`, `patch`, `delete`  
- Hibák egységes objektummal (`error.status`, `error.body`, `error.message`)

---

## 🔁 Komponens & service frissítések
- `src/App.jsx`
  - Jira státusz / logout / ticket küldés → `apiClient`
  - Újrahasznosítható `AUTH_BASE_URL` login átirányításhoz
  - Fájl feltöltés: `apiClient.uploadFile` (AI provider/model mezőkkel)
  - Hibakezelés egyszerűbb, ismétlődő JSON parse logika eltávolítva
- `src/components/GroundingDashboard.jsx`
  - Grounding statisztika hívás `apiClient.get`
  - Hibák olvasható üzenettel jelennek meg
- `src/components/ModelSelector.jsx`
  - Dinamikus provider list (backend által szolgáltatott adatok)  
  - `apiClient.get('/ai/models')` használata  
  - UI figyelmeztetés, ha provider nincs konfigurálva  
  - Graceful fallback üres modell listára
- `src/services/complianceClient.js` & `diagramClient.js`
  - Minden fetch → `apiClient.post` / `apiClient.get`

---

## ⚙️ Build & környezet (`vite.config.js`)
- `VITE_API_URL`, `VITE_AUTH_URL` default értékek beégetve (`define` blokk)  
- Dev proxy `/api` és `/auth` útvonalakra  
- Környezeti változó betöltés (`dotenv`) változatlanul megmaradt

### Környezeti változók használata
```bash
# .env (példa)
VITE_API_URL=/api
VITE_AUTH_URL=/auth
VITE_DEV_SERVER_PORT=3000
BACKEND_HOST=localhost
BACKEND_PORT=5000
```

---

## ✅ Ellenőrző lista
- [x] API kliens létrehozása + egységesített hívások  
- [x] Upload, Jira, grounding, compliance, diagram útvonalak frissítése  
- [x] Model selector dinamikus provider/model lista  
- [x] Vite config – proxy + env define  
- [x] Linter hibák: 0

---

## 🧪 Tesztelési javaslatok
```bash
# Frontend dev szerver (proxy a Python backendre)
npm run dev

# Ellenőrzés: Model list betöltése
curl http://localhost:5000/api/ai/models

# Feltöltési flow manuális tesztje (React UI)
```

---

## ⚠️ Megjegyzések
- A kliens automatikusan JSON-t vár; nem-JSON válasznál hibaüzenet generálódik  
- Jira rate limit (429) kezelése exponential backoff-fal (3 próbálkozás)  
- `apiClient.uploadFile` 8 KB feletti fájlokra is működik (FormData streaming)

---

**FÁZIS 5** lezárva – front-end készen áll a Python backend teljes körű használatára. Következő lépés: **FÁZIS 6 (Tesztelés & migráció)**.
