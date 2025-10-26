# Demo Scenarios - Excel Fájlok

Ez a dokumentum ismerteti a három demo Excel fájlt, amelyek különböző komplexitású bemutató forgatókönyvekhez készültek.

## 📁 Fájlok Áttekintése

### 1. `demo_simple.xlsx` - Egyszerű Demo (3 ticket)
**Felhasználás:** Gyors bemutatáshoz, alapvető funkciók ismertetéséhez

**Tartalom:**
- ✅ 3 egyszerű user story
- ✅ Kevés acceptance criteria (2-3 per ticket)
- ✅ Alapvető prioritások: Közepes, Magas, Alacsony
- ✅ Rövid, egyértelmű követelmények

**Ticketek:**
1. Felhasználói profil megtekintése
2. Jelszó módosítása
3. Dashboard megjelenítése

**Demo idő:** ~2-3 perc
**Feldolgozási idő:** ~35 másodperc

---

### 2. `demo_normal.xlsx` - Normál Demo (5 ticket)
**Felhasználás:** Standard bemutató, részletes funkció ismertetéshez

**Tartalom:**
- ✅ 5 közepes komplexitású user story
- ✅ MVM energiaipar specifikus példák
- ✅ 4-5 acceptance criteria per ticket
- ✅ Változatos prioritások (Kritikus, Magas, Közepes, Alacsony)
- ✅ AI és intelligens funkciók bemutatása

**Ticketek:**
1. Energiafogyasztás riport generálása
2. Intelligens energia takarékossági javaslatok
3. Számla előrejelzés következő hónapra
4. Valós idejű energiafogyasztás monitorozása
5. Fogyasztási adatok exportálása JSON API-n keresztül

**Demo idő:** ~5-7 perc
**Feldolgozási idő:** ~35 másodperc

---

### 3. `demo_complex.xlsx` - Komplex Demo (10 ticket)
**Felhasználás:** Részletes, technikai bemutatóhoz, döntéshozóknak

**Tartalom:**
- ✅ 10 komplex user story
- ✅ Részletes, enterprise-szintű követelmények
- ✅ 6-8 acceptance criteria per ticket
- ✅ Vegyes prioritások
- ✅ Technikai részletek (ML, IoT, mikroszervizek, RBAC, stb.)
- ✅ Compliance és regulatory követelmények

**Ticketek:**
1. Komplex energiafogyasztási dashboard többszintű szűrőkkel
2. Gépi tanulás alapú anomália detektálás
3. Többfelhasználós szerepkör-alapú hozzáférés (RBAC)
4. Prediktív analitika és optimalizációs javaslatok
5. Integrált számlázási rendszer automatikus generálással
6. Haladó riportolási modul custom metrikákkal
7. Mobile app fejlesztés iOS és Android platformra
8. IoT szenzorok integrációja és edge computing
9. Compliance és regulatory riportok (EU szabványok)
10. Fejlett API gateway és mikroszerviz architektúra

**Demo idő:** ~10-15 perc
**Feldolgozási idő:** ~35 másodperc

---

## 🎯 Demo Forgatókönyvek

### Gyors Demo (5 perc)
- Használd: `demo_simple.xlsx`
- Fókusz: Alapvető workflow bemutatása
- Célközönség: Gyors overview-t igénylő vezetők

### Standard Demo (10 perc)
- Használd: `demo_normal.xlsx`
- Fókusz: MVM-specifikus use case-ek, AI képességek
- Célközönség: Business Analyst team, middle management

### Részletes Demo (15-20 perc)
- Használd: `demo_complex.xlsx`
- Fókusz: Enterprise architektúra, technikai mélység, compliance
- Célközönség: C-level, IT vezetők, technikai döntéshozók

---

## 📊 Összehasonlító Táblázat

| Szempont | Simple | Normal | Complex |
|----------|--------|--------|---------|
| **Ticketek száma** | 3 | 5 | 10 |
| **Avg. acceptance criteria** | 2-3 | 4-5 | 6-8 |
| **Komplexitás** | Alacsony | Közepes | Magas |
| **Demo idő** | 2-3 perc | 5-7 perc | 10-15 perc |
| **Feldolgozási idő** | ~35 mp | ~35 mp | ~35 mp |
| **Manuális idő (becslés)** | 27 perc | 45 perc | 90 perc |
| **Időmegtakarítás** | 98% | 93% | 99% |

---

## 🚀 Használati Útmutató

### 1. Fájl Kiválasztása
Válaszd ki a demo fájlt a célközönség és rendelkezésre álló idő alapján.

### 2. Feltöltés
- Nyisd meg az alkalmazást
- Drag & drop vagy Browse funkcióval töltsd fel a kiválasztott Excel fájlt

### 3. Feldolgozás
- Kattints az "Excel Feldolgozása" gombra
- Várd meg a progress bar kitöltődését (~3 másodperc animáció)

### 4. Eredmények Megtekintése
- Nézd meg a generált Jira ticketeket
- Mutasd be a részletes információkat (summary, description, acceptance criteria)

### 5. Jira-ba Küldés
- Kattints a "Jira-ba Küldés" gombra
- Erősítsd meg a modalban
- Mutasd be a sikeres létrehozást

### 6. Hatékonyság Bemutatása
- Görgess le a Before/After comparison card-hoz
- Emeld ki a 93% időmegtakarítást
- Hangsúlyozd az AI automatizálás előnyeit

---

## 💡 Demo Tippek

### Egyszerű Demo
- Gyors, dinamikus bemutatás
- Fókuszálj a user experience-re
- Minimális technikai részlet

### Normál Demo
- MVM-specifikus példák hangsúlyozása
- AI képességek bemutatása
- Energia iparági kontextus

### Komplex Demo
- Részletes technikai magyarázatok
- Enterprise architektúra előnyök
- Compliance és biztonság hangsúlyozása
- Skálázhatóság és integráció bemutatása

---

## 📝 Excel Struktúra

Minden Excel fájl az alábbi oszlopokat tartalmazza:

| Oszlop Név | Leírás | Kötelező |
|------------|--------|----------|
| **User Story** | A ticket címe és leírása | ✅ Igen |
| **Prioritás** | Kritikus / Magas / Közepes / Alacsony | ❌ Nem |
| **Hozzárendelt** | A ticket felelőse | ❌ Nem |
| **Epic** | Az epic neve | ❌ Nem |
| **Elfogadási Kritériumok** | Soronként vagy `\n`-el elválasztva | ❌ Nem |

---

## 🔧 Troubleshooting

**Probléma:** Excel fájl nem töltődik fel
- **Megoldás:** Győződj meg róla, hogy .xlsx formátumú a fájl

**Probléma:** Üres ticketek generálódnak
- **Megoldás:** Ellenőrizd, hogy a "User Story" oszlop tartalmaz-e adatokat

**Probléma:** Acceptance criteria nem jelenik meg
- **Megoldás:** Győződj meg róla, hogy az oszlop neve tartalmazza az "Elfogadási Kritériumok" vagy "Acceptance Criteria" szöveget

---

## 📞 Support

Ha kérdésed van a demo fájlokkal kapcsolatban, keresd a fejlesztői csapatot.

**Verzió:** 1.0  
**Utolsó frissítés:** 2025. október 12.

