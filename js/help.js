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
          title: 'Warum sollte ich **SOL-Noten** als App installieren?',
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
            { t: 'warn', v: 'Wenn Sie auf iPhone oder iPad zunächst **im Safari-Browser weiterarbeiten**, drohen Ihnen zwei Probleme. Erstens erscheinen diese Daten später nicht in der installierten App, weil beide getrennte Speicher haben. Zweitens – und das ist der gefährlichere Punkt – löscht Safari die Daten von Websites, die nicht auf dem Home-Bildschirm liegen, nach etwa sieben Tagen ohne Nutzung automatisch. Nach den Ferien könnten Ihre Noten also verschwunden sein.' },
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
            { t: 'warn', v: 'Dieses Blatt ist **keine** datenschutzrechtliche Freigabe und ersetzt sie nicht. Ob und unter welchen Bedingungen die App eingesetzt werden darf, entscheidet Ihre Schule beziehungsweise Ihr Schulträger – die Vorgaben unterscheiden sich je Bundesland. Häufig sind ein Eintrag im Verzeichnis der Verarbeitungstätigkeiten und eine Genehmigung erforderlich. Der Entwickler ist kein Jurist und kann keine Rechtsberatung leisten.' }
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
              'Gerät mit Bildschirmsperre schützen; ein starkes Passwort für die App wählen.',
              'Regelmäßig ein {{Backup}} anlegen – Backups sind verschlüsselt.',
              '**Exporte und Ausdrucke sind nicht verschlüsselt** und enthalten Namen und Noten im Klartext. Nur auf geschützten Geräten speichern und nicht ungeschützt weitergeben, etwa per unverschlüsselter E-Mail.',
              'Fotos von Lernenden nur mit der erforderlichen Einwilligung erfassen; sie werden ebenfalls verschlüsselt gespeichert.',
              'Beim Gerätewechsel ein verschlüsseltes {{Backup}} anlegen (Globale Einstellungen), auf einen externen Datenträger speichern, die App auf dem neuen Gerät installieren und die Backup-Datei dort einspielen (Globale Einstellungen).',
              'Beim Ausscheiden aus der Schule oder Gerätewechsel Daten löschen (Globale Einstellungen) beziehungsweise das Gerät zurücksetzen.'
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
  var CONTEXT = {};

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
    return (body || []).map(function (b) {
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
