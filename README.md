# P1 Parking — Betaalautomaat Prototype

Klikbaar lo-fi prototype van de herontworpen hardware-interface voor de betaalautomaten van P1 Parking Almere. Gebouwd als onderdeel van een CMD afstudeeropdracht.

**Student:** Fayaaz Nabie  
**Opdrachtgever:** P1 Parking, Almere  
**Opleiding:** Communication & Multimedia Design  

---

## Demo

Open `https://fayaaz-n.github.io/Afstuderen/` in je browser. Geen installatie of server nodig.

---

## Wat is dit?

P1 Parking beheert meerdere parkeergarages in Almere vanuit één centrale meldkamer. Bezoekers die vastlopen bij een betaalautomaat, deurlezer of slagboom bellen aan bij de intercom — gemiddeld 338 keer per dagdeel. 88% van die gesprekken is hardware-gerelateerd.

Dit prototype laat zien hoe de schermen op de betaalautomaat anders kunnen werken: duidelijke foutmeldingen in gewone taal, kentekeninvoer als alternatief voor een kwijtgeraakt ticket, visuele begeleiding per stap, en een wachtrij-indicator bij de intercom.

---

## Flows

| Flow | Beschrijving |
|------|-------------|
| **Normaal** | Ticket invoeren via kaartmondje of barcode scanner → bedrag zien → pin of contant betalen → klaar |
| **Contant** | Munten en biljetten invoeren → bedrag telt op → wisselgeld uitbetaald |
| **Ticket kwijt / beschadigd** | Foutmelding in gewone taal → kenteken invoeren via touchscreen keyboard → systeem zoekt auto op → gewone betaalflow |
| **Buiten bedrijf** | Kaartmondje geblokkeerd → melding bij start → barcode scanner als alternatief → verwijzing andere automaat |

---

## Admin Panel

Het admin panel links laat je de staat van de automaat instellen. De flow past zich daar automatisch op aan.

| Instelling | Effect |
|-----------|--------|
| Kaartmondje geblokkeerd | Bij start meteen foutmelding, kaartmondje en barcode scanner knipperen rood |
| Muntenverwerker defect | Contant betalen is uitgrijs, melding bij aantikken |
| Briefgeld gleuf geblokkeerd | €5/€10/€20 knoppen uitgrijs, flash-melding bij aantikken |
| Gepast betalen vereist | Waarschuwing vóór contant invoeren, wisselgeld uitvoer op rood |
| Barcode scanner defect | Scanner slot op fout, optie is uitgrijs in ticketkeuze |
| Ticket beschadigd / kwijt | Bij ticket invoeren direct foutmelding + kenteken route |
| Parkeerduur & bedrag | Simuleer verschillende bedragen |
| Kenteken registraties | Voeg kentekens toe die het systeem herkent |
| Wachtrij instellen | 0–3 personen voor de bezoeker bij de intercom |

---

## Projectstructuur

```
prototype/
├── index.html    # Structuur en markup
├── style.css     # Alle stijlen (BEM classnames, CSS custom properties)
└── app.js        # State, flows en DOM updates
```

---

## Techniek

- Puur HTML, CSS en JavaScript — geen frameworks, geen build stap
- CSS custom properties voor kleuren en afmetingen
- BEM-achtige classnames (`.slot`, `.slot--active`, `.slot--blink`)
- State in één object, functies per scherm (`showIdle`, `showBetaalkeuze`, `showPin`, etc.)

---

## Status

Dit is een **lo-fi prototype**. De volgende stap is usability testing (Thinking Aloud) met echte gebruikers, gevolgd door een hi-fi uitwerking in Figma.

| Fase | Status |
|------|--------|
| Lo-fi wireframes betaalautomaat | ✅ Klaar |
| Klikbaar prototype betaalautomaat | ✅ Klaar |
| Lo-fi wireframes deurlezer & slagbomen | 🔲 Nog te doen |
| Usability testing ronde 1 | 🔲 Nog te doen |
| Hi-fi in Figma | 🔲 Nog te doen |
| Usability testing ronde 2 | 🔲 Nog te doen |

---

## Onderzoekscontext

Het prototype is gebouwd op basis van:

- **Fly on the Wall** — 338 gesprekken geobserveerd in één dagdeel bij de P1 meldkamer
- **Heuristic Evaluation** — Entervo-systeem getoetst aan de 10 heuristieken van Nielsen; 5 van de 10 scoren Hoog
- **Survey** — 6 garagesbezoekers bevraagd over knelpunten in het parkeerproces
- **Customer Journey** — Zelf de drie meest voorkomende error states nagebootst bij de hardware

Zie de Design Rationale voor de volledige onderbouwing.
