# Microservices FÁZIS 4 – ML Integráció & Agentikus Workflow

**Befejezés dátuma**: 2025-10-30  
**Átfutási idő**: ~1 nap (teljes implementáció)  
**Státusz**: ✅ **FÁZIS 4 KÉSZ**

---

## 🎯 Fázis Céljai

1. **Model Provider réteg** – Anthropic + OpenRouter provider absztrakció  
2. **NLP Pipeline integráció** – spaCy, NLTK, Sentence Transformers  
3. **Agent rendszer** – ML-alapú `TicketAgent`, `DocumentAgent`  
4. **Workflow orchestration** – LangGraph alapú `BAWorkflow`  
5. **Monitoring integráció** – Workflow telemetry MonitoringService-be  

Minden fenti pont 100%-ban teljesítve.

---

## 🔌 Model Provider Layer (FÁZIS 4.1)

### Új Absztrakció: `ModelProvider`
- Egységes interfész (`inference`, `list_models`, `health_check`)
- API kulcs kezelés, hibastatisztika, uptime követés
- Modell validáció & metainformáció lekérés

### `AnthropicProvider`
- Claude 3.5 Sonnet / Haiku / Opus modellek  
- HTTP alapú API hívások (async, kivételkezelés)  
- Token használati statisztika + pricing információ  
- Health check minimális inferencia kéréssel

### `OpenRouterProvider`
- Dinamikus modell lista API-ból (cache 1 órára)  
- Fallback listák API hiba esetén  
- Auto (best model) támogatás  
- Kiterjesztett metadata: context window, pricing, ajánlottság

---

## 🧠 NLP Pipeline (FÁZIS 4.2)

### `StakeholderNLPPipeline`
- **NERPipeline** (spaCy) – entitás extrakció (fallback blank modellre)  
- **SentimentAnalyzer** (NLTK VADER) – polaritás pontszámok  
- **EmbeddingGenerator** (Sentence Transformers) – vektor reprezentáció  
- Eredmények JSON szerializáció, profilba ágyazás (`profile['nlp']`)

### StakeholderService Integráció
- Minden profil NLP bővítést kap (sentiment, entities, embedding)  
- Hibák gracefully (`profile['nlp']['error']`), fallback rule-based  
- Profil enriched adatok: `power`, `interest`, `communicationPlan`, `nlp`

---

## 🤖 Agent System (FÁZIS 4.3)

### `BaseAgent`
- Prompt összeállítás (context builder)  
- Model provider hívás wrapper  
- Output validáció absztrakt metódussal  
- Execution history, statisztika, health check

### `TicketAgent`
- Rule-based grounding + LLM refinement hibrid  
- Validáció JSON ellenőrzéssel (priority/type/AC)  
- Batch feldolgozás statisztikákkal  
- `GroundingService` integráció (confidence threshold, fallback)

### `DocumentAgent`
- Dokumentum összegzés JSON struktúrában (summary, risks, recommendations)  
- JSON parse fallback (plain text summary)  
- Rövid dokumentum fallback + hiba mezők  
- Alacsony hőfok, `claude-3-5-haiku` alapmodell

---

## 🕸 LangGraph Workflow (FÁZIS 4.4)

### `BAWorkflow`
- **Node-ok**: `refine_tickets`, `analyze_documents`, `compliance`, `finalize`  
- **Feltételes ág**: dokumentum analízis csak ha van dokumentum + agent  
- **Monitoring**: session tracking + completion payload  
- **Kimenet**: refined tickets, dokumentum insightok, compliance riport, metrikák

### Folyamat
```
START
  ↓
refine_tickets  --(ha van dokumentum)-->  analyze_documents
  ↓                                       ↘ skip
compliance
  ↓
finalize
  ↓
END
```

### Compliance Integráció
- Jegyek értékelése PMI/BABOK szerint  
- Össz pontszám & státusz meghatározás  
- Gaps & recommendations visszaadás  
- Hibák gyűjtése workflow szinten (`errors[]`)

---

## 📦 Új / Módosított Fájlok

- `models/providers/base.py` – ModelProvider absztrakció  
- `models/providers/anthropic_provider.py` – Claude provider  
- `models/providers/openrouter_provider.py` – OpenRouter provider  
- `services/nlp_pipeline.py` – spaCy/NLTK/ST pipeline  
- `services/stakeholder_service.py` – NLP integráció  
- `models/agents/base_agent.py` – agent alap  
- `models/agents/ticket_agent.py` – ticket refinement  
- `models/agents/document_agent.py` – dokumentum összegzés  
- `models/workflow.py` – LangGraph orchestráció  
- `requirements.txt` – új ML/NLP dependenciák `langgraph`, `spacy`, `nltk`, `sentence-transformers`

---

## ⚙️ Működési Jellemzők

- **Hybrid ticket feldolgozás**: Rule-based (grounding) → LLM refinement fallback  
- **Dokumentum pipeline**: LLM summarization + risk recommendation  
- **Telemetry**: MonitoringService integráció (ticketsEvaluated, averageScore, documentsAnalyzed)  
- **Sentiment & Embedding**: Stakeholder profilokban NLP metaadat  
- **Workflow**: LangGraph async orchestration, modular node-ok

---

## 🧪 Tesztelési javaslatok

```bash
# Provider health check (Anthropic)
python - <<'PY'
import asyncio
from models.providers.anthropic_provider import AnthropicProvider

async def main():
    provider = AnthropicProvider(api_key="...")
    print(await provider.health_check())

asyncio.run(main())
PY

# Workflow futtatás
python - <<'PY'
import asyncio
from models.workflow import BAWorkflow
from models.agents.ticket_agent import TicketAgent
from services.grounding_service import GroundingService
from services.compliance_service import ComplianceService

async def main():
    ticket_agent = TicketAgent(provider=...)  # Provide ModelProvider
    workflow = BAWorkflow(
        ticket_agent=ticket_agent,
        compliance_service=ComplianceService(),
    )
    result = await workflow.run([{"summary": "Test", "priority": "High"}])
    print(result["result"]["tickets"])

asyncio.run(main())
PY
```

### Függőségek telepítése
```
pip install -r requirements.txt
python -m spacy download en_core_web_sm
python -m nltk.downloader vader_lexicon
```

---

## 🚨 Megjegyzések & Kockázatok

- **NLP Model download**: spaCy modell (50MB+) és VADER lexikon letöltése szükséges  
- **Sentence Transformers**: első betöltés lassú lehet (cache javasolt)  
- **Cyclomatic complexity warnings**: meglévő StakeholderService/Workflow metódusokban – jövőbeli refaktor  
- **API kulcsok**: `ANTHROPIC_API_KEY`, `OPENROUTER_API_KEY` kötelező  
- **LangGraph**: Async futtatás, Python 3.10+ javasolt

---

## 📈 Project Haladás

```
FÁZIS 1: Docker + Nginx + RabbitMQ      ✅
FÁZIS 2: Python Services                ✅
FÁZIS 3: API Endpoints                  ✅
FÁZIS 4: ML Integráció & Agent Workflow ✅
FÁZIS 5: Frontend + Monitoring          ⏳ pending
FÁZIS 6: Haladó ML / Cutover             ⏳ pending
```

**Teljes projektkészültség**: ~60% (4/6 fázis)

---

## ✅ Összegzés

- ModelProvider réteg (Anthropic + OpenRouter)  
- NLP pipeline (NER, sentiment, embedding)  
- TicketAgent & DocumentAgent integráció  
- LangGraph workflow → Monitoring telemetry  
- Dokumentáció + TPU ready  

**FÁZIS 4 teljesítve – készen áll a FÁZIS 5 (Frontend & Monitoring bővítés) elindítására.**
