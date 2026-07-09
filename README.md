# SOL-Noten (Version 0.12.3 – Beta)

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
- **Punkteprotokoll je Schüler/in** – jede Einzelvergabe einsehen, ändern, löschen; Kriteriendurchschnitte mit grün/roter Entwicklungsanzeige gegenüber dem Vorquartal; Notenzeile (SL-Bogen, Portfolio, SoLei).
- **Quartalsabschluss** – Portfolionoten je Schüler/in erfassen (1–6, Komma erlaubt); Note SL-Bogen aus der Punktesumme, Note SoLei = Durchschnitt aus SL-Bogen und Portfolio (ohne Portfolio bleibt sie leer); Punktesummen mit ▲/▼ gegenüber dem Vorquartal; „Speichern und ins nächste Quartal wechseln" führt anschließend zur Maximalpunkte-Prüfung.
- **Schülerliste** – manuell pflegen oder per Kopieren & Einfügen aus Excel übernehmen (Nachname, Vorname, Telefon, E-Mail, Betrieb, Ausbilder/Eltern mit Telefon und E-Mail).
- **Open Book Tests** – je Halbjahr die konfigurierte Anzahl OBT; Prozentwerte je Schüler/in eintragen (Note live aus dem Prozent-Bewertungsspiegel, Klassendurchschnitt sichtbar) oder den Moodle-/Logineo-Ergebnisexport direkt einlesen (Excel- oder CSV-Datei). Der Import erkennt die Kopfzeile (Nachname/Vorname/Bewertung), rechnet auch abweichende Maximalpunktzahlen („Bewertung/50,00") in Prozent um, überspringt „Gesamtdurchschnitt" und unbewertete Versuche und ordnet die Namen automatisch zu – nicht zuordenbare Zeilen werden zur manuellen Zuordnung angeboten.
- **Klausuren** – je Halbjahr die konfigurierte Anzahl; einmal die Maximalpunktzahl der Klausur festlegen, dann je Schüler/in die erreichten Punkte eintragen. Prozent und Note (Prozent-Bewertungsspiegel) berechnet die App live; Punkte über dem Maximum werden rot markiert. Nicht geschriebene Klausuren bleiben einfach leer.
- **Update-Anzeige** – die App prüft beim Start, ob eine neue Version veröffentlicht wurde, und zeigt dann das Banner „Eine neue Version von SOL-Noten ist geladen" mit einem Aktualisieren-Knopf. So ist immer eindeutig erkennbar, ob ein Update angekommen ist.
- **Notenübersicht** (nach dem Excel-Blatt „Noten") – alle Schüler/innen und alle Noten des Schuljahres in einer Tabelle: SoLei-Noten der vier Quartale mit Halbjahres- und Jahresdurchschnitt, alle OBT- und Klausurnoten mit Durchschnitten, gewichtete Zeugnisnote je Halbjahr und Schuljahr (fehlende Bereiche werden automatisch neu normiert), Tendenzpfeil (↑↗→↘↓, 2. HJ gegenüber 1. HJ) sowie manuelle Spalten „HJ-Zeugnis" und „Jahreszeugnis" für die pädagogische Entscheidung. Export als echte Excel-Datei und Druck/PDF (Querformat).
- **Notenausdruck je Schüler/in** (nach dem Excel-Blatt „Notenausdruck") – für das Notengespräch: je Quartal die Kriterien mit Maximal- und erreichten Punkten (grün/rot gegenüber dem Vorquartal), Punktesumme, Note SL-Bogen, Portfolio und SoLei-Note; alle OBT- und Klausurnoten; vorläufige Gesamtnote mit Tendenz. Blättern zwischen den Schüler/innen, Druck/PDF (Hochformat).
- **Punkteprotokoll mit Kriterium-Filter und Diagramm** – ein Tipp auf ein Kriterium filtert alle Vergaben dieses Kriteriums im gewählten Quartal und zeigt die Entwicklung als Liniendiagramm (Rasterlinien auf den Tipp-Stufen, Datumsachse).
- **Unentschuldigte Fehlzeiten** – je Kurs mit Datum erfassbar; jede Fehlzeit vergibt automatisch 0 Punkte in allen fünf SoLei-Kriterien des Tages (das Quartal ergibt sich aus dem Datum). Löschen einer Fehlzeit entfernt auch die 0-Punkte-Vergaben. Im Punkteprotokoll sind Fehlzeiten gekennzeichnet und nur über die Fehlzeiten-Seite veränderbar.
- **Farbschemata** – in den globalen Einstellungen wählbar: Petrol (Standard), Ozeanblau, Aubergine, Waldgrün, Schieferblau.
- **SoLei-Bewertung direkt aus dem Sitzplan** – der Sitzplan hat zwei Modi (Umschalter oben): Im Modus „Noten geben" (Standard) öffnet ein Tipp auf eine Person direkt die SoLei-Vergabe im Schüler-Modus (eine Person, alle fünf Kriterien, aktuelles Quartal und heutiges Datum); der Zurück-Weg führt wieder zum Sitzplan, die ‹ ›-Pfeile bleiben zum Weiterbewerten erhalten. Im Modus „Sitzplan bearbeiten" (optisch abgegrenzt) verschiebt und platziert ein Tipp die Personen wie zuvor. Kacheln ohne Foto (Initialen) sind ebenso bewertbar.
- **Kachelbeschriftung** – die Sitzplan-Kacheln zeigen Vorname (ganz) und Nachname (bei Bedarf abgekürzt) in einer Zeile.
- **Sitzplan mit Fotos** – je Kurs ein Sitzplan auf einem Raster mit einstellbarer Spaltenzahl (Zeilen wachsen nach Bedarf); Personen per Antippen setzen, verschieben, freiräumen, „automatisch anordnen“. Fotoverwaltung je Schüler/in über Kamera oder Galerie; Fotos werden auf 200 × 200 Pixel verkleinert (JPEG) und – bei aktiver Verschlüsselung – mit dem Hauptschlüssel verschlüsselt in einem eigenen Speicherbereich abgelegt. Ein Foto gilt für alle Kurse der Klasse. Beim ersten Öffnen ist ein Datenschutzhinweis (Einwilligungspflicht, rein lokale Speicherung) zu bestätigen.
- **Getrennte Foto-Sicherung** – Fotos sind nicht Teil des schlanken Noten-Backups; sie werden über „Sitzplan → Fotos verwalten → Fotos jetzt sichern“ als eine einzelne, optional passwortverschlüsselte Datei gesichert und separat wieder eingespielt.
- **Verschlüsselte Backups**- **Verschlüsselte Backups** – beim Speichern eines Backups kann ein Passwort vergeben werden; die Datei wird dann mit AES-256-GCM verschlüsselt (Schlüsselableitung PBKDF2/SHA-256, 310.000 Runden). Beim Einspielen fragt die App das Passwort ab. Ohne Passwort bleibt der Klartext-Export möglich. Achtung: Ein vergessenes Passwort ist nicht wiederherstellbar.
- **Diagramm-Druck** – im Punkteprotokoll lassen sich die Liniendiagramme aller fünf Kriterien eines Quartals gesammelt drucken bzw. als PDF speichern; unentschuldigte Fehlzeiten erscheinen als rote Punkte (auch im Bildschirm-Diagramm), Fehlzeiten-Hinweise sind direkt zur Fehlzeiten-Verwaltung verlinkt.
- **Acht Farbschemata** – zusätzlich Himmelblau, Orange und Beere; die Titelzeile der App und die Browser-Farbleiste übernehmen das gewählte Schema.
- **Verpflichtende PIN & Verschlüsselung ab Ersteinrichtung** – am Ende der Ersteinrichtung bestätigt die nutzende Person einen Haftungshinweis und legt anschließend zwingend eine PIN fest; danach sind alle Daten auf dem Gerät verschlüsselt (AES-256). Der Haftungshinweis ist jederzeit unter „Einstellungen → Über diese App“ nachlesbar. Ein erstes Backup wird empfohlen (die 7-Tage-Erinnerung greift, sobald Daten erfasst sind), aber bei noch leerer Datenbank nicht erzwungen.
- **Biometrische Entsperrung (Mobilgeräte)** – optional in den Einstellungen aktivierbar, sobald die Verschlüsselung läuft und das Gerät Fingerabdruck/Gesichtserkennung bietet (WebAuthn/PRF). Der Sperrbildschirm bietet dann beim Start die biometrische Entsperrung an; nach drei erfolglosen Versuchen fällt er automatisch auf die PIN zurück, die jederzeit als gleichwertiger Weg bleibt. Biometrie erhöht den Komfort, nicht die Sicherheit: Sie entsperrt denselben Hauptschlüssel wie die PIN, ist an das jeweilige Gerät gebunden und wird nach einem Gerätewechsel neu eingerichtet.
- **PIN-Sperre & Datenbank-Verschlüsselung** – in den globalen Einstellungen aktivierbar. Die Datenbank (inkl. der internen Sicherungsstände) wird mit einem zufälligen 256-Bit-Hauptschlüssel verschlüsselt (AES-256-GCM); die PIN (4–8 Ziffern) umhüllt nur diesen Hauptschlüssel (PBKDF2, 310.000 Runden). Beim Start erscheint ein Ziffernfeld (am Computer ist die PIN-Eingabe auch über die physische Tastatur möglich: Ziffern, Rücktaste, Enter zum Bestätigen, Escape zum Löschen – auf Tablet/Smartphone unverändert per Fingertipp); Schloss-Symbol zum manuellen Sperren; automatische Sperre bei Inaktivität (Aus/sofort/1/5/15 Min., Standard 5). Nach 5 Fehlversuchen Wartezeit 30 s mit Verdopplung je weiterem Fehlversuch, keine Datenlöschung. Die Einrichtung erzwingt zuerst ein frisches Backup; PIN ändern und Deaktivieren jederzeit möglich. „PIN vergessen" führt ausschließlich über App-Reset + Backup (bewusst keine Hintertür, keine E-Mail-/Sicherheitsfragen-Wiederherstellung). Automatische Ordner-Backups werden bei aktiver Verschlüsselung mit dem Hauptschlüssel verschlüsselt und beim Einspielen per PIN entsperrt; manuelle Backups behalten ihr eigenes Passwort.
- **Datensicherung** – alles bleibt lokal (IndexedDB). Backup-Datei speichern/einspielen, Erinnerung nach 7 Tagen, automatisches Backup in einen freigegebenen Ordner (Chrome/Edge am Computer und Android), interne tägliche Sicherungsstände der letzten 14 Tage gegen Fehlbedienung.
- **Einstellungen** – Kriteriennamen (global), Bewertungsspiegel (15-Punkte-Schema, Standardwerte aus der Excel-Datei).

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
