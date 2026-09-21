# 🍲 Essensplaner

Eine kleine, selbst gehostete App: Den Wochenplan stellst du per Drag & Drop zusammen, die Einkaufsliste entsteht von allein. Installation, Glance und Entwicklerhinweise stehen in der `README.md` des Repositories (auf Englisch).

## Aufbau

Der Bildschirm hat drei Spalten. Auf dem Handy werden daraus die Tabs **Rezepte / Plan / Einkauf** am unteren Rand.

| Spalte | Wozu |
|---|---|
| **Links – Rezepte** | Alle Rezepte. Die Suche berücksichtigt Rezeptnamen, Tags und Zutaten („Hähnchen“ findet alles mit Hähnchen). **Filter** klappt die Kategorie- und Tag-Chips auf und zu; im zugeklappten Zustand zeigt der Button den aktiven Filter. |
| **Mitte – Wochenplan** | 7 Tage × Frühstück/Mittag/Abend. Hierhin kommen die Rezepte. |
| **Rechts – Einkauf** | Die Zutaten aller geplanten Gerichte, auf deine Portionen umgerechnet und nach Abteilungen sortiert. |

Über das Sprachmenü in der Kopfzeile stellst du alles zwischen Türkçe, English und Deutsch um: Oberfläche, diese Anleitung, Rezeptnamen, Zutaten, Zubereitung und Einkaufsliste. Die mitgelieferten Rezepte sind in alle drei Sprachen übersetzt. Ein selbst angelegtes Rezept erscheint in Sprachen ohne Übersetzung so, wie du es eingegeben hast.

## Planen

- **Gericht hinzufügen:** Ziehe ein Rezept von links auf das Frühstücks-, Mittags- oder Abendfeld eines Tages. Ein Feld kann mehrere Gerichte enthalten (z. B. Suppe + Hauptgericht).
- **Auf dem Handy:** Tippe auf das **+** einer Mahlzeit und wähle aus der Rezeptliste; es landet direkt dort. Oder: Rezept antippen, Tag und Mahlzeit wählen, dann **Zum Plan hinzufügen**. (Gedrückt halten und ziehen funktioniert auch.)
- **Verschieben:** Ein geplantes Gericht in ein anderes Feld ziehen.
- **Portionen:** Mit **− / +** unter dem Gericht legst du fest, für wie viele Personen gekocht wird. Die Einkaufsliste passt sich sofort an. Unter 1 geht es auf eine halbe Portion.
- **Entfernen:** Das **×** rechts am Gericht.
- **🔒 Nur ansehen:** Die Schlosstaste in der Kopfzeile sperrt den Plan: Ziehen ist aus, die Tasten − / + / × / + sind ausgeblendet. So verrutscht beim Scrollen am Telefon kein Gericht mehr; ein Tippen schaltet um, die Wahl wird gemerkt. Rezepte ansehen und die Einkaufsliste abhaken geht weiterhin.
- **Rezept ansehen:** Auf den Namen klicken – Zutaten, Zubereitung und Nährwerte pro Portion erscheinen. Das − / + in diesem Fenster skaliert nur die dort angezeigten Mengen, nicht den Plan.
- **Tagessumme:** Die Zeile `kcal · g P` unter dem Tagesnamen zeigt, was eine Person mit je einer Portion aller Gerichte des Tages bekommt (unabhängig von der eingestellten Portionenzahl).

## Wochen

- Mit **‹ ›** wechselst du die Woche; **Zurück zu dieser Woche** springt zu heute. Die heutige Zeile ist farbig markiert.
- Jede Woche wird automatisch gespeichert – es gibt keinen Speichern-Knopf.
- **Gespeicherte Wochen** listet frühere Wochen mit Gerichten auf.
- In einer leeren Woche übernimmt **Aus Woche kopieren…** den kompletten Plan einer früheren Woche.
- **Leeren** löscht den Plan dieser Woche.

## Einkaufsliste

- **Abteilung / Gericht / Tag** gruppieren die Liste auf drei Arten:
  - *Abteilung* – der Weg durch den Laden: Obst & Gemüse, Milchprodukte, Gewürze… Jede Zutat einmal, mit der Wochenmenge.
  - *Gericht* – jedes Gericht mit seinen Zutaten unter eigener Überschrift; darunter steht, wann es gekocht wird.
  - *Tag* – Montag bis Sonntag der Reihe nach, mit dem, was an dem Tag gebraucht wird.
  - In der Gericht- und Tagesansicht ist die Menge der Anteil dieser Gruppe: 500 g Heidelbeeren pro Woche stehen am Montag mit 250 g und am Donnerstag mit 250 g.
  - **Alle drei sind derselbe Einkauf, Häkchen ziehen mengenweise ab.** Eine Zeile abzuhaken legt den Anteil der Mahlzeiten, die sie abdeckt, in den Korb. In der Abteilungsansicht abgehakt, ist die Zutat an jedem Tag und in jedem Gericht abgehakt. Umgekehrt ebenso: Hakt man von 1 kg Tomaten der Woche die 260 g vom Dienstag ab, zeigt die Abteilungszeile den Rest — ~~1 kg~~ **740 g** — mit halb gefülltem Kästchen. Noch einmal tippen, und der Rest gilt als gekauft.
  - Die gewählte Gruppierung wird gemerkt, das PDF folgt ihr.
- Kommt eine Zutat in mehreren Rezepten vor, wird sie (in der Abteilungsansicht) zu einer Zeile zusammengefasst. Gramm/Kilo und ml/Liter werden umgerechnet; nicht umrechenbare Einheiten stehen nebeneinander (`30 g + 2 EL`).
- Zutaten ohne Menge („nach Geschmack“) erscheinen nur mit Namen.
- **Kästchen:** Beim Einkaufen abhaken. Der Zähler oben zeigt den Fortschritt.
- **⋯-Menü:**
  - *Habe ich zu Hause* – entfernt die Zutat nur für diese Woche; sie landet im Bereich „Zu Hause vorhanden“ und lässt sich zurückholen.
  - *Als Grundzutat markieren* – für Dinge, die immer da sind (Salz, Öl, Gewürze). Grundzutaten sind jede Woche ausgeblendet; **Grundzutaten anzeigen** unten blendet sie ein.
  - *Abteilung* – Zutat in die richtige Abteilung verschieben; das gilt dauerhaft.
- **Extras:** Dinge, die nichts mit Essen zu tun haben (Servietten, Waschmittel…), trägst du unten ein.

## Rezepte anlegen und bearbeiten

- **+ Neu** legt ein Rezept an; ein Rezept öffnen und **Bearbeiten** wählen, um es zu ändern.
- Das Feld **Portionen** ist wichtig: Darauf basiert jede Umrechnung.
- Nährwerte (kcal, Protein, Kohlenhydrate, Fett) gelten pro Portion und sind optional.
- Bleibt die Menge einer Zutat leer, gilt sie als „nach Geschmack“ und wird nicht skaliert.
- Wähle Zutatennamen möglichst aus den Vorschlägen: Zwei Schreibweisen ergeben zwei Zeilen in der Einkaufsliste.
- **Sprachen:** Das Formular bearbeitet den Text der gerade gewählten Sprache. Für die türkische Fassung eines Rezepts auf Türkçe umstellen und das Rezept bearbeiten; die anderen Sprachen bleiben unverändert. Mengen, Einheiten und Nährwerte gelten für alle Sprachen. Eine Zutat wird demselben Eintrag zugeordnet, egal in welcher Sprache du sie eingibst.
- Wird ein Rezept gelöscht, verschwindet es auch aus allen Plänen.

## Profile

Das Profil wählst du oben rechts; mit **⚙** lassen sich Profile anlegen, umbenennen, einfärben oder löschen.

- **Rezepte teilen sich alle.**
- **Plan und Einkaufsliste gehören zum Profil.** Wer gemeinsam plant, nutzt dasselbe gemeinsame Profil; für einen eigenen Plan legst du ein eigenes Profil an.
- Es gibt keine Passwörter; die App sollte nur aus einem vertrauenswürdigen Netz (z. B. Tailscale) erreichbar sein.
- Schauen zwei Personen auf dasselbe Profil, kommen Änderungen innerhalb von 15 Sekunden auf der anderen Seite an.

## PDF

**PDF / Drucken** erstellt eine A4-Seite mit Wochenplan und Einkaufsliste; im Druckdialog „Als PDF speichern“ wählen. Grundzutaten und „zu Hause vorhandene“ Zutaten werden ausgelassen. Die Einkaufsliste wird so gedruckt, wie sie am Bildschirm gruppiert ist (Abteilung / Gericht / Tag).

Am Telefon druckt die Schaltfläche nicht direkt, sondern **öffnet eine Vorschauseite in einem neuen Tab**; gespeichert wird über **PDF / Drucken** oben auf dieser Seite. Grund ist iOS: Eine vom Home-Bildschirm gestartete Web-App bekommt keinen Druckdialog. Wer die App über das Home-Symbol öffnet, findet auf der Vorschauseite die Adresse — diese in **Safari** öffnen, dort funktioniert **Teilen ⬆︎ → Drucken**.
