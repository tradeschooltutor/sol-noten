# SOL-Noten – Roadmap

Geplante Funktionen in grober Reihenfolge. Nicht terminiert; Reihenfolge und
Zuschnitt werden vor der Umsetzung jeweils gemeinsam festgelegt.

## 7. Notendurchschnitte des Quartals
Durchschnitt der Klasse anzeigen auf „SoLei-Punktestand" und
„SoLei-Quartalsnoten".

## 8. Notendurchschnitt & Notenspiegel je Prüfung
Für jeden Open Book Test und jede Klausur: Durchschnittsnote und
Notenspiegel (Verteilung der Noten über die Klasse).

## 9. Leistungsverlauf als Liniendiagramm (Ansicht Klasse)
Auf „Notenübersicht & Zeugnisnoten", Ansicht Klasse: Entwicklung der
Klassendurchschnitte über die Zeit, je Leistung wählbar (SoLei 1.–4.
Quartal, Open Book Tests, Klausuren). Die Schüler-Variante ist seit
v0.27.0 umgesetzt.

## 10. Mehrere Sitzpläne pro Klasse
Für Raumwechsel: mehr als einen Sitzplan je Kurs hinterlegen und zwischen
ihnen umschalten.

## 11. Export in die Zwischenablage
Listen zusätzlich zum Datei-Export direkt in die Zwischenablage kopieren
(z. B. zum Einfügen in ein bestehendes Excel-Dokument).

## 12. Demo-Modus mit Beispieldaten
Per Klick aktivierbarer Modus mit fiktiven Klassen/Daten für Fortbildungen und
Vorführungen, ohne echte Schülerdaten zu zeigen.

## 13. Spenden-Funktion
Bewusst an letzter Stelle; wird vorerst nicht umgesetzt.

---

Umgesetzt: Punkteentwicklungs-Diagramme in der Schüler-Ansicht der Notenübersicht (v0.27.0) – Umschalt-Button, alle bisherigen Quartale, Upload-Zeile, Druck auf zweiter Seite. Kursnotizen auf „SoLei-Punktestand" (Ansicht Schüler/in, v0.26.0) oberhalb der Punktevergaben. Bugfixes (v0.25.1) – Kursnotizen auf „SoLei-Quartalsnoten" brechen auf breiten Displays unter die Notenzeile um; „Notenausdruck" und Schüler-Ansicht der Notenübersicht zu einer Seite zusammengeführt (Namensklick öffnet die Person, „Ansicht: Schüler/in" den ersten Namen, Druck-Button in der Kursnamen-Box); Kursnamen-Box-Buttons stehen wieder rechts neben dem Namen. Weiterer Kurs für eine bestehende Klasse (v0.25.0) – Button in „Weitere Kurs-Verwaltung"; Klasse vorbelegt, Einstellungen, Maximalpunkte und Sitzplan übernommen, Fach leer, ohne Bewertungsdaten und Unterrichtstage. Vereinfachte App-Installation (v0.24.0) – „App installieren"-Button via beforeinstallprompt (PC/Android), iOS-Anleitung, Abschnitt in den Einstellungen, ausblendbarer Hinweis auf dem Startbildschirm; Export-Hinweise und Umbenennung „Excel-Export aller Schuljahresdaten" (v0.23.2). Stundeninhalte (v0.23.0, UI-Feinschliff v0.23.1) – Buch-Symbol in der Kopfzeile der Kurs-Hauptansicht; Terminliste je Quartal (nur Unterrichtstage laut Kurs-Einstellungen), Texteintrag je Termin mit Auto-Speichern, auf-/absteigende Sortierung, einklappbare Hinweise, Abschnitt im Export aller Schuljahresdaten. Unterrichtstage je Kurs (v0.22.0) – optionale Wochentag-Segmente mit „Änderung ab Datum“ (Gültigkeitszeiträume) in den Kurs-Einstellungen; die Fehlzeiten-Schüler-Ansicht zeigt nur noch Unterrichtstage (erfasste Fehlzeiten bleiben immer sichtbar), die Datums-Ansicht weist auf Nicht-Kurstage hin; beim Schuljahreswechsel bewusst keine Übernahme, stattdessen Hinweis. Export aller Schuljahresdaten (v0.21.0) – Excel-Mappe mit Übersichtsblatt und je Kurs einem Blatt aus Notenübersicht plus sämtlichen Rohdaten (Punktevergaben, Fehlzeiten, Uploads, OBT/Klausuren, Portfolio, Kursnotizen), mit Fettdruck und Spaltenbreiten. Kursnotiz-Funktion (v0.20.0) – Notiz-Symbol in der Erfassungsliste, volles Feld in der Schüleransicht, datierte Quartals-Notizen auf „SoLei-Quartalsnoten“; eine Notiz je Schüler/in und Datum, mitverschlüsselt. Schuljahr-Archiv & -Löschung (v0.19.0) – Excel-/Druck-Export je Schuljahr, Löschen mit PIN-Bestätigung und Foto-Schonung übernommener Schüler/innen. Schuljahreswechsel-Assistent (v0.18.0) – Klassen (Schülerlisten samt Fotos), Kurseinstellungen, Maximalpunkte und Sitzpläne aus einem früheren Schuljahr übernehmen; Bewertungsdaten bleiben im alten Jahr. Schuljahresbeginn automatisch vorschlagen (v0.17.1) – erster Werktag nach den Sommerferien als Vorschlag, manuell änderbar.

Bewusst verworfen: Undo für die letzte Punktevergabe (Korrektur erfolgt direkt
durch Antippen des richtigen Werts), native App-Store-Versionen (die App bleibt
PWA), direkte Cloud-API-Anbindung (stattdessen: Ordner-Backup in einen von
OneDrive/Google Drive synchronisierten Ordner legen).
