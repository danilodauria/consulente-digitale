/* ==========================================================================
 *  CONSULENTE DIGITALE - Storia dei computer e dei sistemi operativi
 *  Linea del tempo, famiglie dei sistemi operativi, curiosità e quiz. Le tappe italiane sono segnate.
 *  Contenuti © 2026 Danilo D'Auria - CC BY-NC-SA 4.0
 * ========================================================================== */
(function () {
  "use strict";
  var CD = window.CD;
  CD.STORIA = {
    ere: [
      { id: "calcolo", nome: "Prima dei computer", icona: "🧮", da: -3000, a: 1935 },
      { id: "giganti", nome: "I giganti elettronici", icona: "🏭", da: 1936, a: 1969 },
      { id: "personal", nome: "Il computer per tutti", icona: "🖥️", da: 1970, a: 1989 },
      { id: "rete", nome: "Internet e il web", icona: "🌐", da: 1990, a: 2006 },
      { id: "tasca", nome: "Il computer in tasca", icona: "📱", da: 2007, a: 2019 },
      { id: "ia", nome: "L'era dell'intelligenza artificiale", icona: "🧠", da: 2020, a: 2100 }
    ],
    tappe: [
      { anno: -2500, quando: "circa 2500 a.C.", icona: "🧮", titolo: "L'abaco", testo: "In Mesopotamia si contano i numeri spostando sassolini su tavolette: è il primo «strumento di calcolo»." },
      { anno: 1642, icona: "⚙️", titolo: "La Pascalina", testo: "Blaise Pascal, a 19 anni, costruisce una calcolatrice meccanica a ingranaggi per aiutare il padre esattore delle tasse." },
      { anno: 1801, icona: "🧵", titolo: "Il telaio di Jacquard", testo: "Un telaio tesse disegni seguendo schede di cartone perforate: l'idea delle schede perforate guiderà i computer per 150 anni." },
      { anno: 1837, icona: "🏗️", titolo: "La macchina analitica di Babbage", testo: "Charles Babbage progetta una macchina con memoria, unità di calcolo e programmi su schede: un computer meccanico mai completato." },
      { anno: 1843, icona: "👩‍💻", titolo: "Ada Lovelace, la prima programmatrice", testo: "Nelle sue note sulla macchina di Babbage scrive il primo algoritmo della storia e immagina macchine capaci di comporre musica." },
      { anno: 1890, icona: "🗃️", titolo: "Hollerith e il censimento", testo: "Le macchine a schede perforate di Herman Hollerith contano il censimento degli Stati Uniti in pochi anni invece di otto. La sua azienda diventerà IBM." },
      { anno: 1936, icona: "🧠", titolo: "La macchina di Turing", testo: "Alan Turing descrive una macchina ideale capace di eseguire qualsiasi calcolo: è la base teorica di tutta l'informatica." },
      { anno: 1941, icona: "🔩", titolo: "Lo Z3 di Konrad Zuse", testo: "In Germania nasce il primo computer programmabile funzionante, con relè elettromeccanici." },
      { anno: 1944, icona: "🔐", titolo: "Colossus", testo: "In Inghilterra, a Bletchley Park, il primo computer elettronico decifra i messaggi segreti della guerra." },
      { anno: 1946, icona: "🏭", titolo: "ENIAC", testo: "Presentato a Filadelfia: 18.000 valvole, 27 tonnellate, una stanza intera. Lo programmavano sei donne collegando cavi." },
      { anno: 1947, icona: "🔬", titolo: "Il transistor", testo: "Ai Bell Labs nasce il transistor: piccolo, freddo e affidabile, sostituirà le valvole. Lo stesso anno un vero insetto («bug») blocca un computer di Harvard." },
      { anno: 1951, icona: "🏢", titolo: "UNIVAC I", testo: "Il primo computer venduto alle aziende negli Stati Uniti: nel 1952 prevede in TV la vittoria di Eisenhower." },
      { anno: 1957, icona: "📜", titolo: "FORTRAN", testo: "Primo linguaggio di programmazione di alto livello: si scrivono formule invece di codici numerici." },
      { anno: 1959, icona: "🇮🇹", italia: true, titolo: "Olivetti ELEA 9003", testo: "Voluto da Adriano Olivetti e progettato dal gruppo di Mario Tchou: uno dei primi computer commerciali interamente a transistor al mondo." },
      { anno: 1964, icona: "🗄️", titolo: "IBM System/360", testo: "Una famiglia di computer compatibili tra loro: per la prima volta i programmi passano da un modello all'altro." },
      { anno: 1965, icona: "🇮🇹", italia: true, titolo: "Programma 101 «Perottina»", testo: "Olivetti presenta a New York la P101 di Pier Giorgio Perotto: sta su una scrivania ed è considerata il primo personal computer. La NASA la usò per i calcoli delle missioni Apollo." },
      { anno: 1968, icona: "🖱️", titolo: "Il mouse", testo: "Douglas Engelbart mostra mouse, finestre, ipertesti e videoconferenza in una dimostrazione passata alla storia. Il primo mouse era di legno." },
      { anno: 1969, icona: "🕸️", titolo: "ARPANET e Unix", testo: "Il primo messaggio tra due computer della rete ARPANET, antenata di Internet. Ai Bell Labs nasce Unix, padre di macOS, Linux e Android." },
      { anno: 1971, icona: "🇮🇹", italia: true, titolo: "Il microprocessore Intel 4004", testo: "Tutto il processore in un solo chip: lo progetta il vicentino Federico Faggin, che vi lascia le sue iniziali F.F. Lo stesso anno parte la prima email." },
      { anno: 1973, icona: "🪟", titolo: "Xerox Alto", testo: "Il primo computer con interfaccia grafica, icone e mouse: ispirerà Apple e Microsoft." },
      { anno: 1975, icona: "🔌", titolo: "Altair 8800 e Microsoft", testo: "Un kit da montare in casa entusiasma gli appassionati. Bill Gates e Paul Allen fondano Microsoft per scrivergli il BASIC." },
      { anno: 1977, icona: "🍎", titolo: "Apple II, Commodore PET, TRS-80", testo: "I computer entrano nelle case già montati, con tastiera e schermo. Apple era nata l'anno prima in un garage." },
      { anno: 1981, icona: "💾", titolo: "IBM PC e MS-DOS", testo: "Il Personal Computer di IBM con il sistema MS-DOS di Microsoft: le sue copie compatibili diventeranno «i PC»." },
      { anno: 1982, icona: "🕹️", titolo: "Commodore 64", testo: "Il computer più venduto di sempre come singolo modello: milioni di ragazzi imparano a programmare e a giocare." },
      { anno: 1983, icona: "🐃", titolo: "Il progetto GNU", testo: "Richard Stallman annuncia GNU, un sistema operativo libero: nasce il movimento del software libero." },
      { anno: 1984, icona: "🖥️", titolo: "Apple Macintosh", testo: "Mouse, finestre e icone per tutti: il computer diventa amichevole." },
      { anno: 1985, icona: "🪟", titolo: "Windows 1.0", testo: "Microsoft porta le finestre sopra MS-DOS. Il successo vero arriverà con Windows 3.0 nel 1990." },
      { anno: 1986, icona: "🇮🇹", italia: true, titolo: "L'Italia si collega a Internet", testo: "Il 30 aprile 1986 un computer del CNUCE-CNR di Pisa si collega alla rete americana: l'Italia è tra i primi paesi europei su Internet." },
      { anno: 1991, icona: "🌐", titolo: "Il World Wide Web e Linux", testo: "Al CERN di Ginevra Tim Berners-Lee pubblica il primo sito web. In Finlandia lo studente Linus Torvalds annuncia Linux, «solo un hobby»." },
      { anno: 1993, icona: "🌀", titolo: "Mosaic e Debian", testo: "Il primo browser con immagini rende il web popolare. Nasce Debian, la distribuzione Linux da cui derivano Ubuntu, Mint, Zorin e FeniceOS." },
      { anno: 1995, icona: "🚀", titolo: "Windows 95", testo: "Il pulsante Start e la barra delle applicazioni: il sistema operativo più famoso degli anni '90." },
      { anno: 1998, icona: "🔎", titolo: "Google", testo: "Due studenti di Stanford fondano un motore di ricerca che ordina i siti in base ai collegamenti." },
      { anno: 2001, icona: "🌌", titolo: "Windows XP, Mac OS X e Wikipedia", testo: "XP resterà sui PC per oltre dieci anni; Mac OS X porta Unix sui Mac; nasce l'enciclopedia libera scritta da tutti." },
      { anno: 2004, icona: "🟠", titolo: "Ubuntu", testo: "«Linux per esseri umani»: una distribuzione facile e gratuita, con CD spediti gratis in tutto il mondo." },
      { anno: 2007, icona: "📱", titolo: "iPhone", testo: "Telefono, iPod e Internet in un solo dispositivo con lo schermo multi-touch: inizia l'era degli smartphone." },
      { anno: 2008, icona: "🤖", titolo: "Android e Chrome", testo: "Il primo telefono Android (basato su Linux) e il browser Chrome. Oggi Android è il sistema operativo più diffuso al mondo." },
      { anno: 2010, icona: "📲", titolo: "iPad", testo: "Il tablet diventa un oggetto di tutti i giorni, amatissimo anche dalle persone anziane." },
      { anno: 2012, icona: "🍓", titolo: "Raspberry Pi", testo: "Un computer grande come una carta di credito per insegnare l'informatica nelle scuole." },
      { anno: 2015, icona: "🪟", titolo: "Windows 10", testo: "Annunciato come «l'ultima versione di Windows», è stato poi seguito da Windows 11." },
      { anno: 2020, icona: "🍏", titolo: "Apple M1", testo: "Apple lascia i processori Intel per i suoi chip ARM: potenti, freschi e con batterie che durano tutto il giorno." },
      { anno: 2021, icona: "🪟", titolo: "Windows 11", testo: "Nuovo aspetto e requisiti più severi (TPM 2.0, processori recenti): molti PC funzionanti restano esclusi." },
      { anno: 2022, icona: "💬", titolo: "ChatGPT", testo: "L'intelligenza artificiale che conversa arriva a tutti: in due mesi 100 milioni di utenti." },
      { anno: 2023, icona: "🦙", titolo: "L'IA sul proprio computer", testo: "Modelli aperti e programmi come Ollama permettono di far girare l'IA in locale, senza Internet e senza inviare dati." },
      { anno: 2025, icona: "📅", titolo: "Fine del supporto di Windows 10", testo: "Il 14 ottobre 2025 finisce il supporto standard: per i privati restano gli aggiornamenti di sicurezza estesi (ESU) su iscrizione, poi prorogati fino a ottobre 2027." },
      { anno: 2026, icona: "🔥", italia: true, titolo: "FeniceOS, Professore e Consulente Digitale", testo: "Danilo D'Auria crea strumenti liberi per dare una seconda vita ai computer e insegnare la tecnologia gentile, a partire da centri anziani, scuole e associazioni." }
    ],
    famiglie: [
      { nome: "Famiglia Windows", icona: "🪟", rami: [["MS-DOS", "1981"], ["Windows 3.1", "1992"], ["Windows 95 / 98", "1995-98"], ["Windows NT → 2000", "1993-2000"],
        ["Windows XP", "2001"], ["Windows 7", "2009"], ["Windows 10", "2015"], ["Windows 11", "2021"]] },
      { nome: "Famiglia Apple", icona: "🍎", rami: [["Macintosh System 1", "1984"], ["Mac OS 9", "1999"], ["Mac OS X (Unix)", "2001"], ["iOS (iPhone)", "2007"],
        ["macOS Big Sur (chip Apple)", "2020"], ["macOS Tahoe 26", "2025"]] },
      { nome: "Famiglia Unix e Linux", icona: "🐧", rami: [["Unix", "1969"], ["BSD", "1977"], ["GNU", "1983"], ["Linux", "1991"], ["Debian", "1993"], ["Ubuntu", "2004"],
        ["Linux Mint", "2006"], ["Android", "2008"], ["ChromeOS", "2011"], ["FeniceOS", "2026"]] }
    ],
    curiosita: [
      "Il primo «bug» informatico era una vera falena, trovata nel 1947 in un computer di Harvard e incollata nel registro del gruppo di Grace Hopper.",
      "L'ENIAC consumava tanta corrente che si diceva facesse abbassare le luci di Filadelfia quando si accendeva.",
      "La Programma 101 di Olivetti costava circa 3.200 dollari del 1965 e ne furono vendute circa 44.000.",
      "Il primo dominio italiano registrato è cnr.it, del Consiglio Nazionale delle Ricerche (1987).",
      "Il primo SMS della storia, nel 1992, diceva «Merry Christmas».",
      "Il primo hard disk (IBM 350, 1956) conteneva circa 3,75 megabyte e pesava quasi una tonnellata.",
      "La mascotte di Linux, il pinguino Tux, nacque perché Linus Torvalds era stato morso da un pinguino in uno zoo.",
      "Un telefono di oggi è milioni di volte più potente dei computer che guidarono le missioni Apollo sulla Luna."
    ],
    quiz: [
      { d: "Chi ha progettato il primo microprocessore, l'Intel 4004?", o: ["Bill Gates", "Federico Faggin", "Steve Jobs", "Alan Turing"], c: 1, s: "Il vicentino Federico Faggin guidò il progetto del 4004 nel 1971 e vi lasciò le sue iniziali." },
      { d: "Quale computer italiano è considerato il primo personal computer?", o: ["Olivetti Programma 101", "Commodore 64", "ELEA 9003", "Apple II"], c: 0, s: "La P101 di Olivetti (1965), progettata da Pier Giorgio Perotto, stava su una scrivania." },
      { d: "Chi scrisse il primo algoritmo della storia?", o: ["Grace Hopper", "Ada Lovelace", "Marie Curie", "Hedy Lamarr"], c: 1, s: "Ada Lovelace, nel 1843, per la macchina analitica di Babbage." },
      { d: "In che anno Linus Torvalds annunciò Linux?", o: ["1981", "1991", "2001", "1985"], c: 1, s: "Nel 1991, descrivendolo come «solo un hobby»." },
      { d: "Dove è nato il World Wide Web?", o: ["Silicon Valley", "MIT di Boston", "CERN di Ginevra", "Università di Pisa"], c: 2, s: "Al CERN, grazie a Tim Berners-Lee." },
      { d: "Da quale sistema derivano macOS, Linux e Android?", o: ["MS-DOS", "Unix", "Windows NT", "CP/M"], c: 1, s: "Unix, nato ai Bell Labs nel 1969, è il «nonno» di tutti e tre." },
      { d: "Cosa sostituì le valvole nei computer?", o: ["Il transistor", "Il mouse", "La scheda perforata", "Il floppy"], c: 0, s: "Il transistor, inventato nel 1947 ai Bell Labs." },
      { d: "Quando l'Italia si è collegata per la prima volta a Internet?", o: ["1976", "1986", "1996", "2000"], c: 1, s: "Il 30 aprile 1986, da Pisa." },
      { d: "Cosa serve a Windows 11 che molti PC vecchi non hanno?", o: ["Il lettore CD", "Il chip TPM 2.0", "La porta seriale", "Due schermi"], c: 1, s: "TPM 2.0, Secure Boot e un processore recente." },
      { d: "Cosa significa «IA locale»?", o: ["Un'IA che parla solo italiano", "Un'IA che gira sul proprio computer senza inviare dati", "Un'IA del Comune", "Un'IA solo per i telefoni"], c: 1, s: "Funziona sul vostro computer, anche senza Internet: come Neura con Ollama." }
    ]
  };
})();
