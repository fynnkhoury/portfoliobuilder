# Portfolio Crash Test

Een webapplicatie waarmee je een beleggingsportefeuille samenstelt en ziet wat die in het verleden opleverde, hoe hard hij viel en wat er in de toekomst zou kunnen gebeuren. Alle uitleg is in gewone Nederlandse taal.

De app is volledig statisch. Er is geen server of database nodig. Alle berekeningen gebeuren in de browser van de bezoeker, en een gekozen portefeuille wordt alleen in die browser bewaard.

## Bestanden

| Bestand | Inhoud |
|---|---|
| `index.html` | De pagina |
| `css/style.css` | Vormgeving |
| `js/data.js` | Maandrendementen en wisselkoersen, 1970 tot en met oktober 2026 |
| `js/engine.js` | Berekeningen: rendement, crashes, inleg en toekomstsimulatie |
| `js/assets.js` | Teksten, grootste namen, voorbeeldportefeuilles en begrippen |
| `js/app.js` | Interactie en grafieken |
| `manifest.webmanifest`, `sw.js`, `icons/` | Installeren op telefoon en offline gebruik |

## Lokaal bekijken

```
python3 -m http.server 8000
```

Open daarna http://localhost:8000.

## Publiceren met GitHub Pages

Ga in de repository naar Settings, dan Pages. Kies bij Source "Deploy from a branch", kies `main` en `/ (root)` en sla op.

## Tekst aanpassen

Teksten over beleggingen en de grootste namen staan in `js/assets.js`. Verhoog na een wijziging `CACHE` in `sw.js` naar bijvoorbeeld `crash-test-v2`, zodat bezoekers de nieuwe versie krijgen.

## Bronnen en beperkingen

- [financial_datasets](https://github.com/mwilczynska/financial_datasets): lange reeksen
- [sp500-data](https://github.com/Johnbrick123/sp500-data): fonds- en aandeelkoersen met dividend
- [exchange-rates](https://github.com/datasets/exchange-rates): wisselkoersen
- [Digrin](https://www.digrin.com/): Pershing Square, China, India en Europa
- [StockAnalysis](https://stockanalysis.com/): grootste namen per fonds

De cijfers worden niet automatisch bijgewerkt. Controleer de gebruiksvoorwaarden van deze bronnen voordat je de app commercieel inzet.

Deze app legt uit en geeft geen beleggingsadvies. Beleggen brengt risico met zich mee.
