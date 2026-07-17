# SOL-Noten – Roadmap

Geplante Funktionen in grober Reihenfolge. Nicht terminiert; Reihenfolge und
Zuschnitt werden vor der Umsetzung jeweils gemeinsam festgelegt.

## 2. Schuljahreswechsel-Assistent
Am Schuljahresende: Klassen/Schülerlisten ins neue Schuljahr übernehmen, neue
Kurse anlegen, alte Kurse als abgeschlossen stehen lassen – als geführter
Ablauf statt Handarbeit.

## 3. Kursnotiz-Funktion
Kurze Notizen je Schüler/in (mitverschlüsselt). **Platzierung noch zu
besprechen:** eigener Button vs. Textfeld auf „SoLei-Punkte vergeben“;
zusätzlich eine gesammelte, datierte Notizen-Ansicht je Schüler/in als
Entscheidungshilfe bei der Quartalsnote (Kandidat: Seite „SoLei-Quartalsnoten“).

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

Umgesetzt: Schuljahresbeginn automatisch vorschlagen (v0.17.1) – erster Werktag nach den Sommerferien als Vorschlag, manuell änderbar.

Bewusst verworfen: Undo für die letzte Punktevergabe (Korrektur erfolgt direkt
durch Antippen des richtigen Werts), native App-Store-Versionen (die App bleibt
PWA), direkte Cloud-API-Anbindung (stattdessen: Ordner-Backup in einen von
OneDrive/Google Drive synchronisierten Ordner legen).
