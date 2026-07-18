# SOL-Noten – Roadmap

Geplante Funktionen in grober Reihenfolge. Nicht terminiert; Reihenfolge und
Zuschnitt werden vor der Umsetzung jeweils gemeinsam festgelegt.

## 6. Stundeninhalte eintragen
Eigener Button mit Kalenderansicht, die nur die tatsächlichen Unterrichtstage
des Fachs anzeigt (baut auf Nr. 5 auf); je Termin ein kurzer Inhaltseintrag.

## 7. Demo-Modus mit Beispieldaten
Per Klick aktivierbarer Modus mit fiktiven Klassen/Daten für Fortbildungen und
Vorführungen, ohne echte Schülerdaten zu zeigen.

## 8. Klassenduplikat
Einen weiteren Kurs (anderes Fach) für eine bestehende Klasse anlegen, ohne die
Schülerliste neu zu erfassen.

## 9. Spenden-Funktion
Bewusst an letzter Stelle; wird vorerst nicht umgesetzt.

---

Umgesetzt: Unterrichtstage je Kurs (v0.22.0) – optionale Wochentag-Segmente mit „Änderung ab Datum“ (Gültigkeitszeiträume) in den Kurs-Einstellungen; die Fehlzeiten-Schüler-Ansicht zeigt nur noch Unterrichtstage (erfasste Fehlzeiten bleiben immer sichtbar), die Datums-Ansicht weist auf Nicht-Kurstage hin; beim Schuljahreswechsel bewusst keine Übernahme, stattdessen Hinweis. Export aller Schuljahresdaten (v0.21.0) – Excel-Mappe mit Übersichtsblatt und je Kurs einem Blatt aus Notenübersicht plus sämtlichen Rohdaten (Punktevergaben, Fehlzeiten, Uploads, OBT/Klausuren, Portfolio, Kursnotizen), mit Fettdruck und Spaltenbreiten. Kursnotiz-Funktion (v0.20.0) – Notiz-Symbol in der Erfassungsliste, volles Feld in der Schüleransicht, datierte Quartals-Notizen auf „SoLei-Quartalsnoten“; eine Notiz je Schüler/in und Datum, mitverschlüsselt. Schuljahr-Archiv & -Löschung (v0.19.0) – Excel-/Druck-Export je Schuljahr, Löschen mit PIN-Bestätigung und Foto-Schonung übernommener Schüler/innen. Schuljahreswechsel-Assistent (v0.18.0) – Klassen (Schülerlisten samt Fotos), Kurseinstellungen, Maximalpunkte und Sitzpläne aus einem früheren Schuljahr übernehmen; Bewertungsdaten bleiben im alten Jahr. Schuljahresbeginn automatisch vorschlagen (v0.17.1) – erster Werktag nach den Sommerferien als Vorschlag, manuell änderbar.

Bewusst verworfen: Undo für die letzte Punktevergabe (Korrektur erfolgt direkt
durch Antippen des richtigen Werts), native App-Store-Versionen (die App bleibt
PWA), direkte Cloud-API-Anbindung (stattdessen: Ordner-Backup in einen von
OneDrive/Google Drive synchronisierten Ordner legen).
