/* SOL-Noten – Inhalte des Hilfebereichs.

   Bewusst als Datenstruktur (nicht als HTML): Aus derselben Quelle entstehen
   die Bildschirmansicht, der Druck einer einzelnen Hilfeseite und die
   Komplettanleitung. Neue Inhalte müssen daher nur an einer Stelle gepflegt
   werden.

   Aufbau:
     PAGES  – Hilfeseiten mit aufklappbaren Kapiteln
     GLOSSARY – Fachbegriffe; in Texten über {{Begriff}} verlinkbar
     CONTEXT – Zuordnung App-Seite -> Hilfekapitel (Fragezeichen-Symbole)

   Textauszeichnung innerhalb von Absätzen:
     {{Begriff}}      -> antippbarer Glossarbegriff (Definition klappt auf)
     **fett**         -> Hervorhebung
   Absatztypen: 'p' (Text), 'ul' (Liste), 'steps' (nummerierte Schritte),
   'note' (Hinweiskasten), 'warn' (Warnkasten). */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else root.Help = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ================= Glossar ================= */
  var GLOSSARY = [
    { term: 'SOL', def: 'Selbstorganisiertes Lernen. Unterrichtskonzept, bei dem Lernende Arbeitsschritte, Tempo und teils auch Reihenfolge selbst steuern; die Lehrkraft begleitet und beobachtet statt vorzutragen.' },
    { term: 'SoLei', def: 'Kurz für „Sonstige Leistungen“. Alle Leistungen außer Klausuren und Open Book Tests – in dieser App über fünf Kriterien erfasst, die im laufenden Unterricht beobachtet werden.' },
    { term: 'SoLei-Kriterien', def: 'Die fünf Beobachtungsbereiche der sonstigen Leistungen. Voreingestellt: Zeitmanagement, Material/Medien, Arbeitsergebnisse, Sozialkompetenz und Mündliche Beteiligung. Die Bezeichnungen sind in den Globalen Einstellungen änderbar.' },
    { term: 'SoLei-Maximalpunkte', def: 'Die je Kriterium und Quartal höchstens erreichbare Punktzahl. Die Summe über alle fünf Kriterien ergibt 15 Punkte. Durch Verschieben der Maximalpunkte lässt sich ein Kriterium in einem Quartal stärker gewichten.' },
    { term: 'Quartal', def: 'Zeitabschnitt von etwa zehn Schulwochen. Das Schuljahr besteht aus vier Quartalen, zwei je Halbjahr. Die App berechnet die Zeiträume aus dem ersten Schultag und den Schulferien; das Quartal einer Eingabe ergibt sich immer aus dem gewählten Datum. In den Einstellungen jedes Kurses können Sie diese vorgeschlagenen Quartalszeiträume individuell anpassen.' },
    { term: 'OBT', def: 'Open Book Test. Schriftliche Leistungsüberprüfung, bei der Unterlagen erlaubt sind. In der App wird je Test ein Prozentwert erfasst, aus dem über den Prozent-Bewertungsspiegel die Note entsteht.' },
    { term: 'Portfolio', def: 'Sammlung eigener Arbeitsergebnisse über einen längeren Zeitraum. In der App optional als eine Note je Quartal erfassbar (Feld „Portfolio / mdl. Prüfung“), die in die SoLei-Note einfließt.' },
    { term: 'Bewertungsspiegel', def: 'Umrechnungstabelle von Leistung in Note. Die App hat zwei Bewertungsspiegel: das 15-Punkte-Schema für die SoLei-Note und das Prozent-Schema für Open Book Tests und Klausuren. Beide sind in den Globalen Einstellungen anpassbar.' },
    { term: 'Zeugnisnote', def: 'Die abschließende Note für Halbjahr oder Schuljahr. Die App berechnet einen Vorschlag aus SoLei-Note, Open Book Tests und Klausuren nach der eingestellten Gewichtung; eintragen und verantworten muss sie die Lehrkraft.' },
    { term: 'Gewichtung', def: 'Anteil von sonstigen Leistungen, Open Book Tests und Klausuren an der Zeugnisnote, in Prozent und in Summe 100. Wird je Kurs in den Kurs-Einstellungen festgelegt.' },
    { term: 'Ergebnis-Uploads', def: 'Zählung, wie oft Lernende ihre Arbeitsergebnisse in das Lernmanagementsystem der Schule hochgeladen haben – und wie oft sie es vergessen haben. Diese Zählung wirkt sich standardmäßig auf das SoLei-Kriterium „Arbeitsergebnisse“ aus. Sie kann aber in den Kurs-Einstellungen auf ein frei wählbares SoLei-Kriterium geändert werden.' },
    { term: 'Unentschuldigte Fehlzeit', def: 'Fehlen ohne Entschuldigung. In der App vergibt eine erfasste Fehlzeit automatisch 0 Punkte in allen fünf Kriterien des Tages.' },
    { term: 'PWA', def: 'Progressive Web App. Eine Webseite, die sich wie eine App installieren lässt: eigenes Symbol, eigenes Fenster, offline nutzbar. SOL-Noten ist eine solche App und braucht daher keinen App Store.' },
    { term: 'Backup', def: 'Verschlüsselte Sicherungsdatei aller Daten. Nur mit ihr lassen sich Daten auf ein anderes Gerät übertragen oder nach einem Geräteverlust wiederherstellen.' },
    { term: 'Verschlüsselung', def: 'Umwandlung der Daten in eine unlesbare Form, die sich nur mit dem richtigen Passwort zurückrechnen lässt. SOL-Noten verschlüsselt alle Daten im Gerätespeicher und in Backups.' },
    { term: 'Demo-Modus', def: 'Vorführmodus mit erfundenen Klassen und Bewertungen. Die echten Daten bleiben währenddessen unangetastet und sind nach dem Beenden sofort wieder da.' },
    { term: 'Lernmanagementsystem', def: 'Digitale Lernplattform der Schule, etwa Moodle, Logineo, Teams oder OneNote.' }
  ];

  /* Alphabetisch sortiert – so erscheinen die Begriffe auf dem Bildschirm
     und im Ausdruck in derselben, nachschlagbaren Reihenfolge. */
  GLOSSARY.sort(function (a, b) { return a.term.localeCompare(b.term, 'de'); });

  function glossaryFor(term) {
    var t = String(term || '').toLowerCase();
    for (var i = 0; i < GLOSSARY.length; i++) {
      if (GLOSSARY[i].term.toLowerCase() === t) return GLOSSARY[i];
    }
    return null;
  }

  /* ================= Hilfeseiten ================= */
  var PAGES = [
    /* ---------------------------------------------------------------- */
    {
      id: 'start',
      title: 'Erste Schritte',
      lead: 'Der kürzeste Weg von der Installation bis zur ersten Punktevergabe.',
      chapters: [
        {
          id: 'start-reihenfolge',
          title: 'In welcher Reihenfolge fange ich an?',
          body: [
            { t: 'p', v: 'Diese Reihenfolge führt am schnellsten zum Ziel:' },
            { t: 'steps', v: [
              'App installieren – am besten zuerst, siehe nächstes Kapitel.',
              'Bundesland und erstes Schuljahr anlegen (geschieht automatisch beim ersten Start).',
              'PIN oder Passwort festlegen. Bitte sicher notieren.',
              'Auf der Startseite „+ Kurs“ antippen: Klasse anlegen und Fach eingeben.',
              'Schülerliste erfassen – am schnellsten über „Aus Excel einfügen“.',
              '{{SoLei-Maximalpunkte}} der fünf {{SoLei-Kriterien}} prüfen (Vorgabe: je 3 Punkte, Summe 15).',
              'Fertig. Über „SoLei-Punkte vergeben“ beginnt die laufende Bewertung der {{SoLei}}.'
            ] },
            { t: 'note', v: 'Alles ist später änderbar. Sie müssen zu Beginn nichts perfekt einstellen.' }
          ]
        },
        {
          id: 'start-installation',
          title: 'Warum sollte ich _SOL-Noten_ als App installieren?',
          body: [
            { t: 'p', v: 'SOL-Noten ist eine so genannte {{PWA}} (Progressive Web App) – eine Website, die sich wie eine App installieren lässt. Sie läuft zwar auch im Browser, **du solltest sie aber am besten jetzt direkt auf deinem Gerät installieren. Dadurch hast du folgende Vorteile:**' },
            { t: 'ul', v: [
              '**Offline-Nutzung:** Die App funktioniert auch ohne aktive Internetverbindung (im Gegensatz zur Website im Browser).',
              '**Aufgeräumte Oberfläche:** Die PWA läuft in einem eigenen Fenster. Es wird kein Platz für die Bedienoberfläche des Browsers (z. B. die Adresszeile) verschwendet.',
              '**Höhere Geschwindigkeit:** Inhalte und Dateien werden im Speicher des Geräts gesichert. Dadurch lädt die Anwendung bei erneuter Nutzung fast ohne Wartezeit.',
              '**Geringer Speicherplatz:** Im Vergleich zu herkömmlichen Apps aus dem App Store oder Play Store verbraucht die PWA nur minimalen Speicher auf Ihrem Gerät.'
            ] },
            { t: 'p', v: '**Auf iPhone und iPad hat die installierte App einen eigenen Datenspeicher**, getrennt vom Safari-Browser. Wer erst im Browser einrichtet und danach installiert, findet seine Eingaben in der App nicht wieder und muss sie erneut vornehmen.' },
            { t: 'p', v: 'Deshalb erscheint der Installationshinweis schon auf dem Einrichtungsbildschirm. So installieren Sie:' },
            { t: 'ul', v: [
              '**PC/Mac (Chrome, Edge) und Android:** Button „App installieren“ antippen – der Browser fragt einmal nach und legt das Symbol an.',
              '**iPhone/iPad (Safari):** Teilen-Symbol antippen, dann „Zum Home-Bildschirm“. Die App zeigt dazu eine Anleitung mit Pfeil auf das richtige Symbol.',
              '**Firefox am PC** unterstützt die Installation nicht; dort läuft SOL-Noten im Browser weiter.'
            ] },
            { t: 'p', v: 'Die Installation ist jederzeit nachholbar: [[app:settings|Globale Einstellungen]], Abschnitt „App-Installation“.' },
            { t: 'warn', v: 'Wenn Sie auf iPhone oder iPad **die App nicht installieren und stattdessen im Safari-Browser weiterarbeiten**, drohen Ihnen zwei Probleme. Erstens erscheinen diese Daten später nicht in der installierten App, weil beide getrennte Speicher haben. Zweitens – und das ist der gefährlichere Punkt – löscht Safari die Daten von Websites, die nicht auf dem Home-Bildschirm liegen, nach etwa sieben Tagen ohne Nutzung automatisch. Nach den Ferien könnten Ihre Noten also verschwunden sein.' },
            { t: 'p', v: 'Falls Sie bereits im Browser gearbeitet haben, gehen die Daten aber nicht verloren: Erstellen Sie **im Browser** ein {{Backup}} (Globale Einstellungen → Datensicherung), installieren Sie dann die App und spielen Sie das Backup dort wieder ein.' }
          ]
        },
        {
          id: 'start-pin',
          title: 'Verschlüsselung, PIN/Passwort und eine wichtige Warnung',
          body: [
            { t: 'p', v: 'SOL-Noten speichert alle Daten {{Verschlüsselung|verschlüsselt}} – also in einer Form, die ohne Ihr Passwort unlesbar ist. Der Vorteil: Selbst wenn Ihr Gerät verloren geht oder in fremde Hände gerät, sind Namen und Noten geschützt. Ihre PIN oder Ihr Passwort ist dabei der einzige Schlüssel; er wird nirgends gespeichert, sondern bei jedem Entsperren aus Ihrer Eingabe neu berechnet. Ausführlich beschreibt das die [[help:ds-verschluesselung|Datenschutz-Kurzinformation]].' },
            { t: 'warn', v: 'Wenn Sie PIN oder Passwort vergessen, sind Ihre Daten endgültig verloren. Es gibt keine Wiederherstellung – auch nicht durch den Entwickler. Das ist kein Versäumnis, sondern die Kehrseite echter {{Verschlüsselung}}: Ohne Passwort existiert kein Schlüssel zu den Daten.' },
            { t: 'p', v: 'Zwei Empfehlungen daraus: Notieren Sie das Passwort an einem sicheren Ort außerhalb des Geräts, und erstellen Sie regelmäßig ein {{Backup}}. Ein Backup schützt zugleich gegen Geräteverlust, Defekt und versehentliches Löschen.' }
          ]
        },
        {
          id: 'start-schueler',
          title: 'Schülerliste schnell erfassen',
          body: [
            { t: 'p', v: 'Namen einzeln eintippen dauert lange. Schneller geht es über „Aus Excel einfügen“: Sie kopieren die Spalten aus einer bestehenden Tabelle – etwa aus dem Schulverwaltungsprogramm – und fügen sie in das Textfeld ein.' },
            { t: 'p', v: 'Die App erwartet die Spalten in der folgenden Reihenfolge: Nachname, Vorname, danach optional Telefon, E-Mail, Ausbildungsbetrieb sowie Name, Telefon und E-Mail der Ausbilderin oder des Ausbilders. Nur die ersten beiden Spalten sind Pflicht.' }
          ]
        },
        {
          id: 'start-fortbildung',
          title: 'Demo-Modus (nur zum Testen, Daten werden nach dem Verlassen nicht gespeichert!)',
          body: [
            { t: 'p', v: 'Damit Sie sich einen besseren Eindruck verschaffen können, hat die App einen {{Demo-Modus}}: Sie finden ihn in den [[app:settings|Globalen Einstellungen]]. Die App zeigt dann zwei erfundene Klassen mit drei Kursen, vollständig bewerteten Quartalen 1 bis 3 und einem leeren vierten Quartal – dort können Sie das Vergeben von Punkten und Noten ausprobieren.' },
            { t: 'p', v: 'Ihre echten Daten bleiben unangetastet gespeichert, ein oranges Band weist dauerhaft auf den Demo-Modus hin, und beim Beenden verschwinden alle Demo-Änderungen. Die Beispieldaten sind bei jedem Start identisch – Ablaufpläne und Screenshots bleiben also gültig.' },
            { t: 'p', v: '**Der Demo-Modus ist deshalb nicht für die produktive Arbeit geeignet, da die Daten hier nicht dauerhaft gespeichert werden!**' }
          ]
        }
      ]
    },


    /* ---------------------------------------------------------------- */
    {
      id: 'faq',
      title: 'FAQ',
      lead: 'Häufige Fragen zu allen Funktionen – über das Suchfeld schnell zu finden.',
      searchable: true,
      chapters: [
        /* ===== Grundlagen ===== */
        {
          id: 'faq-startseite',
          title: 'Was sehe ich auf der Startseite?',
          body: [
            { t: 'p', v: 'Alle Kurse des ausgewählten Schuljahres als Kacheln. Ein Kurs ist immer eine Klasse in einem Fach – dieselbe Klasse kann also mehrere Kurse haben. Ein Tipp auf die Kachel öffnet den Kurs.' },
            { t: 'p', v: 'Oben rechts erreichen Sie Hilfe und Globale Einstellungen, darunter wechseln Sie bei Bedarf das Schuljahr. Ganz unten legen Sie mit „+ Kurs anlegen“ einen weiteren Kurs an.' }
          ]
        },
        {
          id: 'faq-kursseite',
          title: 'Wie ist die Kursseite aufgebaut?',
          body: [
            { t: 'p', v: 'In drei Bereiche. **Sonstige Leistungen** enthält alles, was im laufenden Unterricht entsteht: Punkte vergeben, Sitzplan, Punktestand, {{Ergebnis-Uploads}}, Fehlzeiten und Quartalsnoten. **Weitere Prüfungsleistungen** umfasst {{OBT}} und Klausuren. **Auswertung** führt zur Notenübersicht mit den {{Zeugnisnote|Zeugnisnoten}}.' },
            { t: 'p', v: 'Ganz oben steht das aktuelle {{Quartal}} mit seinem Zeitraum, rechts daneben das Buch-Symbol für die Stundeninhalte. Darunter finden Sie die Kurs-Einstellungen.' }
          ]
        },
        {
          id: 'faq-solei-note',
          title: 'Wie entsteht die SoLei-Note?',
          body: [
            { t: 'p', v: 'Über das {{Quartal}} vergeben Sie Punkte in den fünf {{SoLei-Kriterien}}. Am Quartalsende bildet die App je Kriterium den Durchschnitt Ihrer Vergaben, addiert diese fünf Durchschnitte und erhält so eine Summe von höchstens 15 Punkten. Aus dieser Summe wird über den 15-Punkte-{{Bewertungsspiegel}} die Note.' },
            { t: 'p', v: 'Entscheidend ist: Es zählt der **Durchschnitt**, nicht die Summe aller Einzelvergaben. Sie können also so oft bewerten, wie Sie möchten – wer selten drankommt, wird dadurch nicht benachteiligt.' },
            { t: 'p', v: 'Optional können Sie auf der Seite „SoLei-Quartalsnoten“ zusätzlich eine {{Portfolio}}- oder mündliche Prüfungsnote eintragen; sie wird dann mit der Punktenote verrechnet.' }
          ]
        },
        {
          id: 'faq-punkte',
          title: 'Wie vergebe ich SoLei-Punkte im Unterricht?',
          body: [
            { t: 'p', v: 'Über „SoLei-Punkte vergeben“. Es gibt zwei Ansichten: **Ansicht Kriterium** zeigt alle Personen untereinander und Sie bewerten ein Kriterium für die ganze Gruppe – das ist der schnellste Weg im laufenden Unterricht. **Ansicht Schüler/in** zeigt alle fünf Kriterien einer Person auf einmal, dazu ein Notizfeld.' },
            { t: 'p', v: 'Ein Tipp auf den Punktewert genügt; es gibt keinen Speichern-Knopf. Haben Sie sich vertippt, tippen Sie einfach den richtigen Wert an – er ersetzt den alten.' },
            { t: 'p', v: 'Am PC können Sie auch die Tastatur benutzen: Zahlen eingeben, Enter bestätigt.' },
            { t: 'p', v: '**Was in einer Zeile steht.** Neben dem Namen zeigt die App drei Zahlen, die den aktuellen Stand der Person zusammenfassen. So sieht eine Zeile in der Ansicht Kriterium aus (auf dem Smartphone stehen die Angaben untereinander statt nebeneinander):' },
            { t: 'mock', v: 'solei-row' },
            { t: 'ul', v: [
              '**1 – Foto:** Erleichtert die Zuordnung von Namen und Gesichtern. Ohne Foto stehen dort die Initialen.',
              '**2 – Kursnotiz:** Öffnet ein Textfeld für eine kurze Beobachtung zu dieser Person am eingestellten Datum (siehe unten).',
              '**3 – Punktesumme im Quartal:** Hier 9,3 von 15 möglichen Punkten. Diese Zahl ist die Summe der fünf Kriteriumsdurchschnitte – sie berücksichtigt also **alle** Kriterien, nicht nur das gerade geöffnete.',
              '**4 – Note zur Punktesumme:** Die Note, die sich aus 9,3 Punkten über den 15-Punkte-{{Bewertungsspiegel}} ergibt – hier 2,8. Es ist der aktuelle Zwischenstand der Note SL-Bogen, keine endgültige Note.',
              '**5 – Durchschnitt im geöffneten Kriterium:** Das ø-Zeichen bezieht sich nur auf das Kriterium, das Sie gerade bewerten. Hier hat Anna Meier in diesem Kriterium bisher im Schnitt 3,0 Punkte je Vergabe erhalten.',
              '**6 – Tipp-Buttons:** Die möglichen Punktwerte, abgeleitet aus den {{SoLei-Maximalpunkte|Maximalpunkten}} des Kriteriums (Maximum, ⅔, ⅓, 0).',
              '**7 – Kursnotiz (aufgeklappt):** Der Text gehört zu dieser Person **und** zu dem oben eingestellten Datum.'
            ] },
            { t: 'note', v: 'Die drei Zahlen ändern sich sofort mit jeder Vergabe. Sie sind als Orientierung während des Unterrichts gedacht – „wo steht diese Person gerade?“ –, nicht als Zeugnisnote.' },
            { t: 'p', v: '**Die Kursnotiz** (Symbol 2) ist eine kurze Beobachtung zu einer Person an einem Tag, zum Beispiel „hat heute die Gruppe gut moderiert“ oder „ohne Material erschienen“. Pro Person und Datum ist eine Notiz möglich; sie speichert sich beim Verlassen des Feldes, leerer Text löscht sie wieder. Wiedergefunden werden die Notizen auf „SoLei-Quartalsnoten“ und in der Einzelansicht des SoLei-Punktestands – also genau dann, wenn Sie die Quartalsnote festlegen oder ein Notengespräch vorbereiten. Ausführlicher beschreibt das [[help:faq-notizen|dieses Kapitel]].' },
            { t: 'note', v: 'Oben stellen Sie das Datum ein. Das {{Quartal}} ergibt sich immer aus diesem Datum – Sie können also problemlos nachtragen, was Sie im Unterricht nicht geschafft haben.' }
          ]
        },
        {
          id: 'faq-notizen',
          title: 'Wie halte ich Beobachtungen zu einzelnen Personen fest?',
          body: [
            { t: 'p', v: 'In der Ansicht Schüler/in auf der Seite „SoLei-Punkte vergeben“ steht unter den fünf Kriterien ein Notizfeld. Pro Person und Datum ist eine Notiz möglich; sie speichert sich beim Verlassen des Feldes, leerer Text löscht sie wieder.' },
            { t: 'p', v: 'Wieder finden Sie die Notizen an zwei Stellen: auf „SoLei-Quartalsnoten“ unter der jeweiligen Person und auf „SoLei-Punktestand“ in der Einzelansicht – dort also genau dann, wenn Sie die Quartalsnote festlegen oder ein Gespräch vorbereiten.' }
          ]
        },
        {
          id: 'faq-sitzplan',
          title: 'Wofür ist der Sitzplan gut?',
          body: [
            { t: 'p', v: 'Er ist ein weiterer Weg zur Punktevergabe: Sie sehen die Klasse so, wie sie vor Ihnen sitzt, tippen auf eine Person und vergeben die Punkte. Im Modus „Sitzplan bearbeiten“ ordnen Sie die Plätze an, im Modus „SL-Punkte geben“ bewerten Sie.' },
            { t: 'p', v: 'Wechselt die Klasse den Raum, legen Sie mehrere Sitzpläne an und schalten oben rechts um. Die Namen vergeben Sie frei – meist die Raumnummer. „Duplizieren“ übernimmt die aktuelle Anordnung als Ausgangspunkt.' },
            { t: 'p', v: 'Fotos sind optional. Ohne Fotos zeigt der Plan die Namenskürzel.' }
          ]
        },
        {
          id: 'faq-fotos',
          title: 'Wie funktionieren die Fotos, und ist das datenschutzkonform?',
          body: [
            { t: 'p', v: 'Fotos erfassen Sie im Reiter „Fotos verwalten“ auf der Sitzplan-Seite. Sie werden verkleinert und wie alle anderen Daten {{Verschlüsselung|verschlüsselt}} auf dem Gerät gespeichert – sie verlassen es nicht.' },
            { t: 'p', v: 'Die Fotos hängen an der Person, nicht am Kurs: Wer eine Klasse in zwei Fächern unterrichtet, erfasst sie nur einmal. Beim Schuljahreswechsel wandern sie automatisch mit.' },
            { t: 'warn', v: 'Für Fotos von Lernenden brauchen Sie die nach Ihrem Landesrecht erforderliche Einwilligung. Die App kann Ihnen diese Prüfung nicht abnehmen.' }
          ]
        },
        {
          id: 'faq-uploads',
          title: 'Was sind Ergebnis-Uploads, und wie zähle ich sie?',
          body: [
            { t: 'p', v: 'Wenn Ihre Schüler/innen die Aufgabe haben, ihre Arbeitsergebnisse in das {{Lernmanagementsystem}} der Schule hochzuladen (z. B. Moodle/Logineo, OneNote, Teams), können Sie das in die Bewertung einfließen lassen. Dafür gibt es zwei Wege:' },
            { t: 'ul', v: [
              '**Laufend:** Sie prüfen die Uploads regelmäßig und vergeben dafür Punkte über „SoLei-Punkte vergeben“ – mit Datum und abgestufter Punktzahl je nach Vollständigkeit.',
              '**Am Quartalsende:** Sie tragen auf der Seite „Ergebnis-Uploads“ nur die Anzahl der erledigten und der vergessenen Uploads ein.'
            ] },
            { t: 'p', v: 'Beim zweiten Weg zählt jeder erledigte Upload mit der vollen Maximalpunktzahl des Kriteriums, jeder vergessene mit 0 Punkten. Diese Werte fließen in den Durchschnitt des Kriteriums ein. Ein Datum wird dabei nicht erfasst, weil die Zählung erst am Quartalsende erfolgt.' },
            { t: 'p', v: 'Standardmäßig wirkt die Zählung auf das Kriterium „Arbeitsergebnisse“. In den Kurs-Einstellungen können Sie ein anderes Kriterium wählen.' }
          ]
        },
        {
          id: 'faq-fehlzeiten',
          title: 'Wie erfasse ich unentschuldigte Fehlzeiten?',
          body: [
            { t: 'p', v: 'Über „Unentschuldigte Fehlzeiten“. In der **Ansicht Schüler/in** tippen Sie im Raster die Tage an, an denen jemand gefehlt hat; in der **Ansicht Datum** erfassen Sie einen Tag für mehrere Personen gleichzeitig.' },
            { t: 'p', v: 'Eine erfasste {{Unentschuldigte Fehlzeit|Fehlzeit}} vergibt automatisch 0 Punkte in allen fünf Kriterien dieses Tages. Entfernen Sie die Fehlzeit wieder, verschwinden auch diese Nullen.' },
            { t: 'p', v: 'Wenn Sie in den Kurs-Einstellungen die Unterrichtstage hinterlegt haben, zeigt das Raster nur diese Tage – das macht die Seite deutlich übersichtlicher.' }
          ]
        },
        {
          id: 'faq-unterrichtstage',
          title: 'Wie hinterlege ich die Unterrichtstage, und was bringt das?',
          body: [
            { t: 'p', v: 'In den Kurs-Einstellungen unter „Unterrichtstage“ wählen Sie die Wochentage, an denen der Kurs stattfindet. Danach zeigen die Fehlzeiten-Ansicht und die Stundeninhalte nur noch diese Tage.' },
            { t: 'p', v: 'Ändert sich der Stundenplan mitten im Schuljahr, fügen Sie mit „+ Änderung ab Datum“ ein weiteres Wochentag-Set hinzu. Die App prüft jeden Tag gegen den Plan, der an diesem Datum galt – die alten Termine bleiben also korrekt erhalten.' },
            { t: 'p', v: 'Ohne Eintrag verhält sich alles wie zuvor: Es werden alle Tage außer Sonntag angeboten. Beim Schuljahreswechsel werden die Unterrichtstage bewusst nicht übernommen, da sich Stundenpläne ändern.' }
          ]
        },
        {
          id: 'faq-stundeninhalte',
          title: 'Wie halte ich Unterrichtsinhalte fest?',
          body: [
            { t: 'p', v: 'Über das Buch-Symbol rechts oben in der weißen Box auf der Kursseite. Sie sehen die Termine des gewählten Quartals und tragen zu jedem den Inhalt ein; gespeichert wird automatisch.' },
            { t: 'p', v: 'Angezeigt werden nur die hinterlegten Unterrichtstage. Die Sortierung lässt sich zwischen ältester und jüngster zuerst umschalten, der heutige Tag ist hervorgehoben.' },
            { t: 'note', v: 'Die Stundeninhalte betreffen den Kurs, nicht einzelne Personen. Beobachtungen zu einzelnen Lernenden gehören in die Notizen auf „SoLei-Punkte vergeben“.' }
          ]
        },
        {
          id: 'faq-punktestand',
          title: 'Wo sehe ich den aktuellen Stand einer Person?',
          body: [
            { t: 'p', v: 'Auf „SoLei-Punktestand“. Die Listenansicht zeigt für alle Personen die Punktesumme von 15 und die daraus errechnete Note, am Ende der Liste den Klassendurchschnitt.' },
            { t: 'p', v: 'Tippen Sie auf eine Person, sehen Sie deren Punktekonto: alle Vergaben mit Datum, dazu Liniendiagramme je Kriterium und die Kursnotizen des Quartals. Fehlzeiten sind rot gekennzeichnet. Mit den Pfeilen blättern Sie durch die Klasse.' },
            { t: 'p', v: 'Diese Ansicht ist besonders für Notengespräche nützlich, weil sie zeigt, **woher** eine Note kommt.' }
          ]
        },
        {
          id: 'faq-quartalsnoten',
          title: 'Wie schließe ich ein Quartal ab?',
          body: [
            { t: 'p', v: 'Auf „SoLei-Quartalsnoten“. Dort steht je Person die aus den Punkten errechnete Note, darunter die Kursnotizen des Quartals als Entscheidungshilfe. Optional tragen Sie eine {{Portfolio}}- oder mündliche Prüfungsnote ein, die verrechnet wird.' },
            { t: 'p', v: 'Ein eigener Abschluss-Schritt ist nicht nötig: Das {{Quartal}} ergibt sich immer aus dem Datum Ihrer Eingaben. Nur am Ende des Schuljahres können Sie im vierten Quartal „Schuljahr abschließen“ wählen – das ist eine bewusste Markierung, die den Kurs vor versehentlichen Änderungen schützt und sich jederzeit wieder aufheben lässt.' }
          ]
        },
        {
          id: 'faq-obt',
          title: 'Wie erfasse ich Open Book Tests?',
          body: [
            { t: 'p', v: 'Auf der Seite „Open Book Tests“ wählen Sie Halbjahr und Test und tragen je Person den erreichten **Prozentwert** ein. Die Note ergibt sich daraus über den Prozent-{{Bewertungsspiegel}}; gespeichert wird automatisch.' },
            { t: 'p', v: 'Lief der Test in Moodle oder Logineo, können Sie die exportierte Ergebnisdatei (Excel oder CSV) auch direkt einlesen, statt abzutippen. Die App ordnet die Ergebnisse über die Namen zu.' },
            { t: 'p', v: 'Wie viele Tests je Halbjahr vorgesehen sind, legen Sie in den Kurs-Einstellungen fest.' }
          ]
        },
        {
          id: 'faq-klausuren',
          title: 'Wie bewerte ich eine Klausur?',
          body: [
            { t: 'p', v: 'Es gibt zwei Verfahren, umschaltbar in den Globalen Einstellungen unter „Klausurbewertung“:' },
            { t: 'ul', v: [
              '**Einfach:** Sie tragen die Maximalpunktzahl der Klausur und je Person die erreichte Gesamtpunktzahl ein.',
              '**Vollständig:** Sie legen die Aufgaben mit ihren möglichen Punkten an und tragen die Punkte je Aufgabe ein. Summe, Prozent und Note rechnet die App mit.'
            ] },
            { t: 'p', v: 'Im vollständigen Verfahren können Sie zusätzlich ein Klausurdatum (je Person überschreibbar für Nachschreiber) und einen Kommentar erfassen. Punkte über dem Aufgaben-Maximum sind als Zusatzpunkte erlaubt und werden rot dargestellt.' },
            { t: 'p', v: 'Unter der Liste steht der Notenspiegel mit Durchschnitt, den Sie separat ausdrucken können.' }
          ]
        },
        {
          id: 'faq-klausur-druck',
          title: 'Wie drucke ich Bewertungsbögen in der Reihenfolge meines Korrekturstapels?',
          body: [
            { t: 'p', v: 'Die App merkt sich, in welcher Reihenfolge Sie die Personen zuerst bewertet haben. Stellen Sie die Sortierung von „Alphabet“ auf „Eingabe“ um, stehen sie genau in der Reihenfolge Ihres Stapels – und die Bewertungsbögen kommen in derselben Ordnung aus dem Drucker.' },
            { t: 'p', v: 'Mit den Pfeilen ▲▼ sortieren Sie einzelne Personen um, etwa Nachschreiber ans Ende. „Bewertungsbögen drucken“ erzeugt eine Seite je bewerteter Person; für eine einzelne Person gibt es in der aufgeklappten Zeile „Bogen drucken (nur diese Person)“.' }
          ]
        },
        {
          id: 'faq-zeugnisnoten',
          title: 'Wie kommt die Zeugnisnote zustande?',
          body: [
            { t: 'p', v: 'Auf „Notenübersicht & Zeugnisnoten“ führt die App alles zusammen: SoLei-Quartalsnoten, {{OBT}} und Klausuren. Aus der in den Kurs-Einstellungen festgelegten {{Gewichtung}} – standardmäßig 40 % sonstige Leistungen, 20 % Open Book Tests, 40 % Klausuren – berechnet sie einen **Vorschlag** für Halbjahr und Schuljahr.' },
            { t: 'p', v: 'Eintragen und verantworten müssen Sie die Note selbst; dafür gibt es eigene Spalten. Die letzte Zeile zeigt den Klassendurchschnitt, darunter lässt sich die Entwicklung als Liniendiagramm einblenden.' },
            { t: 'p', v: 'Ein Tipp auf einen Namen öffnet die Einzelansicht mit allen Werten, optionalen Diagrammen und einem Ausdruck für das Notengespräch.' }
          ]
        },
        {
          id: 'faq-bewertungsspiegel',
          title: 'Kann ich die Notenschlüssel anpassen?',
          body: [
            { t: 'p', v: 'Ja, in den Globalen Einstellungen. Der **15-Punkte-Spiegel** wandelt die SoLei-Punktesumme in eine Note, der **Prozent-Spiegel** die Prozentwerte von Open Book Tests und Klausuren.' },
            { t: 'p', v: 'Beim Prozent-Spiegel gilt die Note je vollem Prozentpunkt, abgerundet: 65,9 % erhält also die Note der 65-%-Zeile. Beide Spiegel gelten für alle Kurse.' }
          ]
        },
        {
          id: 'faq-kurseinstellungen',
          title: 'Was stelle ich je Kurs ein?',
          body: [
            { t: 'p', v: 'In den Kurs-Einstellungen: Klasse und Fach, Anzahl der Open Book Tests und Klausuren, die {{Gewichtung}} für die Zeugnisnote, das Kriterium für die {{Ergebnis-Uploads}} und die Unterrichtstage.' },
            { t: 'p', v: 'Darunter erreichen Sie die Schülerliste, die {{SoLei-Maximalpunkte}} und die Quartalszeiträume dieses Kurses sowie „Neuer Kurs für ein anderes Fach in dieser Klasse“. Ganz unten liegt der Gefahrenbereich zum Löschen des Kurses.' },
            { t: 'note', v: 'Einstellungen speichern Sie hier bewusst über einen Button – anders als Bewertungen, die sich sofort selbst speichern.' }
          ]
        },
        {
          id: 'faq-maxpoints',
          title: 'Wozu dienen die SoLei-Maximalpunkte, und wann ändere ich sie?',
          body: [
            { t: 'p', v: 'Die {{SoLei-Maximalpunkte}} in den Kurs-Einstellungen legen fest, wie viele Punkte je Kriterium und {{Quartal}} höchstens erreichbar sind. In Summe ergeben sie immer 15.' },
            { t: 'p', v: 'Standardmäßig sind es 3 Punkte je Kriterium. Wollen Sie z. B. in einem Quartal eine Klasse motivieren, ruhiger zu arbeiten, können Sie für das Kriterium „Sozialkompetenz“ die Maximalpunktzahl von 3 auf 6 Punkte erhöhen und im Gegenzug die Maximalpunktzahl von zwei anderen Kriterien auf 1,5 Punkte senken. So kommen Sie in Summe wieder auf 15 Punkte.' },
            { t: 'p', v: 'Die Werte gelten je Quartal, Sie können also von Quartal zu Quartal andere Schwerpunkte setzen.' }
          ]
        },
        {
          id: 'faq-quartalszeitraeume',
          title: 'Kann ich die Quartalszeiträume ändern?',
          body: [
            { t: 'p', v: 'Ja. Die App schlägt sie aus dem ersten Schultag und den Schulferien vor – je etwa zehn Schulwochen. In den Kurs-Einstellungen unter „Quartalszeiträume dieses Kurses“ passen Sie Anfang und Ende von Hand an, etwa bei abweichendem Blockbeginn.' },
            { t: 'p', v: 'Die Anpassung gilt nur für diesen Kurs; andere Kurse behalten die Vorgabe des Schuljahres.' }
          ]
        },
        {
          id: 'faq-schuelerliste',
          title: 'Wie pflege ich die Schülerliste?',
          body: [
            { t: 'p', v: 'Über die Kurs-Einstellungen, Punkt „Schülerliste bearbeiten“. Namen können Sie einzeln eintragen oder über „Aus Excel einfügen“ als Block übernehmen – letzteres ist bei ganzen Klassen deutlich schneller.' },
            { t: 'p', v: 'Die Liste gehört zur **Klasse**, nicht zum Kurs: Unterrichten Sie dieselbe Klasse in zwei Fächern, pflegen Sie die Liste nur einmal. Neben den Namen können Sie Kontaktdaten und den Ausbildungsbetrieb hinterlegen.' },
            { t: 'p', v: 'Wird jemand entfernt, verschwindet die Person aus allen Sitzplänen; erfasste Bewertungen dieser Person werden mit gelöscht.' }
          ]
        },
        {
          id: 'faq-zweiter-kurs',
          title: 'Wie lege ich einen zweiten Kurs für dieselbe Klasse an?',
          body: [
            { t: 'p', v: 'In den Kurs-Einstellungen über „Neuer Kurs für ein anderes Fach in dieser Klasse“. Die Klasse ist dann bereits ausgewählt, die Schülerliste samt Fotos wird weiterverwendet.' },
            { t: 'p', v: 'Übernommen werden außerdem die Einstellungen, die {{SoLei-Maximalpunkte}} und die Sitzpläne – alles vor dem Speichern änderbar. Nicht übernommen werden Bewertungsdaten und die Unterrichtstage, da ein anderes Fach meist an anderen Wochentagen liegt.' }
          ]
        },
        /* ===== Schuljahr, Sicherung, Geräte ===== */
        {
          id: 'faq-schuljahr',
          title: 'Wie lege ich ein neues Schuljahr an?',
          body: [
            { t: 'p', v: 'In den [[app:settings|Globalen Einstellungen]] unter „Schuljahre“. Die App schlägt den ersten Schultag als ersten Werktag nach den Sommerferien vor und berechnet daraus die vier {{Quartal|Quartale}}.' },
            { t: 'p', v: 'Auf der Startseite schalten Sie zwischen den Schuljahren um. Frühere Schuljahre bleiben vollständig erhalten und einsehbar.' }
          ]
        },
        {
          id: 'faq-schuljahreswechsel',
          title: 'Wie übernehme ich Klassen ins neue Schuljahr?',
          body: [
            { t: 'p', v: 'Über den Schuljahreswechsel-Assistenten: neues Schuljahr anlegen, dann „Aus einem früheren Schuljahr übernehmen“. Sie wählen die Kurse aus, die weiterlaufen sollen.' },
            { t: 'p', v: 'Übernommen werden Klassen mit Schülerlisten und Fotos sowie die Kurseinstellungen, Maximalpunkte und Sitzpläne. **Bewertungsdaten bleiben im alten Schuljahr** – der neue Kurs startet leer im 1. Quartal. Die Unterrichtstage müssen Sie neu festlegen, da sich Stundenpläne ändern.' },
            { t: 'p', v: 'Klassennamen lassen sich beim Übernehmen anpassen, etwa von „AK25A“ auf „AK26A“.' }
          ]
        },
        {
          id: 'faq-backup',
          title: 'Wie sichere ich meine Daten?',
          body: [
            { t: 'p', v: 'In den [[app:settings|Globalen Einstellungen]] unter „Datensicherung“. Das {{Backup}} ist verschlüsselt und enthält alle Schuljahre, Kurse, Bewertungen und Fotos.' },
            { t: 'warn', v: 'Das Backup ist Ihre einzige Absicherung gegen Geräteverlust, Defekt und versehentliches Löschen. Erstellen Sie es regelmäßig – am besten am Ende jedes Quartals.' },
            { t: 'p', v: 'Hier unterscheiden sich die Geräte:' },
            { t: 'ul', v: [
              '**PC/Mac mit Chrome oder Edge:** Sie können einen Ordner auswählen – etwa einen synchronisierten OneDrive- oder Google-Drive-Ordner. Die App sichert dann auf Wunsch automatisch dorthin.',
              '**iPhone/iPad und Safari:** Die Ordnerauswahl gibt es dort nicht. Sie laden die Backup-Datei stattdessen herunter und legen sie in der App „Dateien“ ab, gerne in iCloud.',
              '**Android:** Die Datei landet im Download-Ordner und lässt sich von dort weiterverschieben.'
            ] }
          ]
        },
        {
          id: 'faq-zweites-geraet',
          title: 'Wie bekomme ich meine Daten auf ein zweites Gerät?',
          body: [
            { t: 'p', v: 'Über ein {{Backup}}: Auf dem ersten Gerät ein Backup erstellen, die Datei auf das zweite Gerät übertragen (USB-Stick, Cloud-Ordner, E-Mail an sich selbst) und dort in den Globalen Einstellungen einspielen.' },
            { t: 'warn', v: 'Es gibt **keine** automatische Synchronisierung zwischen Geräten. Arbeiten Sie parallel auf zwei Geräten, überschreibt das Einspielen eines Backups die dortigen Daten. Legen Sie sich am besten auf ein Hauptgerät fest.' }
          ]
        },
        {
          id: 'faq-plattformen',
          title: 'Was ist auf welchem Gerät anders?',
          body: [
            { t: 'ul', v: [
              '**Installation:** PC/Android per Button in einem Schritt; iPhone/iPad über Safari, Teilen-Symbol, „Zum Home-Bildschirm“. Firefox am PC kann nicht installieren.',
              '**Datenspeicher:** Auf iPhone/iPad haben Browser und installierte App getrennte Speicher. Safari löscht die Daten nicht installierter Websites zudem nach etwa sieben Tagen ohne Nutzung.',
              '**Backup:** Ordnerauswahl nur in Chrome/Edge am PC; sonst Datei-Download.',
              '**Entsperren:** Face ID oder Touch ID auf Apple-Geräten, Fingerabdruck auf Android, Windows Hello am PC – sofern das Gerät es unterstützt.',
              '**Zurück-Geste:** Auf Android führt die Systemgeste zurück; auf iPad und PC nutzen Sie den Zurück-Pfeil oben links.'
            ] }
          ]
        },
        {
          id: 'faq-pin',
          title: 'Kann ich PIN oder Passwort ändern – und was, wenn ich es vergesse?',
          body: [
            { t: 'p', v: 'Ändern ja: Globale Einstellungen, Abschnitt „Zugangsschutz & Verschlüsselung“. Dort aktivieren Sie auch das Entsperren per Fingerabdruck oder Gesichtserkennung, sofern Ihr Gerät das unterstützt.' },
            { t: 'warn', v: 'Vergessen bedeutet **endgültigen Datenverlust**. Es gibt keine Wiederherstellung, auch nicht durch den Entwickler – ohne Passwort existiert kein Schlüssel zu den {{Verschlüsselung|verschlüsselten}} Daten. Notieren Sie es außerhalb des Geräts und legen Sie regelmäßig ein {{Backup}} an.' }
          ]
        },
        {
          id: 'faq-export',
          title: 'Wie exportiere ich Noten nach Excel oder als PDF?',
          body: [
            { t: 'p', v: 'Auf „Notenübersicht & Zeugnisnoten“ finden Sie „Als Excel-Datei exportieren“ und „Drucken / als PDF speichern“. Für ganze Schuljahre gibt es in den Globalen Einstellungen unter „Schuljahre“ den „Excel-Export aller Schuljahresdaten“ mit allen Rohdaten je Kurs.' },
            { t: 'warn', v: 'Exportierte Dateien sind – anders als das {{Backup}} – **nicht verschlüsselt** und enthalten Namen und Noten im Klartext. Speichern Sie sie nur auf geschützten Geräten und versenden Sie sie nicht ungeschützt.' }
          ]
        },
        {
          id: 'faq-schuljahr-loeschen',
          title: 'Wie werde ich alte Daten wieder los?',
          body: [
            { t: 'p', v: 'Einzelne Kurse löschen Sie in den Kurs-Einstellungen im Gefahrenbereich, ganze Schuljahre in den Globalen Einstellungen unter „Schuljahre“. Beides verlangt eine bewusste Bestätigung – den Kursnamen beziehungsweise Ihr Passwort.' },
            { t: 'p', v: 'Vor dem Löschen eines Schuljahres empfiehlt sich ein Export: Die Notenübersichten lassen sich als Excel-Datei oder PDF archivieren.' },
            { t: 'p', v: 'Das letzte verbliebene Schuljahr lässt sich nicht löschen. Wollen Sie ganz von vorn beginnen, hilft nur das vollständige Zurücksetzen der App – erreichbar auf dem Sperrbildschirm über „PIN vergessen?“ bzw. „Passwort vergessen?“. Dabei gehen alle Daten auf diesem Gerät unwiderruflich verloren.' }
          ]
        },
        {
          id: 'faq-demo',
          title: 'Wie führe ich die App vor, ohne echte Daten zu zeigen?',
          body: [
            { t: 'p', v: 'Mit dem {{Demo-Modus}} in den [[app:settings|Globalen Einstellungen]]. Er zeigt zwei erfundene Klassen mit drei Kursen; die Quartale 1 bis 3 sind bewertet, das vierte ist leer, sodass Sie jede Eingabe live vorführen können.' },
            { t: 'p', v: 'Ihre echten Daten bleiben unangetastet, ein oranges Band weist dauerhaft auf den Demo-Modus hin, und beim Beenden verschwinden alle Demo-Änderungen. Die Beispieldaten sind bei jedem Start identisch.' },
            { t: 'warn', v: 'Im Demo-Modus wird nichts dauerhaft gespeichert – er ist nicht für die produktive Arbeit geeignet.' }
          ]
        },
        {
          id: 'faq-offline',
          title: 'Funktioniert die App ohne Internet?',
          body: [
            { t: 'p', v: 'Ja, nach der Installation vollständig. Die App lädt aus dem Gerätespeicher, und alle Daten liegen ohnehin lokal.' },
            { t: 'p', v: 'Internet brauchen Sie nur zweimal: beim ersten Laden der App und beim Anlegen eines Schuljahres, wenn die Schulferien abgerufen werden. Klappt der Abruf nicht, können Sie das Schuljahr auch ohne Ferientermine anlegen und die Quartalszeiträume später anpassen.' }
          ]
        },
        {
          id: 'faq-update',
          title: 'Wie bekomme ich Aktualisierungen?',
          body: [
            { t: 'p', v: 'Automatisch. Sobald eine neue Fassung vorliegt und Sie online sind, erscheint oben ein Hinweis mit dem Button „Jetzt aktualisieren“. Ihre Daten bleiben dabei unverändert erhalten.' },
            { t: 'p', v: 'Die installierte Version sehen Sie ganz unten auf jeder Seite unter „Über diese App“.' }
          ]
        },
        {
          id: 'faq-fehler',
          title: 'Etwas funktioniert nicht – was kann ich tun?',
          body: [
            { t: 'p', v: 'Erscheint eine Fehlermeldung beim Seitenaufbau, sind Ihre Daten davon nicht betroffen; die Meldung betrifft nur die Anzeige. Verlassen Sie die Seite und öffnen Sie sie erneut.' },
            { t: 'p', v: 'Hilft das nicht, laden Sie die App neu (am PC mit Strg+F5). Bleibt das Problem bestehen, erstellen Sie ein {{Backup}} und melden den Fehler an die Adresse unter „Über diese App“ – mit der Angabe, welches Gerät Sie nutzen und was Sie zuletzt getan haben.' }
          ]
        }
      ]
    },

    /* ---------------------------------------------------------------- */
    {
      id: 'glossar',
      title: 'Glossar',
      lead: 'Fachbegriffe aus SOL-Noten, kurz erklärt.',
      isGlossary: true,
      chapters: []
    },

    /* ---------------------------------------------------------------- */
    {
      id: 'datenschutz',
      title: 'Datenschutz-Kurzinformation',
      lead: 'Technische Information als Grundlage für die schulische Datenschutzprüfung – zum Ausdrucken.',
      printTitle: 'SOL-Noten – Datenschutz-Kurzinformation',
      chapters: [
        {
          id: 'ds-zweck',
          title: 'Wozu dient diese Kurzinformation?',
          body: [
            { t: 'p', v: 'Diese Information beschreibt in einfachen Worten, wie SOL-Noten mit Daten umgeht. Sie richtet sich an Lehrkräfte, Schulleitungen und schulische Datenschutzbeauftragte und soll die Prüfung erleichtern.' },
            { t: 'warn', v: 'Dieses Blatt ist **keine** datenschutzrechtliche Freigabe und ersetzt sie nicht. Ob und unter welchen Bedingungen die App eingesetzt werden darf, entscheidet Ihre Schulleitung. Der Entwickler ist kein Jurist und kann keine Rechtsberatung leisten.' }
          ]
        },
        {
          id: 'ds-wo',
          title: 'Wo werden die Daten gespeichert?',
          body: [
            { t: 'p', v: 'Ausschließlich auf dem Gerät, auf dem Sie die App benutzen. SOL-Noten hat **keinen Server**, auf dem Noten liegen, und **kein Benutzerkonto**. Niemand außer Ihnen kann diese Daten einsehen.' },
            { t: 'p', v: 'Technisch liegen die Daten in einem geschützten Speicherbereich des Browsers, der nur dieser App zugänglich ist. Andere Webseiten oder Apps können nicht darauf zugreifen.' }
          ]
        },
        {
          id: 'ds-verschluesselung',
          title: 'Wie sind die Daten geschützt?',
          body: [
            { t: 'p', v: 'Alle Daten werden verschlüsselt gespeichert. Verschlüsseln bedeutet: Die Daten werden in eine unlesbare Form umgewandelt, die sich nur mit dem richtigen Passwort zurückrechnen lässt. Wer das Gerät in die Hand bekommt, sieht ohne Passwort also keine Namen und keine Noten.' },
            { t: 'p', v: 'Verwendet wird das Verfahren AES-256-GCM – derselbe Standard, den Banken und Behörden einsetzen. Das Passwort selbst wird nicht gespeichert; aus ihm wird der Schlüssel jedes Mal neu berechnet, und zwar absichtlich langsam (310.000 Rechenrunden), damit systematisches Durchprobieren aussichtslos wird.' },
            { t: 'p', v: 'Auf Geräten mit Fingerabdruck- oder Gesichtserkennung kann das Entsperren zusätzlich darüber erfolgen.' }
          ]
        },
        {
          id: 'ds-internet',
          title: 'Werden Daten ins Internet übertragen?',
          body: [
            { t: 'p', v: 'Schülerdaten: **nein.** Sie verlassen das Gerät nur, wenn Sie ein verschlüsseltes Backup speichern, eine Excel-Datei exportieren oder etwas ausdrucken.' },
            { t: 'p', v: 'Es gibt genau **eine** Verbindung nach außen, und die ist der Vollständigkeit halber genannt: Beim Anlegen eines Schuljahres ruft die App die Schulferien vom kostenlosen Dienst OpenHolidays ab. Übertragen werden dabei nur Bundesland und Zeitraum – keine Namen, keine Noten, keine Kennung Ihrer Person. Das Bundesland wird beim ersten Start abgefragt; der Abruf erfolgt automatisch, sobald ein Schuljahr angelegt wird. Lässt er sich nicht durchführen, können Sie das Schuljahr auch ohne Ferientermine anlegen. Die Quartalszeiträume sind anschließend je Kurs von Hand anpassbar.' },
            { t: 'p', v: 'Die App selbst wird als Sammlung statischer Dateien über GitHub Pages ausgeliefert. Beim Laden entstehen dort – wie bei jedem Webseitenaufruf – technische Zugriffsdaten einschließlich IP-Adresse. Nach der Installation lädt die App aus dem Gerätespeicher und funktioniert ohne Internetverbindung. Es sind keine Werbe- oder Analysedienste eingebunden, keine Cookies zur Nachverfolgung und keine Schriftarten oder Skripte von fremden Servern.' }
          ]
        },
        {
          id: 'ds-verantwortung',
          title: 'Wer ist verantwortlich, und was ist zu beachten?',
          body: [
            { t: 'p', v: 'Da alle Daten auf dem Gerät der Lehrkraft bleiben, liegt die Verantwortung für ihren Schutz bei der Lehrkraft. Ein Auftragsverarbeitungsvertrag mit dem Entwickler ist nicht erforderlich, weil keine Daten an ihn übermittelt werden.' },
            { t: 'ul', v: [
              'App mit PIN, Passwort oder biometrischem Login schützen.',
              'Regelmäßig ein {{Backup}} anlegen – Backups sind verschlüsselt.',
              'Exportierte Excel- und PDF-Dateien sind nicht verschlüsselt und enthalten Namen und Noten im Klartext. Nur auf geschützten Geräten speichern und nicht ungeschützt weitergeben, etwa per unverschlüsselter E-Mail.',
              'Fotos von Lernenden nur mit der erforderlichen Einwilligung erfassen; sie werden ebenfalls verschlüsselt gespeichert.',
              'Beim Gerätewechsel ein verschlüsseltes {{Backup}} anlegen (Globale Einstellungen), auf einen externen Datenträger speichern, die App auf dem neuen Gerät installieren und die Backup-Datei dort einspielen (Globale Einstellungen).',
              'Beim Ausscheiden aus der Schule Daten löschen (Globale Einstellungen) beziehungsweise das Gerät zurücksetzen.'
            ] },
            { t: 'p', v: 'Verarbeitet werden je Lernenden: Name, Klasse, Kurs, Bewertungen, Fehlzeiten und optional Kontaktdaten, Ausbildungsbetrieb sowie ein Foto. Die Daten werden zur Leistungsbewertung verarbeitet und bleiben bis zur Löschung durch die Lehrkraft erhalten.' }
          ]
        }
      ]
    }
  ];

  /* ================= Kontextbezogene Hilfe =================
     Ordnet einer App-Seite (Routenname) ein Hilfekapitel zu. Wird in
     Lieferung 2 um die FAQ-Kapitel erweitert. */
  var CONTEXT = {
    home: 'faq-startseite',
    course: 'faq-kursseite',
    capture: 'faq-punkte',
    seating: 'faq-sitzplan',
    pointstand: 'faq-punktestand',
    protokoll: 'faq-punktestand',
    uploads: 'faq-uploads',
    absences: 'faq-fehlzeiten',
    quarterReview: 'faq-quartalsnoten',
    obt: 'faq-obt',
    klausuren: 'faq-klausuren',
    grades: 'faq-zeugnisnoten',
    report: 'faq-zeugnisnoten',
    lessonContents: 'faq-stundeninhalte',
    editCourse: 'faq-kurseinstellungen',
    maxPoints: 'faq-maxpoints',
    quarterDates: 'faq-quartalszeitraeume',
    students: 'faq-schuelerliste',
    settings: 'faq-backup',
    yearTransfer: 'faq-schuljahreswechsel',
    setupYear: 'faq-schuljahr'
  };

  function pageById(id) {
    for (var i = 0; i < PAGES.length; i++) if (PAGES[i].id === id) return PAGES[i];
    return null;
  }

  function chapterById(chapterId) {
    for (var i = 0; i < PAGES.length; i++) {
      var ch = PAGES[i].chapters;
      for (var j = 0; j < ch.length; j++) {
        if (ch[j].id === chapterId) return { page: PAGES[i], chapter: ch[j] };
      }
    }
    return null;
  }

  /* Reiner Text eines Kapitels – für Suche und Druck. */
  function plainText(body) {
    return (body || []).filter(function (b) { return b.t !== 'mock'; }).map(function (b) {
      var v = Array.isArray(b.v) ? b.v.join(' ') : b.v;
      return String(v).replace(/\{\{(.+?)\}\}/g, '$1').replace(/\*\*/g, '');
    }).join(' ');
  }

  return {
    PAGES: PAGES, GLOSSARY: GLOSSARY, CONTEXT: CONTEXT,
    glossaryFor: glossaryFor, pageById: pageById, chapterById: chapterById,
    plainText: plainText
  };
});
