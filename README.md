# SOL-Noten (MVP, Version 0.1)

Notenverwaltung zum selbstorganisierten Lernen (SOL) als Progressive Web App (PWA).
Basierend auf der Excel-Notenverwaltung V8.0 von Andreas Vandelaar.

## Was das MVP kann

- **Schuljahre und Kurse verwalten** – ein Kurs ist eine Klasse in einem Fach; die Schülerliste gehört zur Klasse und wird zwischen den Kursen geteilt.
- **Einrichtung mit Ferienabruf** – Bundesland wählen, erster Schultag, Quartale (je 10 Schulwochen ohne Ferien) werden automatisch berechnet (OpenHolidays-API). Quartalszeiträume sind je Kurs anpassbar; nach Quartalsende schlägt die App den Wechsel vor.
- **SoLei-Erfassung im Unterricht** (Herzstück):
  - Kriterium-Modus (ein Kriterium, alle Schüler/innen) und Schüler-Modus (eine Person, alle fünf Kriterien),
  - große Tipp-Buttons mit den Stufen Maximum / ⅔ / ⅓ / 0,
  - jede Vergabe wird mit Datum gespeichert, Rückgängig-Funktion, nachträglich änderbar,
  - pro Kriterium und Tag gilt der letzte Tipp (erneutes Tippen korrigiert, gleicher Wert entfernt die Vergabe),
  - live sichtbar: Kriteriendurchschnitte (auf 1 Nachkommastelle gerundet), Punktesumme (Summe der gerundeten Durchschnitte, selbst ungerundet) und aktuelle Note nach dem 15-Punkte-Bewertungsspiegel (11,9 Punkte → Note 2; 1,75 erst ab vollen 12 Punkten).
- **Maximalpunkte je Kriterium und Quartal** – wählbar aus 1,5 / 3 / 4,5 / 6, Summe muss 15 ergeben (Live-Prüfung).
- **Punkteprotokoll je Schüler/in** – jede Einzelvergabe einsehen, ändern, löschen.
- **Schülerliste** – manuell pflegen oder per Kopieren & Einfügen aus Excel übernehmen (Nachname, Vorname, Telefon, E-Mail, Betrieb, Ausbilder/Eltern mit Telefon und E-Mail).
- **Datensicherung** – alles bleibt lokal (IndexedDB). Backup-Datei speichern/einspielen, Erinnerung nach 7 Tagen, automatisches Backup in einen freigegebenen Ordner (Chrome/Edge am Computer und Android), interne tägliche Sicherungsstände der letzten 14 Tage gegen Fehlbedienung.
- **Einstellungen** – Kriteriennamen (global), Bewertungsspiegel (15-Punkte-Schema, Standardwerte aus der Excel-Datei).

Noch nicht enthalten (nächste Ausbaustufen): Portfolionoten/Quartalsabschluss, Open Book Tests mit Moodle-/Logineo-Import, Klausuren, Notenübersicht mit PDF-/Excel-Export, Notenausdruck je Schüler/in.

## Veröffentlichen über GitHub Pages

1. Auf https://github.com ein Konto anlegen (falls noch nicht vorhanden).
2. Neues Repository erstellen, z. B. `sol-noten` (öffentlich).
3. Alle Dateien dieses Ordners hochladen: „Add file → Upload files", den kompletten Ordnerinhalt hineinziehen, „Commit changes".
4. Im Repository: „Settings → Pages → Branch: main / (root) → Save".
5. Nach 1–2 Minuten ist die App unter `https://IHR-NAME.github.io/sol-noten/` erreichbar.

Lehrkräfte öffnen diese Adresse und installieren die App:
- **iPad/iPhone:** Teilen-Symbol → „Zum Home-Bildschirm".
- **Android:** Menü → „App installieren".
- **Computer (Chrome/Edge):** Installations-Symbol in der Adressleiste.

Nach der Installation läuft die App vollständig offline. Ein späterer Umzug auf eine eigene Domain ist problemlos möglich – die Daten liegen auf den Geräten der Lehrkräfte; sie nehmen sie per Backup-Datei mit.

## Lokal testen

Im Ordner ein kleines Webserver-Programm starten, z. B.:

```
python3 -m http.server 8000
```

Dann im Browser `http://localhost:8000` öffnen. (Direktes Öffnen der index.html per Doppelklick funktioniert nicht, da Service Worker einen Webserver benötigen.)

## Hinweis bei Updates

Bei jeder neuen Version die Versionsnummer in `sw.js` (Zeile `var CACHE = 'sol-noten-v…'`) erhöhen, damit installierte Apps die neuen Dateien laden.

## Datenschutz

Es gibt keinen Server und kein Konto. Sämtliche Noten und Schülerdaten bleiben ausschließlich auf dem Gerät. Die einzige Internetverbindung ist der einmalige Abruf der Schulferientermine (openholidaysapi.org) beim Anlegen eines Schuljahres – dabei werden keine personenbezogenen Daten übertragen.

---
© 2026 Andreas Vandelaar · Weitergabe und Anpassung unter Namensnennung gestattet.
