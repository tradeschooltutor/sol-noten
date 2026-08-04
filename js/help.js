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
    { term: 'Wiederherstellungsschlüssel', def: 'Eine 24-stellige Zeichenfolge, die bei der Einrichtung erzeugt wird und dieselben Daten öffnet wie PIN oder Passwort. Sie ist der Ersatzweg in die App, wenn der normale Zugang vergessen wurde – notiert oder ausgedruckt, getrennt vom Gerät aufbewahrt. Die App zeigt ihn nur einmal an; später lässt sich nur ein neuer erzeugen, der den alten ungültig macht.' },
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
            { t: 'p', v: 'SOL-Noten ist eine so genannte {{PWA}} (Progressive Web App) – eine Website, die sich wie eine App installieren lässt. Sie läuft zwar auch im Browser, **Sie sollten sie aber am besten jetzt direkt auf Ihrem Gerät installieren. Dadurch haben Sie folgende Vorteile:**' },
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
            { t: 'p', v: 'Die Installation ist jederzeit nachholbar: [[app:settings|Globale Einstellungen]], Abschnitt „App-Installation“. Solange die App nicht installiert ist, erinnert der Startbildschirm alle drei Tage daran – bewusst häufiger als die etwa sieben Tage, nach denen Safari die Daten nicht installierter Websites löscht. Sobald die App installiert ist, erscheint die Erinnerung nicht mehr.' },
            { t: 'warn', v: 'Wenn Sie auf iPhone oder iPad **die App nicht installieren und stattdessen im Safari-Browser weiterarbeiten**, drohen Ihnen zwei Probleme. Erstens erscheinen diese Daten später nicht in der installierten App, weil beide getrennte Speicher haben. Zweitens – und das ist der gefährlichere Punkt – löscht Safari die Daten von Websites, die nicht auf dem Home-Bildschirm liegen, nach etwa sieben Tagen ohne Nutzung automatisch. Nach den Ferien könnten Ihre Noten also verschwunden sein.' },
            { t: 'p', v: 'Falls Sie bereits im Browser gearbeitet haben, gehen die Daten aber nicht verloren: Erstellen Sie **im Browser** ein {{Backup}} (Globale Einstellungen → Datensicherung), installieren Sie dann die App und spielen Sie das Backup dort wieder ein.' }
          ]
        },
        {
          id: 'start-pin',
          title: 'Verschlüsselung, PIN/Passwort und eine wichtige Warnung',
          body: [
            { t: 'p', v: 'SOL-Noten speichert alle Daten {{Verschlüsselung|verschlüsselt}} – also in einer Form, die ohne Ihr Passwort unlesbar ist. Der Vorteil: Selbst wenn Ihr Gerät verloren geht oder in fremde Hände gerät, sind Namen und Noten geschützt. Ihre PIN oder Ihr Passwort ist dabei der einzige Schlüssel; er wird nirgends gespeichert, sondern bei jedem Entsperren aus Ihrer Eingabe neu berechnet. Ausführlich beschreibt das die [[help:ds-verschluesselung|Datenschutz-Kurzinformation]].' },
            { t: 'warn', v: 'Wenn Sie PIN oder Passwort vergessen **und** den Wiederherstellungsschlüssel nicht mehr haben, sind Ihre Daten endgültig verloren. Es gibt keine Hintertür – auch nicht für den Entwickler. Das ist kein Versäumnis, sondern die Kehrseite echter {{Verschlüsselung}}: Ohne Schlüssel existiert kein Weg zu den Daten.' },
            { t: 'p', v: 'Deshalb erzeugt die App direkt bei der Einrichtung einen {{Wiederherstellungsschlüssel}} – eine 24-stellige Zeichenfolge, die dieselben Daten öffnet. Sie wird **nur einmal** angezeigt; danach fragt die App zur Kontrolle zwei Abschnitte ab. Drucken Sie den Schlüssel aus oder notieren Sie ihn und bewahren Sie ihn getrennt vom Gerät auf – etwa zu Hause oder in einem Passwort-Manager. Wer ihn hat, kommt an die Daten.' },
            { t: 'p', v: 'Drei Empfehlungen daraus: PIN bzw. Passwort außerhalb des Geräts notieren, den Wiederherstellungsschlüssel sicher verwahren und regelmäßig ein {{Backup}} anlegen. Ein Backup schützt zugleich gegen Geräteverlust, Defekt und versehentliches Löschen.' }
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
      groups: [
        'Erste Orientierung',
        'Sonstige Leistungen (SoLei)',
        'Weitere Prüfungsleistungen',
        'Auswertung',
        'Kurs-Einstellungen',
        'Klassen & Schuljahre',
        'Globale Einstellungen',
        'Gerät & Technik'
      ],
      title: 'FAQ',
      lead: 'Häufige Fragen zu allen Funktionen – über das Suchfeld schnell zu finden.',
      searchable: true,
      chapters: [
        /* ===== Grundlagen ===== */
        {
          id: 'faq-startseite',
          group: 'Erste Orientierung',
          title: 'Was sehe ich auf der Startseite?',
          body: [
            { t: 'p', v: 'Alle Kurse des ausgewählten Schuljahres als Kacheln. Ein Kurs ist immer eine Klasse in einem Fach – dieselbe Klasse kann also mehrere Kurse haben. Ein Tipp auf die Kachel öffnet den Kurs.' },
            { t: 'p', v: 'Oben rechts erreichen Sie Hilfe und Globale Einstellungen, darunter wechseln Sie bei Bedarf das Schuljahr. Ganz unten legen Sie mit „+ Kurs anlegen“ einen weiteren Kurs an.' }
          ]
        },
        {
          id: 'faq-kursseite',
          group: 'Erste Orientierung',
          title: 'Wie ist die Kursseite aufgebaut?',
          body: [
            { t: 'p', v: 'In drei Bereiche. **Sonstige Leistungen** enthält alles, was im laufenden Unterricht entsteht: Punkte vergeben, Sitzplan, Punktestand, {{Ergebnis-Uploads}}, Fehlzeiten und Quartalsnoten. **Weitere Prüfungsleistungen** umfasst {{OBT}} und Klausuren. **Auswertung** führt zur Notenübersicht mit den {{Zeugnisnote|Zeugnisnoten}}.' },
            { t: 'p', v: 'Ganz oben steht das aktuelle {{Quartal}} mit seinem Zeitraum, rechts daneben das Buch-Symbol für die Stundeninhalte. Darunter finden Sie die Kurs-Einstellungen.' }
          ]
        },
        {
          id: 'faq-solei-note',
          group: 'Sonstige Leistungen (SoLei)',
          title: 'Wie entsteht die SoLei-Note?',
          body: [
            { t: 'p', v: 'Über das {{Quartal}} vergeben Sie Punkte in den fünf {{SoLei-Kriterien}}. Am Quartalsende bildet die App je Kriterium den Durchschnitt Ihrer Vergaben, addiert diese fünf Durchschnitte und erhält so eine Summe von höchstens 15 Punkten. Aus dieser Summe wird über den 15-Punkte-{{Bewertungsspiegel}} die Note.' },
            { t: 'p', v: 'Entscheidend ist: Es zählt der **Durchschnitt**, nicht die Summe aller Einzelvergaben. Sie können also so oft bewerten, wie Sie möchten – wer selten drankommt, wird dadurch nicht benachteiligt.' },
            { t: 'p', v: 'Optional können Sie auf der Seite „SoLei-Quartalsnoten“ zusätzlich eine {{Portfolio}}- oder mündliche Prüfungsnote eintragen; sie wird dann mit der Punktenote verrechnet.' }
          ]
        },
        {
          id: 'faq-punkte',
          group: 'Sonstige Leistungen (SoLei)',
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
              '**5 – Durchschnitt im geöffneten Kriterium:** Das ø-Zeichen bezieht sich nur auf das Kriterium, das Sie gerade bewerten. Hier hat Anna Meier in diesem Kriterium bisher im Schnitt 3,0 Punkte je Vergabe erhalten.'
            ] },
            { t: 'note', v: 'Die drei Zahlen ändern sich sofort mit jeder Vergabe. Sie sind als Orientierung während des Unterrichts gedacht – „wo steht diese Person gerade?“ –, nicht als Zeugnisnote.' },
            { t: 'ul', v: [
              '**6 – Tipp-Buttons:** Die möglichen Punktwerte, abgeleitet aus den {{SoLei-Maximalpunkte|Maximalpunkten}} des Kriteriums.',
              '**7 – Kursnotiz (aufgeklappt):** Der Text gehört zu dieser Person **und** zu dem oben eingestellten Datum.'
            ] },
            { t: 'p', v: '**Die Kursnotiz** (Symbol 2) ist eine kurze Beobachtung zu einer Person an einem Tag, zum Beispiel „hat heute die Gruppe gut moderiert“ oder „ohne Material erschienen“. Pro Person und Datum ist eine Notiz möglich; sie speichert sich beim Verlassen des Feldes, leerer Text löscht sie wieder. Wiedergefunden werden die Notizen auf „SoLei-Quartalsnoten“ und in der Einzelansicht des SoLei-Punktestands – also genau dann, wenn Sie die Quartalsnote festlegen oder ein Notengespräch vorbereiten.' },
            { t: 'note', v: 'Die Eingabe erfolgt standardmäßig zum aktuellen **Datum**. Sie können jedoch auch ein anderes Datum auswählen (Auswahlfeld oben links), um Eintragungen nachzuholen. Ihre Eintragungen wirken sich anhand des ausgewählten Datums automatisch auf die passende {{Quartal|Quartalsnote}} aus.' }
          ]
        },
        {
          id: 'faq-sitzplan',
          group: 'Sonstige Leistungen (SoLei)',
          title: 'Wofür ist der Sitzplan gut?',
          body: [
            { t: 'p', v: 'Er ist ein weiterer Weg zur SoLei-Punktevergabe: Sie sehen die Klasse so, wie sie vor Ihnen sitzt, tippen auf eine Person und vergeben die Punkte. Im Modus „Sitzplan bearbeiten“ ordnen Sie die Plätze an, im Modus „SL-Punkte geben“ bewerten Sie.' },
            { t: 'p', v: 'Wechselt die Klasse den Raum, legen Sie mehrere Sitzpläne an und schalten oben rechts um. Die Namen vergeben Sie frei – meist die Raumnummer. „Duplizieren“ übernimmt die aktuelle Anordnung als Ausgangspunkt.' },
            { t: 'p', v: 'Fotos sind optional. Ohne Fotos zeigt der Plan die Namenskürzel.' }
          ]
        },
        {
          id: 'faq-fotos',
          group: 'Sonstige Leistungen (SoLei)',
          title: 'Wie funktionieren die Fotos, und ist das datenschutzkonform?',
          body: [
            { t: 'p', v: 'Fotos erfassen Sie im Reiter „Fotos verwalten“ auf der Sitzplan-Seite. Sie werden verkleinert und wie alle anderen Daten {{Verschlüsselung|verschlüsselt}} auf dem Gerät gespeichert – sie verlassen es nicht.' },
            { t: 'p', v: 'Die Fotos hängen an der Person, nicht am Kurs: Wer eine Klasse in zwei Fächern unterrichtet, erfasst sie nur einmal. Beim Schuljahreswechsel wandern sie automatisch mit.' },
            { t: 'warn', v: 'Für Fotos von Lernenden brauchen Sie die nach Ihrem Landesrecht erforderliche Einwilligung. Die App kann Ihnen diese Prüfung nicht abnehmen.' }
          ]
        },
        {
          id: 'faq-uploads',
          group: 'Sonstige Leistungen (SoLei)',
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
          group: 'Sonstige Leistungen (SoLei)',
          title: 'Wie erfasse ich unentschuldigte Fehlzeiten?',
          body: [
            { t: 'p', v: 'Über „Unentschuldigte Fehlzeiten“. In der **Ansicht Schüler/in** tippen Sie im Raster die Tage an, an denen jemand gefehlt hat; in der **Ansicht Datum** erfassen Sie einen Tag für mehrere Personen gleichzeitig.' },
            { t: 'p', v: 'Eine erfasste {{Unentschuldigte Fehlzeit|Fehlzeit}} vergibt automatisch 0 Punkte in allen fünf Kriterien dieses Tages. Entfernen Sie die Fehlzeit wieder, verschwinden auch diese Nullen.' },
            { t: 'p', v: 'Wenn Sie in den Kurs-Einstellungen die Unterrichtstage hinterlegt haben, zeigt das Raster nur diese Tage – das macht die Seite deutlich übersichtlicher.' }
          ]
        },
        {
          id: 'faq-unterrichtstage',
          group: 'Kurs-Einstellungen',
          title: 'Wie hinterlege ich die Unterrichtstage, und was bringt das?',
          body: [
            { t: 'p', v: 'In den Kurs-Einstellungen unter „Unterrichtstage“ wählen Sie die Wochentage, an denen der Kurs stattfindet. Danach zeigen die Fehlzeiten-Ansicht und die Stundeninhalte nur noch diese Tage.' },
            { t: 'p', v: 'Ändert sich der Stundenplan mitten im Schuljahr, fügen Sie mit „+ Änderung ab Datum“ ein weiteres Wochentag-Set hinzu. Die App prüft jeden Tag gegen den Plan, der an diesem Datum galt – die alten Termine bleiben also korrekt erhalten.' },
            { t: 'p', v: 'Ohne Eintrag verhält sich alles wie zuvor: Es werden alle Tage außer Sonntag angeboten. Beim Schuljahreswechsel werden die Unterrichtstage bewusst nicht übernommen, da sich Stundenpläne ändern.' }
          ]
        },
        {
          id: 'faq-stundeninhalte',
          group: 'Sonstige Leistungen (SoLei)',
          title: 'Wie halte ich Unterrichtsinhalte fest?',
          body: [
            { t: 'p', v: 'Über das Buch-Symbol rechts oben in der weißen Box auf der Kursseite. Sie sehen die Termine des gewählten Quartals und tragen zu jedem den Inhalt ein; gespeichert wird automatisch.' },
            { t: 'p', v: 'Angezeigt werden nur die hinterlegten Unterrichtstage. Die Sortierung lässt sich zwischen ältester und jüngster zuerst umschalten, der heutige Tag ist hervorgehoben.' },
            { t: 'note', v: 'Die Stundeninhalte betreffen den Kurs, nicht einzelne Personen. Beobachtungen zu einzelnen Lernenden gehören in die Notizen auf „SoLei-Punkte vergeben“.' }
          ]
        },
        {
          id: 'faq-punktestand',
          group: 'Auswertung',
          title: 'Wo sehe ich den aktuellen Stand einer Person?',
          body: [
            { t: 'p', v: 'Auf „SoLei-Punktestand“. Die Listenansicht zeigt für alle Personen die Punktesumme von 15 und die daraus errechnete Note, am Ende der Liste den Klassendurchschnitt.' },
            { t: 'p', v: 'Tippen Sie auf eine Person, sehen Sie deren Punktekonto: alle Vergaben mit Datum, dazu Liniendiagramme je Kriterium und die Kursnotizen des Quartals. Fehlzeiten sind rot gekennzeichnet. Mit den Pfeilen blättern Sie durch die Klasse.' },
            { t: 'p', v: 'Diese Ansicht ist besonders für Notengespräche nützlich, weil sie zeigt, **woher** eine Note kommt.' }
          ]
        },
        {
          id: 'faq-quartalsnoten',
          group: 'Auswertung',
          title: 'Wie schließe ich ein Quartal ab?',
          body: [
            { t: 'p', v: 'Auf „SoLei-Quartalsnoten“. Dort steht je Person die aus den Punkten errechnete Note, darunter die Kursnotizen des Quartals als Entscheidungshilfe. Optional tragen Sie eine {{Portfolio}}- oder mündliche Prüfungsnote ein, die verrechnet wird.' },
            { t: 'p', v: 'Ein eigener Abschluss-Schritt ist nicht nötig: Das {{Quartal}} ergibt sich immer aus dem Datum Ihrer Eingaben. Nur am Ende des Schuljahres können Sie im vierten Quartal „Schuljahr abschließen“ wählen – das ist eine bewusste Markierung, die den Kurs vor versehentlichen Änderungen schützt und sich jederzeit wieder aufheben lässt.' }
          ]
        },
        {
          id: 'faq-obt',
          group: 'Weitere Prüfungsleistungen',
          title: 'Wie erfasse ich Open Book Tests?',
          body: [
            { t: 'p', v: 'Auf der Seite „Open Book Tests“ wählen Sie Halbjahr und Test und tragen je Person den erreichten **Prozentwert** ein. Die Note ergibt sich daraus über den Prozent-{{Bewertungsspiegel}}; gespeichert wird automatisch.' },
            { t: 'p', v: 'Lief der Test in Moodle oder Logineo, können Sie die exportierte Ergebnisdatei (Excel oder CSV) auch direkt einlesen, statt abzutippen. Die App ordnet die Ergebnisse über die Namen zu.' },
            { t: 'p', v: 'Wie viele Tests je Halbjahr vorgesehen sind, legen Sie in den Kurs-Einstellungen fest.' }
          ]
        },
        {
          id: 'faq-klausuren',
          group: 'Weitere Prüfungsleistungen',
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
          group: 'Weitere Prüfungsleistungen',
          title: 'Wie drucke ich Bewertungsbögen in der Reihenfolge meines Korrekturstapels?',
          body: [
            { t: 'p', v: 'Die App merkt sich, in welcher Reihenfolge Sie die Personen zuerst bewertet haben. Stellen Sie die Sortierung von „Alphabet“ auf „Eingabe“ um, stehen sie genau in der Reihenfolge Ihres Stapels – und die Bewertungsbögen kommen in derselben Ordnung aus dem Drucker.' },
            { t: 'p', v: 'Mit den Pfeilen ▲▼ sortieren Sie einzelne Personen um, etwa Nachschreiber ans Ende. „Bewertungsbögen drucken“ erzeugt eine Seite je bewerteter Person; für eine einzelne Person gibt es in der aufgeklappten Zeile „Bogen drucken (nur diese Person)“.' }
          ]
        },
        {
          id: 'faq-zeugnisnoten',
          group: 'Auswertung',
          title: 'Wie kommt die Zeugnisnote zustande?',
          body: [
            { t: 'p', v: 'Auf „Notenübersicht & Zeugnisnoten“ führt die App alles zusammen: SoLei-Quartalsnoten, {{OBT}} und Klausuren. Aus der in den Kurs-Einstellungen festgelegten {{Gewichtung}} – standardmäßig 40 % sonstige Leistungen, 20 % Open Book Tests, 40 % Klausuren – berechnet sie einen **Vorschlag** für Halbjahr und Schuljahr.' },
            { t: 'p', v: 'Eintragen und verantworten müssen Sie die Note selbst; dafür gibt es eigene Spalten. Die letzte Zeile zeigt den Klassendurchschnitt, darunter lässt sich die Entwicklung als Liniendiagramm einblenden.' },
            { t: 'p', v: 'Ein Tipp auf einen Namen öffnet die Einzelansicht mit allen Werten, optionalen Diagrammen und einem Ausdruck für das Notengespräch.' }
          ]
        },
        {
          id: 'faq-bewertungsspiegel',
          group: 'Kurs-Einstellungen',
          title: 'Kann ich die Notenschlüssel anpassen?',
          body: [
            { t: 'p', v: 'Ja, in den Globalen Einstellungen. Der **15-Punkte-Spiegel** wandelt die SoLei-Punktesumme in eine Note, der **Prozent-Spiegel** die Prozentwerte von Open Book Tests und Klausuren.' },
            { t: 'p', v: 'Beim Prozent-Spiegel gilt die Note je vollem Prozentpunkt, abgerundet: 65,9 % erhält also die Note der 65-%-Zeile. Beide Spiegel gelten für alle Kurse.' }
          ]
        },
        {
          id: 'faq-kurseinstellungen',
          group: 'Kurs-Einstellungen',
          title: 'Was stelle ich je Kurs ein?',
          body: [
            { t: 'p', v: 'In den Kurs-Einstellungen: Klasse und Fach, Anzahl der Open Book Tests und Klausuren, die {{Gewichtung}} für die Zeugnisnote, das Kriterium für die {{Ergebnis-Uploads}} und die Unterrichtstage.' },
            { t: 'p', v: 'Darunter erreichen Sie die Schülerliste, die {{SoLei-Maximalpunkte}} und die Quartalszeiträume dieses Kurses sowie „Neuer Kurs für ein anderes Fach in dieser Klasse“. Ganz unten liegt der Gefahrenbereich zum Löschen des Kurses.' },
            { t: 'note', v: 'Einstellungen speichern Sie hier bewusst über einen Button – anders als Bewertungen, die sich sofort selbst speichern.' }
          ]
        },
        {
          id: 'faq-maxpoints',
          group: 'Kurs-Einstellungen',
          title: 'Wozu dienen die SoLei-Maximalpunkte, und wann ändere ich sie?',
          body: [
            { t: 'p', v: 'Die {{SoLei-Maximalpunkte}} in den Kurs-Einstellungen legen fest, wie viele Punkte je Kriterium und {{Quartal}} höchstens erreichbar sind. In Summe ergeben sie immer 15.' },
            { t: 'p', v: 'Standardmäßig sind es 3 Punkte je Kriterium. Wollen Sie z. B. in einem Quartal eine Klasse motivieren, ruhiger zu arbeiten, können Sie für das Kriterium „Sozialkompetenz“ die Maximalpunktzahl von 3 auf 6 Punkte erhöhen und im Gegenzug die Maximalpunktzahl von zwei anderen Kriterien auf 1,5 Punkte senken. So kommen Sie in Summe wieder auf 15 Punkte.' },
            { t: 'p', v: 'Die Werte gelten je Quartal, Sie können also von Quartal zu Quartal andere Schwerpunkte setzen.' }
          ]
        },
        {
          id: 'faq-quartalszeitraeume',
          group: 'Kurs-Einstellungen',
          title: 'Kann ich die Quartalszeiträume ändern?',
          body: [
            { t: 'p', v: 'Ja. Die App schlägt sie aus dem ersten Schultag und den Schulferien vor – je etwa zehn Schulwochen. In den Kurs-Einstellungen unter „Quartalszeiträume dieses Kurses“ passen Sie Anfang und Ende von Hand an, etwa bei abweichendem Blockbeginn.' },
            { t: 'p', v: 'Die Anpassung gilt nur für diesen Kurs; andere Kurse behalten die Vorgabe des Schuljahres.' }
          ]
        },
        {
          id: 'faq-schuelerliste',
          group: 'Klassen & Schuljahre',
          title: 'Wie pflege ich die Schülerliste?',
          body: [
            { t: 'p', v: 'Über die Kurs-Einstellungen, Punkt „Schülerliste bearbeiten“. Namen können Sie einzeln eintragen oder über „Aus Excel einfügen“ als Block übernehmen – letzteres ist bei ganzen Klassen deutlich schneller.' },
            { t: 'p', v: 'Die Liste gehört zur **Klasse**, nicht zum Kurs: Unterrichten Sie dieselbe Klasse in zwei Fächern, pflegen Sie die Liste nur einmal. Neben den Namen können Sie Kontaktdaten und den Ausbildungsbetrieb hinterlegen.' },
            { t: 'p', v: 'Wird jemand entfernt, verschwindet die Person aus allen Sitzplänen; erfasste Bewertungen dieser Person werden mit gelöscht.' }
          ]
        },
        {
          id: 'faq-zweiter-kurs',
          group: 'Klassen & Schuljahre',
          title: 'Wie lege ich einen zweiten Kurs für dieselbe Klasse an?',
          body: [
            { t: 'p', v: 'In den Kurs-Einstellungen über „Neuer Kurs für ein anderes Fach in dieser Klasse“. Die Klasse ist dann bereits ausgewählt, die Schülerliste samt Fotos wird weiterverwendet.' },
            { t: 'p', v: 'Übernommen werden außerdem die Einstellungen, die {{SoLei-Maximalpunkte}} und die Sitzpläne – alles vor dem Speichern änderbar. Nicht übernommen werden Bewertungsdaten und die Unterrichtstage, da ein anderes Fach meist an anderen Wochentagen liegt.' }
          ]
        },
        /* ===== Schuljahr, Sicherung, Geräte ===== */
        {
          id: 'faq-schuljahr',
          group: 'Klassen & Schuljahre',
          title: 'Wie lege ich ein neues Schuljahr an?',
          body: [
            { t: 'p', v: 'In den [[app:settings|Globalen Einstellungen]] unter „Schuljahre“. Die App schlägt den ersten Schultag als ersten Werktag nach den Sommerferien vor und berechnet daraus die vier {{Quartal|Quartale}}.' },
            { t: 'p', v: 'Auf der Startseite schalten Sie zwischen den Schuljahren um. Frühere Schuljahre bleiben vollständig erhalten und einsehbar.' }
          ]
        },
        {
          id: 'faq-schuljahreswechsel',
          group: 'Klassen & Schuljahre',
          title: 'Wie übernehme ich Klassen ins neue Schuljahr?',
          body: [
            { t: 'p', v: 'Über den Schuljahreswechsel-Assistenten: neues Schuljahr anlegen, dann „Aus einem früheren Schuljahr übernehmen“. Sie wählen die Kurse aus, die weiterlaufen sollen.' },
            { t: 'p', v: 'Übernommen werden Klassen mit Schülerlisten und Fotos sowie die Kurseinstellungen, Maximalpunkte und Sitzpläne. **Bewertungsdaten bleiben im alten Schuljahr** – der neue Kurs startet leer im 1. Quartal. Die Unterrichtstage müssen Sie neu festlegen, da sich Stundenpläne ändern.' },
            { t: 'p', v: 'Klassennamen lassen sich beim Übernehmen anpassen, etwa von „AK25A“ auf „AK26A“.' }
          ]
        },
        {
          id: 'faq-backup',
          group: 'Globale Einstellungen',
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
          group: 'Globale Einstellungen',
          title: 'Wie bekomme ich meine Daten auf ein zweites Gerät?',
          body: [
            { t: 'p', v: 'Über ein {{Backup}}: Auf dem ersten Gerät ein Backup erstellen, die Datei auf das zweite Gerät übertragen (USB-Stick, Cloud-Ordner, E-Mail an sich selbst) und dort in den Globalen Einstellungen einspielen.' },
            { t: 'warn', v: 'Es gibt **keine** automatische Synchronisierung zwischen Geräten. Arbeiten Sie parallel auf zwei Geräten, überschreibt das Einspielen eines Backups die dortigen Daten. Legen Sie sich am besten auf ein Hauptgerät fest.' }
          ]
        },
        {
          id: 'faq-plattformen',
          group: 'Gerät & Technik',
          title: 'Welche Unterschiede gibt es zwischen den verschiedenen Endgeräten?',
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
          group: 'Globale Einstellungen',
          title: 'Kann ich PIN oder Passwort ändern – und was, wenn ich es vergesse?',
          body: [
            { t: 'p', v: 'Ändern ja: Globale Einstellungen, Abschnitt „Zugangsschutz & Verschlüsselung“. Dort aktivieren Sie auch das Entsperren per Fingerabdruck oder Gesichtserkennung, sofern Ihr Gerät das unterstützt.' },
            { t: 'p', v: 'Vergessen ist kein Beinbruch, **solange Sie den** {{Wiederherstellungsschlüssel}} **haben**: Auf dem Sperrbildschirm tippen Sie „PIN vergessen?“ und dann „Schlüssel eingeben“. Die App öffnet sich, **alle Daten sind unverändert vorhanden**, und Sie legen anschließend einen neuen Zugang fest. Weil der benutzte Schlüssel damit im Umlauf ist (Zettel, Datei, Zwischenablage), erzeugt die App im selben Zug einen frischen.' },
            { t: 'warn', v: 'Ohne PIN **und** ohne Wiederherstellungsschlüssel bedeutet Vergessen **endgültigen Datenverlust**. Es gibt keine Hintertür, auch nicht für den Entwickler – ohne Schlüssel existiert kein Weg zu den {{Verschlüsselung|verschlüsselten}} Daten. Dann hilft nur noch eine {{Backup|Backup-Datei}}.' },
            { t: 'p', v: 'Falls Sie Ihren Wiederherstellungsschlüssel verlegt haben: Einen neuen Schlüssel erzeugen Sie jederzeit in den [[app:settings|Globalen Einstellungen]] unter „Zugangsschutz & Verschlüsselung“. Der alte Schlüssel wird dadurch ungültig. Nötig ist dafür die Eingabe Ihrer PIN bzw. Ihres Passworts.' }
          ]
        },
        {
          id: 'faq-reset',
          group: 'Globale Einstellungen',
          title: 'Wie setze ich die App vollständig zurück?',
          body: [
            { t: 'p', v: 'Über die [[app:settings|Globalen Einstellungen]] („Zugangsschutz & Verschlüsselung“, Gefahrenbereich) oder – wenn Sie gar nicht mehr hineinkommen – auf dem Sperrbildschirm über „PIN vergessen?“. Das Zurücksetzen löscht alle Schuljahre, Klassen, Noten und Fotos auf diesem Gerät unwiderruflich. Backup-Dateien außerhalb der App bleiben erhalten.' },
            { t: 'p', v: 'Der Ablauf ist bewusst zweistufig. Zuerst tippen Sie das Wort LÖSCHEN ein. Danach entscheidet sich, wie es weitergeht:' },
            { t: 'ul', v: [
              'Mit dem {{Wiederherstellungsschlüssel}} wird **sofort** zurückgesetzt – wer ihn hat, könnte die App ohnehin öffnen.',
              'Ohne ihn wird das Zurücksetzen für **24 Stunden vorgemerkt**. In dieser Zeit erscheint auf dem Sperrbildschirm und auf der Startseite ein rotes Hinweisfeld, über das sich die Vormerkung mit einem Klick abbrechen lässt.'
            ] },
            { t: 'note', v: 'Die Wartezeit schützt vor einem naheliegenden Risiko: Ein unbeaufsichtigt liegendes Tablet ließe sich sonst in wenigen Sekunden leerräumen. Mit der Vormerkung fällt so ein Versuch auf, und ein Klick genügt, um ihn zu stoppen.' },
            { t: 'warn', v: 'Sehen Sie den Hinweis „Zurücksetzen vorgemerkt“, ohne ihn selbst ausgelöst zu haben: Brechen Sie ab und ändern Sie anschließend Ihre PIN bzw. Ihr Passwort.' }
          ]
        },
        {
          id: 'faq-export',
          group: 'Auswertung',
          title: 'Wie exportiere ich Noten nach Excel oder als PDF?',
          body: [
            { t: 'p', v: 'Auf „Notenübersicht & Zeugnisnoten“ finden Sie „Als Excel-Datei exportieren“ und „Drucken / als PDF speichern“. Für ganze Schuljahre gibt es in den Globalen Einstellungen unter „Schuljahre“ den „Excel-Export aller Schuljahresdaten“ mit allen Rohdaten je Kurs.' },
            { t: 'warn', v: 'Exportierte Dateien sind – anders als das {{Backup}} – **nicht verschlüsselt** und enthalten Namen und Noten im Klartext. Speichern Sie sie nur auf geschützten Geräten und versenden Sie sie nicht ungeschützt.' }
          ]
        },
        {
          id: 'faq-teamteaching',
          group: 'Klassen & Schuljahre',
          title: 'Wie arbeiten zwei Lehrkräfte im selben Kurs zusammen (Teamteaching)?',
          body: [
            { t: 'p', v: 'Unterrichten zwei Lehrkräfte denselben Kurs, vergeben beide SoLei-Punkte auf ihren eigenen Geräten. Eine Lehrkraft („Notengeberin“) führt den Kurs vollständig – Fehlzeiten, Ergebnis-Uploads, Prüfungen, Quartals- und Zeugnisnoten. Die zweite Lehrkraft arbeitet in einem **Partnerkurs**, der nur die Punktevergabe, den Sitzplan und den Punktestand enthält.' },
            { t: 'steps', v: [
              'Die Notengeberin exportiert den Kurs: Startseite → „Kurs-Export (Teamteaching)“. Dabei vereinbaren beide ein gemeinsames **Kurs-Passwort** (mündlich oder auf einem anderen Weg als die Datei).',
              'Die Datei wird übermittelt – per Teilen-Menü, E-Mail oder USB-Stick. Beim Teilen heißt sie z.\u202fB. „SOL-Kurs-AK26A-KPA.solkurs.txt“ (die Endung .txt ist technisch nötig, damit Android sie teilt), beim Speichern am PC „….solkurs“ – der Import versteht beides. Die Datei ist verschlüsselt und enthält nur Namen der Schüler/innen und Kurseinstellungen, keine Bewertungen, Fotos oder Kontaktdaten.',
              'Die zweite Lehrkraft importiert sie: Startseite → „Kurs-Import (Teamteaching)“, Datei z. B. aus den Downloads wählen. Nach Kurs-Passwort und Vorschau entsteht der Partnerkurs. **Auf Android** geht es direkt: Anhang antippen → „Teilen“ → SOL-Noten – die App öffnet sich sofort mit der Import-Vorschau. Das setzt voraus, dass SOL-Noten **mit Chrome installiert** wurde: Nur Chrome erzeugt auf Android ein App-Paket, das sich beim System als Teilen-Ziel anmelden kann. In der mit Edge installierten App und auf iPhone/iPad bietet das System diesen Weg nicht an – dort führt der Weg über „Speichern“ bzw. „In Dateien sichern“ und die Dateiauswahl im Import-Dialog.'
            ] },
            { t: 'p', v: 'Die Schülerliste des Partnerkurses kommt vollständig von der Notengeberin – Hinzufügen und Bearbeiten sind dort deshalb gesperrt, nur Löschen ist möglich. Kommen später Schüler/innen dazu oder ändern sich Maximalpunkte, Quartalszeiträume oder Unterrichtstage, exportiert die Notengeberin einfach erneut; der zweite Import wirkt als **Abgleich** – vorhandene Punkte bleiben unangetastet. Im Partnerkurs sind diese Einstellungen deshalb nicht änderbar: Es gibt genau eine Quelle für die Bewertungsskala, ein stilles Auseinanderlaufen ist ausgeschlossen.' },
            { t: 'note', v: 'Die Zusammenführung der vergebenen Punkte am Quartalsende (Punkte-Export bei der zweiten Lehrkraft, Punkte-Import bei der Notengeberin) folgt in einer kommenden Version.' }
          ]
        },
        {
          id: 'faq-klasse-loeschen',
          group: 'Klassen & Schuljahre',
          title: 'Wie lösche ich eine Klasse, die ich versehentlich angelegt habe?',
          body: [
            { t: 'p', v: 'In den [[app:settings|Globalen Einstellungen]] unter „Datensicherung“ im Gefahrenbereich über „Klasse löschen …“. Zur Auswahl stehen dort **nur Klassen, die in keinem Kurs verwendet werden**. Zur Bestätigung ist Ihre PIN bzw. Ihr Passwort nötig.' },
            { t: 'p', v: 'Erscheint die gewünschte Klasse nicht in der Liste, hängt noch mindestens ein Kurs daran. Löschen Sie diesen zuerst in den Kurs-Einstellungen des betreffenden Kurses; danach steht die Klasse zur Auswahl.' },
            { t: 'note', v: 'Diese Reihenfolge ist Absicht: Ein Kurs ohne Schülerliste wäre nicht mehr benutzbar. Fotos werden beim Löschen nur entfernt, wenn dieselbe Person in keiner anderen Klasse mehr vorkommt – nach einem [[help:faq-schuljahreswechsel|Schuljahreswechsel]] bleiben sie also erhalten.' }
          ]
        },
        {
          id: 'faq-schuljahr-loeschen',
          group: 'Globale Einstellungen',
          title: 'Wie werde ich alte Daten wieder los?',
          body: [
            { t: 'p', v: 'Einzelne Kurse löschen Sie in den Kurs-Einstellungen im Gefahrenbereich, ganze Schuljahre in den Globalen Einstellungen unter „Schuljahre“. Beides verlangt eine bewusste Bestätigung – den Kursnamen beziehungsweise Ihr Passwort.' },
            { t: 'p', v: 'Vor dem Löschen eines Schuljahres empfiehlt sich ein Export: Die Notenübersichten lassen sich als Excel-Datei oder PDF archivieren.' },
            { t: 'p', v: 'Das letzte verbliebene Schuljahr lässt sich nicht löschen. Wollen Sie ganz von vorn beginnen, hilft nur das vollständige Zurücksetzen der App – siehe [[help:faq-reset|das eigene Kapitel dazu]]. Dabei gehen alle Daten auf diesem Gerät unwiderruflich verloren.' }
          ]
        },
        {
          id: 'faq-demo',
          group: 'Globale Einstellungen',
          title: 'Wie führe ich die App vor, ohne echte Daten zu zeigen?',
          body: [
            { t: 'p', v: 'Mit dem {{Demo-Modus}} in den [[app:settings|Globalen Einstellungen]]. Er zeigt zwei erfundene Klassen mit drei Kursen; die Quartale 1 bis 3 sind bewertet, das vierte ist leer, sodass Sie jede Eingabe live vorführen können.' },
            { t: 'p', v: 'Ihre echten Daten bleiben unangetastet, ein oranges Band weist dauerhaft auf den Demo-Modus hin, und beim Beenden verschwinden alle Demo-Änderungen. Beenden können Sie den Demo-Modus direkt über den Button „Beenden“ im orangen Band oder wie beim Starten über die Globalen Einstellungen. Die Beispieldaten sind bei jedem Start identisch; Schuljahr, Quartale und Klassennamen richten sich nach dem heutigen Datum.' },
            { t: 'warn', v: 'Im Demo-Modus wird nichts dauerhaft gespeichert – er ist nicht für die produktive Arbeit geeignet.' }
          ]
        },
        {
          id: 'faq-speicherdauer',
          group: 'Globale Einstellungen',
          title: 'Wie lange bleiben meine Daten im Browser gespeichert?',
          body: [
            { t: 'p', v: 'Grundsätzlich unbegrenzt. Die Daten liegen im Speicher des Browsers und hängen an der Adresse der App, nicht am App-Symbol: Wer die {{PWA}} deinstalliert und neu installiert, findet auf PC und Android alles unverändert vor. **Auf iPhone und iPad ist das anders** – dort hat die installierte App einen eigenen Speicherbereich, und mit dem Symbol verschwinden auch die Daten.' },
            { t: 'p', v: 'Es gibt drei Wege, auf denen die Daten dennoch verschwinden können:' },
            { t: 'ul', v: [
              '**Knapper Gerätespeicher.** Wird es eng, darf der Browser Daten von Websites verwerfen. SOL-Noten fordert deshalb bei der Einrichtung die Berechtigung „dauerhafter Speicher“ an; damit räumt der Browser die Daten zuletzt ab und weist vorher darauf hin. Die Vergabe entscheidet der Browser selbst – die Aussichten sind am besten, wenn die App installiert ist und regelmäßig genutzt wird.',
              '**Safari nach sieben Tagen.** Wird SOL-Noten auf iPhone oder iPad **nicht installiert**, sondern nur im Safari-Browser benutzt, löscht Safari die Daten nach etwa sieben Tagen ohne Nutzung. Das ist der Hauptgrund für die Empfehlung, die App zu installieren.',
              '**Löschen von Hand.** „Browserdaten löschen“, das Zurücksetzen des Geräts oder – auf dem iPad – das Entfernen des App-Symbols löschen alles. Dagegen kann keine Website etwas tun, und das ist auch richtig so: Die Hoheit über das Gerät bleibt bei Ihnen.'
            ] },
            { t: 'warn', v: 'Deshalb bleibt das {{Backup}} unverzichtbar. Es liegt außerhalb des Browserspeichers und übersteht alle drei Fälle – ebenso wie einen Gerätedefekt oder -verlust.' },
            { t: 'p', v: 'Nicht verwechseln sollten Sie damit die **internen Sicherungsstände**, die die App automatisch anlegt (einer je Tag, die letzten 14). Die gibt es auf jedem Gerät, und sie helfen zuverlässig gegen Fehlbedienungen – ein versehentlich gelöschter Kurs etwa lässt sich darüber zurückholen. Sie liegen aber im selben Browserspeicher wie die Echtdaten und verschwinden deshalb in allen drei oben genannten Fällen mit. Als Schutz vor Datenverlust taugen sie nicht.' },
            { t: 'p', v: 'Das **automatische Ordner-Backup** schreibt dagegen echte Dateien in einen Ordner Ihrer Wahl und übersteht alles davon. Es setzt allerdings eine Browser-Schnittstelle voraus, die nicht überall vorhanden ist: Chrome und Edge bieten sie an (auch auf Android), Safari auf iPad und iPhone nicht. Verlassen Sie sich dabei nicht auf Listen – die App prüft es selbst: Erscheint in den [[app:settings|Globalen Einstellungen]] unter „Datensicherung“ der Button „Automatisches Backup: Ordner wählen“, ist es auf Ihrem Gerät möglich. Erscheint stattdessen ein Hinweistext, erinnert die App alle sieben Tage an ein Backup von Hand – und dann ist die selbst gespeicherte Backup-Datei die einzige echte Sicherung.' }
          ]
        },
        {
          id: 'faq-offline',
          group: 'Gerät & Technik',
          title: 'Funktioniert die App ohne Internet?',
          body: [
            { t: 'p', v: 'Ja, nach der Installation vollständig. Die App lädt aus dem Gerätespeicher, und alle Daten liegen ohnehin lokal.' },
            { t: 'p', v: 'Internet brauchen Sie nur zweimal: beim ersten Laden der App und beim Anlegen eines Schuljahres, wenn die Schulferien abgerufen werden. Klappt der Abruf nicht, können Sie das Schuljahr auch ohne Ferientermine anlegen und die Quartalszeiträume später anpassen.' }
          ]
        },
        {
          id: 'faq-update',
          group: 'Gerät & Technik',
          title: 'Wie bekomme ich Aktualisierungen der App?',
          body: [
            { t: 'p', v: 'Automatisch. Sobald eine neue Fassung vorliegt und Sie online sind, erscheint oben ein Hinweis mit dem Button „Jetzt aktualisieren“. Ihre Daten bleiben dabei unverändert erhalten.' },
            { t: 'p', v: 'Die installierte Version sehen Sie ganz unten auf jeder Seite unter „Über diese App“.' }
          ]
        },
        {
          id: 'faq-fehler',
          group: 'Gerät & Technik',
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
      navTitle: 'Datenschutz',
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
            { t: 'p', v: 'Die App bittet den Browser außerdem um dauerhaften Speicher, damit er die Daten nicht von sich aus verwirft, wenn der Gerätespeicher knapp wird. Auch damit bleibt das {{Backup}} nötig – gegen Löschen von Hand und gegen Gerätedefekte hilft nur die Sicherungsdatei.' },
            { t: 'p', v: 'Auf Geräten mit Fingerabdruck- oder Gesichtserkennung kann das Entsperren zusätzlich darüber erfolgen. Ebenso öffnet der {{Wiederherstellungsschlüssel}} die Daten. Alle drei Wege führen zum selben Datenschlüssel; keiner von ihnen wird im Klartext gespeichert, sondern jeweils nur der damit verschlossene Datenschlüssel.' }
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
  /* Kapitel einer Seite nach Gruppen sortiert. Seiten ohne `groups` liefern
     eine einzige Gruppe ohne Überschrift – so bleibt der Aufrufcode gleich.
     Die Reihenfolge folgt `page.groups`, nicht der Reihenfolge im Quelltext. */
  function groupedChapters(page) {
    if (!page || !page.chapters) return [];
    if (!page.groups || !page.groups.length) {
      return [{ title: null, chapters: page.chapters }];
    }
    var out = [];
    page.groups.forEach(function (g) {
      var list = page.chapters.filter(function (c) { return c.group === g; });
      if (list.length) out.push({ title: g, chapters: list });
    });
    /* Sicherheitsnetz: ein Kapitel ohne (gültige) Gruppe geht nicht verloren. */
    var rest = page.chapters.filter(function (c) { return page.groups.indexOf(c.group) === -1; });
    if (rest.length) out.push({ title: 'Sonstiges', chapters: rest });
    return out;
  }

  function plainText(body) {
    return (body || []).filter(function (b) { return b.t !== 'mock'; }).map(function (b) {
      var v = Array.isArray(b.v) ? b.v.join(' ') : b.v;
      return String(v).replace(/\{\{(.+?)\}\}/g, '$1').replace(/\*\*/g, '');
    }).join(' ');
  }

  return {
    PAGES: PAGES, GLOSSARY: GLOSSARY, CONTEXT: CONTEXT,
    glossaryFor: glossaryFor, pageById: pageById, chapterById: chapterById,
    plainText: plainText, groupedChapters: groupedChapters
  };
});
