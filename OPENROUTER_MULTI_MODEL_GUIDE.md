# OpenRouter & Multi-Model Support - Használati Útmutató

## ✅ ÚJ FUNKCIÓ: Model kiválasztás a felületen!

Most már **választhatsz különböző AI modelleket** közvetlenül a felhasználói felületen, dokumentum feltöltés előtt.

---

## 🎯 Mi változott?

### ELŐTTE:
- Csak OpenAI GPT-4/3.5 modelleket használhattál
- API kulcs fix volt a `.env` fájlban
- Nem lehetett váltani modellek között

### MOST:
- ✅ **100+ model közül választhatsz** (GPT-4, Claude, Llama, Gemini stb.)
- ✅ **Felületi model selector** dropdown
- ✅ **OpenRouter integráció** (többszörös provider)
- ✅ **Költség optimalizálás** (olcsóbb modellek kiválasztása)
- ✅ **Minőség vs. Sebesség** trade-off lehetőségek

---

## 🚀 GYORS KEZDÉS

### 1. Válassz egy providert

#### Opció A: OpenAI (Közvetlen)
```bash
# .env fájl
AI_PROVIDER=openai
OPENAI_API_KEY=sk-your-key-here
```

#### Opció B: OpenRouter (100+ model) ⭐ AJÁNLOTT
```bash
# .env fájl
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=sk-or-v1-your-key-here
OPENROUTER_MODEL=openai/gpt-3.5-turbo
```

### 2. Szerezz API kulcsot

- **OpenAI**: https://platform.openai.com/api-keys
- **OpenRouter**: https://openrouter.ai/keys (gyorsabb regisztráció!)

### 3. Indítsd a szervert

```bash
npm run server
```

### 4. Használat a felületen

1. Nyisd meg: http://localhost:5000
2. **Válassz AI providert**: OpenAI vagy OpenRouter
3. **Válassz modellt**: dropdown lista az elérhető modellekkel
4. **Töltsd fel** a dokumentumot
5. Profit! 🎉

---

## 📊 ELÉRHETŐ MODELLEK

### OpenAI Provideren keresztül

| Model | Költség | Sebesség | Minőség | Ajánlott |
|-------|---------|----------|---------|----------|
| GPT-4 Turbo | $0.03/1K | Közepes | Kiváló | ⭐ Igen |
| GPT-4 | $0.03/1K | Lassú | Kiváló | - |
| GPT-3.5 Turbo | $0.002/1K | Gyors | Jó | 💰 Budget |

### OpenRouter-en keresztül

| Model | Provider | Költség | Sebesség | Minőség | Jelölő |
|-------|----------|---------|----------|---------|--------|
| GPT-4 Turbo | OpenAI | $0.03/1K | Közepes | Kiváló | - |
| GPT-3.5 Turbo | OpenAI | $0.002/1K | Gyors | Jó | ⭐💰 |
| Claude 3 Opus | Anthropic | $0.075/1K | Közepes | Kiváló | 👑 Premium |
| Claude 3 Sonnet | Anthropic | $0.015/1K | Gyors | Nagyon jó | - |
| Claude 3 Haiku | Anthropic | $0.001/1K | Nagyon gyors | Jó | 💰 Budget |
| Llama 3 70B | Meta | $0.0009/1K | Gyors | Jó | 💰 Budget |
| Gemini Pro 1.5 | Google | $0.005/1K | Gyors | Nagyon jó | - |

**Jelölések**:
- ⭐ = Ajánlott (legjobb ár/érték arány)
- 💰 = Budget (legolcsóbb)
- 👑 = Prémium (legjobb minőség, drágább)

---

## 💰 KÖLTSÉG ÖSSZEHASONLÍTÁS

### 200 KB dokumentum feldolgozása (tipikus)

| Model | Költség/doc | 100 doc/hó | 1000 doc/hó |
|-------|-------------|------------|-------------|
| GPT-3.5 Turbo (OpenRouter) | $0.04 | $4 | $40 |
| Claude 3 Haiku | $0.02 | $2 | $20 |
| Llama 3 70B | $0.018 | $1.80 | $18 |
| GPT-4 Turbo | $0.60 | $60 | $600 |
| Claude 3 Opus | $1.50 | $150 | $1500 |

**Megtakarítás OpenRouter GPT-3.5-tel vs OpenAI GPT-4**: **93% olcsóbb!**

---

## 🎨 FELHASZNÁLÓI FELÜLET

### Model Selector Komponens

A model selector automatikusan betöltődik a dokumentum feltöltő felületen:

```
┌─────────────────────────────────────┐
│ 🤖 AI Provider                      │
│ [ OpenRouter ▼ ]                    │
│ ⚠️ OPENROUTER_API_KEY configured    │
├─────────────────────────────────────┤
│ 🧠 Model                            │
│ [ GPT-3.5 Turbo (OpenRouter) ⭐💰 ] │
├─────────────────────────────────────┤
│ Szolgáltató: OpenAI via OpenRouter │
│ Költség: $0.002/1K tokens          │
│ Sebesség: Fast                      │
│ Minőség: Good                       │
│ 💰 Költséghatékony választás        │
└─────────────────────────────────────┘
```

### Jelölések a UI-ban

- ⭐ = Ajánlott modell
- 💰 = Budget opció
- 👑 = Prémium minőség
- ⚠️ = API kulcs hiányzik/nem konfigurált

---

## 🔧 TECHNIKAI RÉSZLETEK

### API Endpoint módosítások

#### POST `/api/upload/document`
**ÚJ paraméterek**:
```javascript
FormData {
  file: File,
  aiProvider: 'openai' | 'openrouter',  // ÚJ
  aiModel: 'gpt-4-turbo-preview' | ...   // ÚJ
}
```

#### GET `/api/ai/models` (ÚJ endpoint)
Visszaadja az elérhető modelleket:
```javascript
{
  "models": {
    "openai": [...],
    "openrouter": [...]
  },
  "defaultProvider": "openai",
  "providers": {
    "openai": { "available": true, "configured": true },
    "openrouter": { "available": true, "configured": false }
  }
}
```

### Módosított fájlok

1. **src/services/aiAnalysisService.js** (+150 sor)
   - Multi-provider support
   - Model-specifikus pricing
   - OpenRouter integráció

2. **src/services/documentParser.js** (+10 sor)
   - Constructor most fogad AI options-t

3. **server.js** (+120 sor)
   - Model selection paraméterek kezelése
   - `/api/ai/models` endpoint

4. **src/components/ModelSelector.jsx** (ÚJ, 220 sor)
   - Model kiválasztó UI komponens

5. **src/App.jsx** (+15 sor)
   - ModelSelector integráció
   - Selected model state management

### OpenRouter API kompatibilitás

Az OpenRouter API 100%-ban kompatibilis az OpenAI API-val:
```javascript
const client = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',  // Csak ez változik!
  defaultHeaders: {
    'HTTP-Referer': 'http://localhost:5000',
    'X-Title': 'BA AI Assistant'
  }
})
```

---

## 🧪 TESZTELÉS

### 1. Ellenőrizd, hogy a modellek betöltődnek

```bash
curl http://localhost:5000/api/ai/models
```

Válasz:
```json
{
  "models": { "openai": [...], "openrouter": [...] },
  "providers": {
    "openai": { "available": true, "configured": false },
    "openrouter": { "available": true, "configured": true }
  }
}
```

### 2. Teszteld különböző modellekkel

1. Nyisd meg a UI-t
2. Válaszd: **OpenRouter** provider
3. Válaszd: **GPT-3.5 Turbo** (olcsó teszt)
4. Töltsd fel egy kis dokumentumot
5. Ellenőrizd a console logokat:
   ```
   [AIAnalysisService] Provider: openrouter | Model: openai/gpt-3.5-turbo
   [AIAnalysisService] Tokens: 2450
   [AIAnalysisService] Cost: $0.0049
   ```

### 3. Költség monitoring

A response tartalmazza a költség információkat:
```javascript
{
  "aiMetadata": {
    "costStats": {
      "totalTokens": 8942,
      "estimatedCost": "0.0179",
      "callCount": 3,
      "provider": "openrouter",
      "model": "openai/gpt-3.5-turbo"
    }
  }
}
```

---

## ❓ GYAKORI KÉRDÉSEK

### Mi a különbség az OpenAI és OpenRouter között?

| Jellemző | OpenAI | OpenRouter |
|----------|--------|------------|
| Modellek | 3 (GPT-3.5, GPT-4) | 100+ (GPT, Claude, Llama, Gemini stb.) |
| Regisztráció | Lassabb, bankkártya szükséges | Gyorsabb, credit is elérhető |
| Költség | Közepes | Változó (lehet olcsóbb is) |
| Választék | Korlátozott | Nagyon széles |

### Melyik modellt válasszam?

- **Prototípus/teszt**: GPT-3.5 Turbo vagy Claude 3 Haiku (olcsó)
- **Produkció (magyar)**: GPT-4 Turbo vagy Claude 3 Sonnet (jó magyar support)
- **Költség-optimalizált**: Llama 3 70B vagy Claude 3 Haiku
- **Legjobb minőség**: Claude 3 Opus vagy GPT-4

### Működik offline?

Nem, minden model online API hívást igényel. De van **fallback mechanizmus**: ha API nem elérhető, a rendszer automatikusan visszavált rule-based parsing-ra.

### Milyen gyorsan működnek?

- GPT-3.5: ~3-5 másodperc / dokumentum
- GPT-4: ~8-12 másodperc / dokumentum
- Claude 3 Haiku: ~2-4 másodperc / dokumentum
- Claude 3 Opus: ~10-15 másodperc / dokumentum

---

## 🛠️ HIBAELHÁRÍTÁS

### "No OpenRouter API key configured"

Megoldás:
```bash
# .env fájlba add hozzá:
OPENROUTER_API_KEY=sk-or-v1-your-key
```

### "Model list üres"

Ellenőrizd:
1. Server fut? `npm run server`
2. `/api/ai/models` endpoint elérhető? `curl localhost:5000/api/ai/models`

### "Authentication failed"

Az API kulcs érvénytelen. Ellenőrizd:
- OpenAI kulcs: `sk-` kezdődik
- OpenRouter kulcs: `sk-or-v1-` kezdődik

---

## 📚 TOVÁBBI FORRÁSOK

- **OpenRouter dokumentáció**: https://openrouter.ai/docs
- **Model árak**: https://openrouter.ai/models
- **OpenAI árazás**: https://openai.com/pricing
- **Claude árazás**: https://anthropic.com/pricing

---

## ✅ ÖSSZEFOGLALÁS

✅ OpenRouter support hozzáadva  
✅ 100+ model elérhető  
✅ Felületi model selector  
✅ Költség monitoring  
✅ Multi-provider architektúra  
✅ Backward compatible (OpenAI továbbra is működik)  
✅ Automatikus fallback rule-based parsing-ra  

**Következő lépés**: Konfiguráld az OpenRouter API kulcsot és kezdd el használni a legolcsóbb modelleket! 🚀

---

**Verzió**: 1.0.0  
**Dátum**: 2025-10-28  
**Status**: ✅ Production Ready

