# JULA 2026 – Zelteinteilung Web-App

Statische Mehrseiten-App für die Wunschzeltpartner-Einteilung des CVJM Mössingen Jungscharlagers 2026, gehostet auf GitHub Pages mit Firebase Firestore als Backend.

---

## Zusammenfassung der Entscheidungen

| Thema | Entscheidung |
|---|---|
| Design | Hell, schlicht, CVJM-Rot (`#FF0000`) + Schwarz |
| Logo | CVJM-Dreieck (SVG, inline generiert) |
| Struktur | Mehrere HTML-Seiten |
| Login | Kein Login – nur E-Mail-Adresse als Pflichtfeld |
| Duplikatschutz | Vor + Nachname Kind → eindeutiger Key, Formular sperren bei Doppeleintrag |
| Wunschpartner | 3 optionale Felder (Vor + Nachname), alle sichtbar, leer = "kein Wunsch" |
| Admin-Auth | Firebase Auth (E-Mail + Passwort) |
| Graph | D3.js Force-directed Graph |
| Algorithmus | Greedy (verbundene Komponenten first, dann auffüllen) |
| Zeltgröße | Variable – Admin gibt Zahl beim Generieren an |
| Deployment | GitHub Actions (automatisch auf `gh-pages`) |
| Sprache | Deutsch |
| E-Mail-Bestätigung | Nur Website-Nachricht, keine automatische E-Mail |
| Datenschutz | Hinweis direkt im Formular |
| Impressum | Lagerleitung-Infos + "Soli Deo Gloria" |

---

## Datei-Struktur (GitHub Repository)

```
zelteinteilung/
├── index.html              # Startseite / Formular für Eltern
├── success.html            # Erfolgsseite nach Absenden
├── admin.html              # Admin-Bereich (Login + Dashboard)
├── impressum.html          # Impressum-Seite
├── css/
│   └── style.css           # Globales Stylesheet
├── js/
│   ├── firebase-config.js  # Firebase-Konfiguration (öffentlich, aber gesichert)
│   ├── form.js             # Formular-Logik (Validierung, Duplikatcheck, Absenden)
│   ├── admin.js            # Admin-Login, Datenliste
│   ├── graph.js            # D3.js Graph-Visualisierung
│   ├── algorithm.js        # Greedy-Gruppierungsalgorithmus
│   └── export.js           # XLSX + PNG Export
├── assets/
│   └── cvjm-logo.svg       # CVJM-Logo
├── .github/
│   └── workflows/
│       └── deploy.yml      # GitHub Actions Deployment
└── .gitignore
```

---

## Seiten-Beschreibung

### `index.html` – Eltern-Formular
- Header: CVJM-Logo + "JULA 2026" + "Zelteinteilung Jungs"
- Formular-Felder:
  - E-Mail der Eltern (Pflicht, für Response-Nachricht)
  - Vorname Kind (Pflicht)
  - Nachname Kind (Pflicht)
  - Wunschpartner 1: Vorname + Nachname (optional)
  - Wunschpartner 2: Vorname + Nachname (optional)
  - Wunschpartner 3: Vorname + Nachname (optional)
- Duplikat-Check: Vor Absenden prüfen ob Kind (Vor+Nachname) bereits in Firestore
- Datenschutzhinweis: unter dem Formular
- Footer: "Impressum" + kleiner "Admin"-Button

### `success.html` – Erfolgsseite
- Bestätigungsmeldung nach erfolgreichem Absenden
- Zusammenfassung der eingetragenen Daten

### `admin.html` – Admin-Bereich
- **Tab 1: Login** – E-Mail + Passwort (Firebase Auth)
- **Tab 2: Einträge-Liste** – Tabelle aller Einträge + XLSX-Export
- **Tab 3: Graph** – D3.js Force-directed Graph + PNG-Export
- **Tab 4: Zeltgruppen-Vorschlag** – Eingabe Zeltgröße + Algorithmus-Ergebnis

### `impressum.html` – Impressum
- Lagerleitung JULA 2026: Hannah Hoch, Felix Jauch, Lea Hägele, Tobias Ayen
- Soli Deo Gloria

---

## Firebase-Architektur

### Firestore Datenstruktur
```
/wuensche/{kindId}/
  email:           string  (E-Mail der Eltern)
  vorname:         string  (Vorname des Kindes)
  nachname:        string  (Nachname des Kindes)
  wunsch1_vorname: string | null
  wunsch1_nachname: string | null
  wunsch2_vorname: string | null
  wunsch2_nachname: string | null
  wunsch3_vorname: string | null
  wunsch3_nachname: string | null
  timestamp:       Timestamp
```

`kindId` = `vorname_nachname` (lowercase, normalisiert) → Duplikatschutz

### Firebase Security Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Öffentlich: nur lesen (existiert Eintrag?) + schreiben (neuer Eintrag)
    match /wuensche/{kindId} {
      allow create: if request.auth == null
                    && !exists(/databases/$(database)/documents/wuensche/$(kindId));
      allow read: if request.auth != null;  // nur Admin
      allow update, delete: if request.auth != null;  // nur Admin
    }
  }
}
```

> [!IMPORTANT]
> **Duplikatschutz durch Security Rules:** Durch `!exists(...)` wird serverseitig verhindert, dass ein existierender Eintrag überschrieben wird – auch wenn jemand die Frontend-Validierung umgeht.

> [!WARNING]
> **Firebase-Konfiguration:** Die Firebase-Config (API-Key etc.) wird im Frontend sichtbar sein – das ist bei Firebase normal und sicher, da die Sicherheit durch die **Security Rules** gewährleistet wird, nicht durch den API-Key.

---

## Graph-Algorithmus (D3.js)

- Knoten = Kinder (Kreis mit Name)
- Kanten = Wunschverbindungen (gerichtete Pfeile)
- Gegenseitige Wünsche = dickere/farbige Kante
- Farben = bereits berechnete Zeltgruppen (optional)
- Interaktiv: Nodes verschiebbar (drag & drop)

## Gruppierungsalgorithmus (Greedy)

1. Erstelle ungerichteten Graphen aus allen Wunschverbindungen
2. Finde zusammenhängende Komponenten (Union-Find)
3. Sortiere Komponenten nach Größe (größte zuerst)
4. Wenn Komponente ≤ Zeltgröße: nehme als Gruppe
5. Wenn zu groß: teile auf (bevorzuge starke Verbindungen)
6. Wenn zu klein: fülle mit Kindern ohne Gruppe auf
7. Ausgabe: benannte Zeltgruppen (Zelt 1, Zelt 2, ...)

---

## Sicherheitsmaßnahmen

- **Firestore Security Rules**: Zugriff auf Lesen nur für authentifizierte Admins
- **Firebase Auth**: Admin-Login mit E-Mail + Passwort
- **Rate Limiting**: Nur ein Eintrag pro Kind möglich (serverseitig durch Rules)
- **Input-Validierung**: Frontend + Firestore Rules
- **HTTPS**: GitHub Pages erzwingt HTTPS
- **Keine sensiblen Daten im Code**: Firebase-Config ist öffentlich aber sicher durch Rules

---

## Deployment (GitHub Actions)

```yaml
# .github/workflows/deploy.yml
# Trigger: push auf main branch
# Action: Kopiere alle HTML/CSS/JS-Dateien nach gh-pages Branch
```

---

## Schritt-für-Schritt Anleitung (für dich nach der Implementierung)

1. Firebase-Projekt anlegen (console.firebase.google.com)
2. Firestore aktivieren (im Production-Modus)
3. Firebase Auth aktivieren (E-Mail/Passwort)
4. Admin-Account erstellen (in Firebase Console)
5. Firebase-Config-Werte in `firebase-config.js` eintragen
6. GitHub-Repository erstellen
7. Code pushen → GitHub Actions deployed automatisch
8. GitHub Pages in den Repository-Settings aktivieren
9. Fertig!

---

## Offene Fragen

> [!IMPORTANT]
> **Hast du bereits ein Firebase-Projekt oder ein GitHub-Repository?** Ich werde Platzhalter einbauen, die du dann mit deinen echten Werten ausfüllst.

> [!NOTE]
> **Soll der Admin-Bereich passwortgeschützt über Firebase Auth laufen (empfohlen) oder soll ich auch eine einfachere Methode mit einem festen Passwort implementieren?** Ich empfehle Firebase Auth – du erstellst den Admin-Account einmalig in der Firebase Console.
