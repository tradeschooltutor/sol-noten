# Beiträge zu SOL-Noten

Vielen Dank für Ihr Interesse. SOL-Noten ist ein privates Projekt einer
Lehrkraft; der Code liegt offen, damit er unabhängig auf Sicherheitslücken
geprüft werden kann.

---

## Sicherheitslücken

**Bitte melden Sie Sicherheitslücken nicht über einen öffentlichen Issue.**
Schreiben Sie stattdessen an vandelaar@live.de.

Die App verarbeitet personenbezogene Daten von Schülerinnen und Schülern. Eine
Schwachstelle, die öffentlich bekannt wird, bevor sie behoben ist, gefährdet
Menschen, die sich nicht wehren können.

Hilfreich sind: betroffene Version, Beschreibung des Angriffswegs,
Voraussetzungen (etwa physischer Gerätezugriff), Auswirkung. Ein Nachweis muss
nicht funktionsfähig sein.

Sie erhalten in der Regel innerhalb weniger Tage eine Rückmeldung. Auf Wunsch
werden Sie in der Veröffentlichung genannt; Sie können auch anonym bleiben.
Ein Bug-Bounty-Programm gibt es nicht – das Projekt hat keine Einnahmen.

**Was ausdrücklich erlaubt ist:** die Software auf eigenen Geräten und mit
eigenen Testdaten untersuchen, dekompilieren, verändern, angreifen und die
Ergebnisse veröffentlichen. Sicherheitsforschung ist von der Lizenz gedeckt und
wird nicht behindert – auch nicht durch juristische Schritte, solange keine
echten Schülerdaten Dritter betroffen sind.

---

## Fehler und Verbesserungsvorschläge

Fehlerberichte und Vorschläge sind willkommen – als Issue oder per E-Mail.
Hilfreich sind Gerät, Betriebssystem, Browser, App-Version (steht auf der
Startseite unter „Über diese App") und die Schritte zum Nachvollziehen.

Bitte senden Sie **niemals** echte Schülerdaten mit – auch keine Screenshots
mit Namen. Für Beispiele eignet sich der Demo-Modus (Globale Einstellungen →
Demo-Modus).

---

## Code-Beiträge (Pull Requests)

Bevor Sie Arbeit investieren: Bitte stimmen Sie größere Änderungen vorher per
Issue oder E-Mail ab. Das Projekt hat gewachsene Konventionen (kein Framework,
kein Build-Schritt, datumsgetriebenes Quartalsmodell, feste Layoutregeln), und
es wäre schade um Ihre Zeit, wenn ein Beitrag daran scheitert.

### Rechteeinräumung

Mit dem Einreichen eines Beitrags (Pull Request, Patch, Codevorschlag)
erklären Sie sich mit Folgendem einverstanden:

1. Sie räumen Andreas Vandelaar an Ihrem Beitrag ein **einfaches,
   unentgeltliches, räumlich, zeitlich und inhaltlich unbeschränktes
   Nutzungsrecht** ein, einschließlich des Rechts zur Bearbeitung und zur
   Unterlizenzierung – auch im Rahmen kommerzieller Lizenzen.

2. Ihr **Urheberrecht am eigenen Beitrag bleibt unberührt.** Sie dürfen ihn
   weiterhin selbst verwenden und anderweitig lizenzieren.

3. Sie sichern zu, zur Einräumung dieser Rechte berechtigt zu sein –
   insbesondere, dass der Beitrag von Ihnen stammt und keine Rechte Dritter
   verletzt, und dass Ihr Arbeitgeber oder Dienstherr keine entgegenstehenden
   Rechte geltend machen kann (in Deutschland relevant wegen § 69b UrhG).

4. Haben Sie beim Erstellen KI-Werkzeuge eingesetzt, geben Sie das bitte im
   Pull Request an.

**Warum diese Regelung?** SOL-Noten steht unter der PolyForm Noncommercial
License; kommerzielle Nutzung ist nur mit gesonderter Lizenz möglich. Ohne
Punkt 1 könnte fremder Code nicht in eine solche Lizenz aufgenommen werden –
das Projekt wäre nach dem ersten Beitrag nicht mehr als Ganzes lizenzierbar.
Punkt 2 stellt sicher, dass Sie dafür nichts aufgeben.

**Meldungen von Sicherheitslücken sind keine „Beiträge"** in diesem Sinne und
lösen keinerlei Rechtsübertragung aus.

### Technische Konventionen

- **Kein Framework, kein Build-Schritt.** Vanilla JavaScript (ES5-Stil, `var`,
  keine Transpilation), damit die App direkt aus dem Repository läuft und der
  ausgelieferte Code derselbe ist wie der geprüfte.
- **Kommentare auf Deutsch**, ebenso alle Texte der Oberfläche (Sie-Form).
  Kommentare erklären das *Warum*, nicht das *Was*.
- **Keine neuen Abhängigkeiten** ohne vorherige Absprache. Die App lädt
  bewusst nichts aus dem Netz (Ausnahme: die Ferien-API).
- **Keine Datenübertragung nach außen.** Beiträge, die Daten an einen Server
  senden, Telemetrie einführen oder externe Skripte einbinden, werden nicht
  angenommen.
- **Version und Cache gemeinsam erhöhen:** `APP_VERSION` in `js/app.js` und
  `CACHE` in `sw.js`.
- **Store-Funktionen mit Tests absichern** (Node-Skripte, die die echte
  Funktion aus der Datei laden), nicht nur `node --check`.
- Vor dem Einreichen: `node --check` über alle geänderten Dateien.

### Was voraussichtlich nicht angenommen wird

- Cloud-Anbindung, Konten, Synchronisierung über fremde Server
- Telemetrie, Analyse-Werkzeuge, Werbung
- Abschwächung der Verschlüsselung oder der Löschbestätigungen
- Umstellung auf ein Framework oder einen Build-Prozess
- Reine Formatierungsänderungen über große Dateibereiche

---

## Übersetzungen

Die App ist derzeit einsprachig deutsch und eng an das nordrhein-westfälische
Schulwesen angelehnt. Eine Mehrsprachigkeit ist nicht vorgesehen; sprechen Sie
mich an, bevor Sie damit beginnen.

---

## Kontakt

vandelaar@live.de

Antworten können dauern – das Projekt entsteht neben einer vollen Stelle als
Lehrkraft.
