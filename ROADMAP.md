# SOL-Noten – Roadmap

Geplante Funktionen in grober Reihenfolge. Nicht terminiert; Reihenfolge und
Zuschnitt werden vor der Umsetzung jeweils gemeinsam festgelegt.

## 4. Excel-Gesamtexport aller Rohdaten
Eine Excel-Datei mit einem Tabellenblatt je Kurs (Punktevergaben, Fehlzeiten,
Uploads, OBT/Klausuren, Portfolionoten), als vollständiger Datenauszug.

## 5. Unterrichtstage je Kurs (optional)
In den Kurs-Einstellungen die Wochentage hinterlegen, an denen das Fach
unterrichtet wird (z. B. Mo + Do). „Unentschuldigte Fehlzeiten“ zeigt dann nur
diese Tage an. Ohne Eintrag bleibt das bisherige Verhalten (alle Tage außer
Sonntag). **Wichtig:** Stundenplanänderungen müssen abbildbar sein – geänderte
Wochentage gelten ab einem bestimmten Datum (Gültigkeitszeiträume).

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

Umgesetzt: Kursnotiz-Funktion (v0.20.0) – Notiz-Symbol in der Erfassungsliste, volles Feld in der Schüleransicht, datierte Quartals-Notizen auf „SoLei-Quartalsnoten“; eine Notiz je Schüler/in und Datum, mitverschlüsselt. Schuljahr-Archiv & -Löschung (v0.19.0) – Excel-/Druck-Export je Schuljahr, Löschen mit PIN-Bestätigung und Foto-Schonung übernommener Schüler/innen. Schuljahreswechsel-Assistent (v0.18.0) – Klassen (Schülerlisten samt Fotos), Kurseinstellungen, Maximalpunkte und Sitzpläne aus einem früheren Schuljahr übernehmen; Bewertungsdaten bleiben im alten Jahr. Schuljahresbeginn automatisch vorschlagen (v0.17.1) – erster Werktag nach den Sommerferien als Vorschlag, manuell änderbar.

Bewusst verworfen: Undo für die letzte Punktevergabe (Korrektur erfolgt direkt
durch Antippen des richtigen Werts), native App-Store-Versionen (die App bleibt
PWA), direkte Cloud-API-Anbindung (stattdessen: Ordner-Backup in einen von
OneDrive/Google Drive synchronisierten Ordner legen).
