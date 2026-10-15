/* ==========================================================================
 *  CONSULENTE DIGITALE - Dati della guida all'acquisto
 *  Dispositivi, usi, requisiti, trappole da evitare, calendario delle offerte e negozi di confronto.
 *  Le fasce di prezzo sono INDICATIVE (aggiornate a: vedi «aggiornato») e servono solo a orientarsi.
 *  Contenuti © 2026 Danilo D'Auria - CC BY-NC-SA 4.0
 * ========================================================================== */
(function () {
  "use strict";
  var CD = window.CD;
  CD.ACQ = {
    aggiornato: "ottobre 2026",
    dispositivi: {
      portatile: { nome: "Computer portatile", icona: "💻", desc: "Da portare ovunque: casa, scuola, lavoro", famiglia: "pc",
        fasce: { economico: [350, 550], medio: [550, 900], alto: [900, 1500], top: [1500, 3000] }, cerca: "notebook" },
      fisso: { nome: "Computer fisso", icona: "🖥️", desc: "Più potenza a parità di prezzo, si ripara e si potenzia", famiglia: "pc",
        fasce: { economico: [400, 650], medio: [650, 1000], alto: [1000, 1800], top: [1800, 4000] }, cerca: "pc desktop" },
      minipc: { nome: "Mini PC", icona: "📦", desc: "Piccolo come un libro, consuma pochissimo: ufficio, aule, centri anziani", famiglia: "pc",
        fasce: { economico: [150, 300], medio: [300, 550], alto: [550, 900], top: [900, 1600] }, cerca: "mini pc" },
      tablet: { nome: "Tablet", icona: "📱", desc: "Leggere, videochiamare, giocare, prendere appunti con la penna", famiglia: "tablet",
        fasce: { economico: [150, 300], medio: [300, 600], alto: [600, 1000], top: [1000, 2000] }, cerca: "tablet" },
      smartphone: { nome: "Smartphone", icona: "📞", desc: "Telefono, foto, messaggi, banca, SPID", famiglia: "telefono",
        fasce: { economico: [150, 300], medio: [300, 600], alto: [600, 1000], top: [1000, 2000] }, cerca: "smartphone" },
      tv: { nome: "Smart TV", icona: "📺", desc: "Televisione con app, streaming e canali digitali", famiglia: "tv",
        fasce: { economico: [300, 600], medio: [600, 1200], alto: [1200, 2000], top: [2000, 5000] }, cerca: "smart tv" },
      monitor: { nome: "Monitor", icona: "🖵", desc: "Uno schermo grande per il computer o il portatile", famiglia: "monitor",
        fasce: { economico: [100, 180], medio: [180, 350], alto: [350, 700], top: [700, 1500] }, cerca: "monitor" },
      stampante: { nome: "Stampante", icona: "🖨️", desc: "Documenti, foto, scansioni", famiglia: "stampante",
        fasce: { economico: [80, 180], medio: [180, 350], alto: [350, 700], top: [700, 1500] }, cerca: "stampante multifunzione" },
      ereader: { nome: "E-reader", icona: "📖", desc: "Leggere libri digitali senza stancare gli occhi", famiglia: "ereader",
        fasce: { economico: [100, 150], medio: [150, 250], alto: [250, 450], top: [450, 700] }, cerca: "ebook reader" }
    },
    usi: {
      web: { nome: "Internet, posta, video", icona: "🌐", livello: 1, per: ["pc", "tablet", "telefono"] },
      videochiamate: { nome: "Videochiamate", icona: "🎥", livello: 1, per: ["pc", "tablet", "telefono", "tv"] },
      ufficio: { nome: "Documenti e fogli di calcolo", icona: "📝", livello: 2, per: ["pc", "tablet"] },
      studio: { nome: "Studio e lezioni online", icona: "🎒", livello: 2, per: ["pc", "tablet"] },
      foto: { nome: "Foto (ritocco, archivio)", icona: "📷", livello: 3, per: ["pc", "tablet", "telefono"] },
      programmazione: { nome: "Programmare", icona: "💻", livello: 3, per: ["pc"] },
      video: { nome: "Montaggio video", icona: "🎬", livello: 4, per: ["pc", "tablet"] },
      giochi: { nome: "Videogiochi", icona: "🎮", livello: 4, per: ["pc", "tablet", "telefono", "tv", "monitor"] },
      ia: { nome: "Intelligenza artificiale sul computer", icona: "🧠", livello: 4, per: ["pc"] },
      grafica3d: { nome: "Grafica 3D, CAD, rendering", icona: "🧊", livello: 5, per: ["pc"] },
      lettura: { nome: "Leggere libri e giornali", icona: "📚", livello: 1, per: ["tablet", "ereader", "telefono"] },
      disegno: { nome: "Disegnare con la penna", icona: "✏️", livello: 2, per: ["tablet"] },
      tvfilm: { nome: "Film e serie TV", icona: "🍿", livello: 1, per: ["tv", "tablet", "monitor"] },
      sport: { nome: "Sport in diretta", icona: "⚽", livello: 2, per: ["tv"] },
      documenti: { nome: "Documenti in bianco e nero", icona: "📄", livello: 1, per: ["stampante"] },
      colore: { nome: "Stampe a colori e foto", icona: "🌈", livello: 2, per: ["stampante"] },
      scansioni: { nome: "Scansioni e fotocopie", icona: "📠", livello: 1, per: ["stampante"] },
      lavoro: { nome: "Lavoro da casa con il portatile", icona: "🏠", livello: 2, per: ["monitor"] }
    },
    /* Requisiti dei computer per livello d'uso (1 = base ... 5 = professionale) */
    livelliPC: {
      1: { nome: "Uso base", cpu: "Intel Core i3 (12ª gen. o più recente), Intel N150/N200, AMD Ryzen 3 7000 o Apple M1 e successivi", ram: 8, ramIdeale: 16, disco: 256, discoIdeale: 512,
        video: "Grafica integrata", schermo: "Full HD (1920×1080) IPS" },
      2: { nome: "Uso completo", cpu: "Intel Core i5 / Core 5 (13ª gen.+), AMD Ryzen 5 7000+, Apple M2 e successivi", ram: 16, ramIdeale: 16, disco: 512, discoIdeale: 1000,
        video: "Grafica integrata recente (Iris Xe, Radeon 780M, Arc)", schermo: "Full HD o 2K IPS/OLED, almeno 300 nit" },
      3: { nome: "Uso impegnativo", cpu: "Intel Core i7 / Core Ultra 7, AMD Ryzen 7 7000+, Apple M3/M4", ram: 16, ramIdeale: 32, disco: 1000, discoIdeale: 1000,
        video: "Grafica integrata potente o dedicata entry (RTX 4050/5050)", schermo: "2K o superiore, colori fedeli (100% sRGB)" },
      4: { nome: "Creatività e giochi", cpu: "Intel Core i7 / Ultra 7 HX, AMD Ryzen 7 / 9, Apple M4 Pro", ram: 32, ramIdeale: 32, disco: 1000, discoIdeale: 2000,
        video: "Scheda video dedicata con almeno 8 GB (RTX 4060/5060 o superiore); per l'IA locale meglio 12-16 GB", schermo: "120-165 Hz, 2K, 100% sRGB/DCI-P3" },
      5: { nome: "Professionale", cpu: "Intel Core i9 / Ultra 9, AMD Ryzen 9, Apple M4 Max", ram: 32, ramIdeale: 64, disco: 2000, discoIdeale: 4000,
        video: "Scheda video con 12-24 GB di memoria (RTX 5070 Ti / 5080 / 5090) o Apple con molta memoria unificata", schermo: "4K o 2K calibrato" }
    },
    trappoleComuni: {
      pc: ["Memoria «eMMC» da 64 o 128 GB al posto di un SSD: lentissima e si riempie subito",
        "Solo 4 GB di RAM (nel 2026 il minimo vero sono 8 GB, meglio 16)",
        "Processori Celeron N4020/N4500, Pentium Silver, Athlon Silver: troppo lenti per Windows 11",
        "Schermo 1366×768 o «TN»: colori slavati e testo poco nitido",
        "Disco meccanico (HDD) come unico disco",
        "RAM saldata da 8 GB su un PC che terrete per anni: non si potrà aumentare",
        "Prezzi «barrati» gonfiati: controllate lo storico del prezzo"],
      tablet: ["Tablet senza aggiornamenti garantiti o di marche sconosciute", "32 o 64 GB di memoria: finiscono subito", "Schermo sotto i 10 pollici per chi vede poco"],
      telefono: ["Meno di 5 anni di aggiornamenti di sicurezza garantiti", "64 GB di memoria o 4 GB di RAM", "Marche senza assistenza in Italia", "Senza NFC (niente pagamenti con il telefono)"],
      tv: ["TV senza decoder DVB-T2 HEVC Main10 (serve per i canali in alta definizione)", "Pannelli «HDR» con meno di 400 nit: l'HDR non si vede", "Audio molto debole sulle TV sottili: valutate una soundbar"],
      monitor: ["Pannelli TN", "Risoluzione Full HD oltre i 27 pollici: testo sgranato", "Piede che non regola l'altezza (mal di collo)"],
      stampante: ["Stampanti a cartucce economiche: le cartucce costano più della stampante", "Cartucce con chip che bloccano quelle compatibili", "Abbonamenti all'inchiostro attivati senza volerlo"],
      ereader: ["Lettori che non leggono ePub o non funzionano con i prestiti delle biblioteche (MLOL)", "Senza luce calda per la sera"]
    },
    consigli: {
      telefono: ["Verificate quanti anni di aggiornamenti promette il produttore (Pixel e Samsung fino a 7 anni, iPhone circa 6-7)",
        "128 GB di memoria come minimo, 256 GB se fate molte foto e video", "Batteria da almeno 4500-5000 mAh", "NFC per pagare, resistenza all'acqua IP67/IP68",
        "Per le persone anziane: schermo grande, modalità semplificata (es. «Modalità facile» Samsung, «Accesso assistito» iPhone)"],
      tablet: ["iPad (anche il modello base) e Samsung Galaxy Tab garantiscono anni di aggiornamenti", "Per studiare: penna e tastiera compatibili", "Versione con SIM solo se lo usate fuori casa senza Wi-Fi"],
      tv: ["Dimensione: distanza dal divano in centimetri × 0,6 ≈ pollici ideali (es. 250 cm → 55-65 pollici)", "OLED per stanze buie e film; Mini-LED/QLED per stanze molto luminose",
        "Per console di gioco: 2 porte HDMI 2.1 e 120 Hz", "Sistema operativo semplice (Google TV, webOS, Tizen) e telecomando con tasti delle app"],
      monitor: ["24\" Full HD, 27\" 2K (QHD), 32\" 4K", "Con il portatile: porta USB-C che carica il PC (Power Delivery) = un solo cavo", "Pannello IPS, filtro luce blu e piede regolabile in altezza"],
      stampante: ["Poche stampe a colori: laser in bianco e nero (il toner non si secca)", "Molte stampe a colori o foto: stampante con serbatoi ricaricabili (EcoTank, MegaTank, InkBenefit)",
        "Uffici: fronte-retro automatico e alimentatore di fogli (ADF) per le scansioni", "Controllate il costo per pagina, non solo il prezzo della stampante"],
      ereader: ["Kobo e PocketBook leggono gli ePub e i prestiti delle biblioteche (MLOL); Kindle usa lo store Amazon", "Schermo 6-7 pollici, luce regolabile calda/fredda", "Resistente all'acqua se leggete in spiaggia o in bagno"],
      pc: ["Il disco SSD fa la differenza più di ogni altra cosa", "Controllate che la RAM sia espandibile o prendete subito quella che vi servirà",
        "Portatile: peso sotto 1,5 kg se lo portate spesso, batteria da almeno 50 Wh", "Ricondizionato di qualità (grado A, garanzia 12+ mesi): ottimo affare e scelta sostenibile",
        "Windows 11 serve un processore recente; con Linux anche un PC di 8-10 anni torna veloce"]
    },
    /* Calendario delle occasioni. Le date si calcolano per l'anno richiesto (sono indicative: verificate sempre). */
    eventi: [
      { id: "saldi-inverno", nome: "Saldi invernali", icona: "🏷️", forza: 2, per: "tutti", nota: "La data esatta la decide ogni Regione (di solito tra il 2 e il 5 gennaio).",
        date: function (a) { return [new Date(a, 0, 3, 8, 0), new Date(a, 1, 28, 23, 59)]; } },
      { id: "tv-nuovi", nome: "Arrivano i TV nuovi: sconti sui modelli dell'anno prima", icona: "📺", forza: 2, per: ["tv"], nota: "I nuovi modelli escono tra marzo e maggio: quelli dell'anno prima calano di prezzo.",
        date: function (a) { return [new Date(a, 2, 1), new Date(a, 4, 31, 23, 59)]; } },
      { id: "galaxy", nome: "Nuovi Samsung Galaxy S: calano i modelli precedenti", icona: "📞", forza: 1, per: ["smartphone"], nota: "Presentazione tra fine gennaio e febbraio.",
        date: function (a) { return [new Date(a, 1, 1), new Date(a, 2, 15, 23, 59)]; } },
      { id: "primavera", nome: "Festa delle offerte di primavera (Amazon)", icona: "🌸", forza: 1, per: "tutti", nota: "Di solito nell'ultima settimana di marzo.",
        date: function (a) { return [new Date(a, 2, 25), new Date(a, 2, 31, 23, 59)]; } },
      { id: "saldi-estate", nome: "Saldi estivi", icona: "☀️", forza: 2, per: "tutti", nota: "Dal primo sabato di luglio (la data la decide la Regione).",
        date: function (a) { var d = new Date(a, 6, 1); while (d.getDay() !== 6) d.setDate(d.getDate() + 1); d.setHours(8); return [d, new Date(a, 7, 31, 23, 59)]; } },
      { id: "prime-day", nome: "Prime Day (Amazon)", icona: "📦", forza: 3, per: "tutti", nota: "Due giorni a metà luglio; molti negozi fanno offerte negli stessi giorni.",
        date: function (a) { var d = new Date(a, 6, 8); while (d.getDay() !== 2) d.setDate(d.getDate() + 1); return [d, new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 23, 59)]; } },
      { id: "scuola", nome: "Ritorno a scuola", icona: "🎒", forza: 2, per: ["portatile", "tablet", "minipc", "stampante"], nota: "Offerte per studenti su portatili e tablet (anche Apple «Back to School»).",
        date: function (a) { return [new Date(a, 6, 15), new Date(a, 8, 30, 23, 59)]; } },
      { id: "pixel", nome: "Nuovi Google Pixel", icona: "📞", forza: 1, per: ["smartphone"], nota: "Presentazione ad agosto: i modelli dell'anno prima scendono.",
        date: function (a) { return [new Date(a, 7, 15), new Date(a, 8, 30, 23, 59)]; } },
      { id: "iphone", nome: "Nuovi iPhone: calano i modelli precedenti", icona: "🍎", forza: 2, per: ["smartphone", "tablet"], nota: "Presentazione a settembre, in negozio pochi giorni dopo.",
        date: function (a) { var d = new Date(a, 8, 8); while (d.getDay() !== 2) d.setDate(d.getDate() + 1); return [d, new Date(a, 9, 31, 23, 59)]; } },
      { id: "prime-ottobre", nome: "Festa delle offerte Prime (ottobre)", icona: "🍂", forza: 2, per: "tutti", nota: "Due giorni nella prima metà di ottobre.",
        date: function (a) { var d = new Date(a, 9, 6); while (d.getDay() !== 2) d.setDate(d.getDate() + 1); return [d, new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 23, 59)]; } },
      { id: "singles", nome: "Single's Day 11.11", icona: "🛍️", forza: 1, per: "tutti", nota: "Soprattutto negozi online asiatici: attenzione a garanzia e dogana.",
        date: function (a) { return [new Date(a, 10, 11), new Date(a, 10, 11, 23, 59)]; } },
      { id: "black-friday", nome: "Black Friday e Cyber Monday", icona: "🖤", forza: 3, per: "tutti", nota: "Le offerte iniziano anche una settimana prima e finiscono il lunedì (Cyber Monday). Il periodo migliore dell'anno per l'elettronica.",
        date: function (a) {
          var d = new Date(a, 10, 1), giovedi = 0;
          while (true) { if (d.getDay() === 4) { giovedi++; if (giovedi === 4) break; } d.setDate(d.getDate() + 1); }
          var venerdi = new Date(a, 10, d.getDate() + 1, 0, 0), inizio = new Date(a, 10, d.getDate() - 6, 0, 0);
          return [inizio, new Date(a, 10, venerdi.getDate() + 3, 23, 59), venerdi];
        } },
      { id: "natale", nome: "Natale", icona: "🎄", forza: 1, per: "tutti", nota: "Prezzi spesso più alti che al Black Friday: se potete, comprate prima.",
        date: function (a) { return [new Date(a, 11, 1), new Date(a, 11, 24, 23, 59)]; } }
    ],
    negozi: [
      { id: "idealo", nome: "idealo", desc: "Confronto prezzi con lo storico del prezzo", url: "https://www.idealo.it/prechcat.html?q=" },
      { id: "trovaprezzi", nome: "Trovaprezzi", desc: "Confronto prezzi tra negozi italiani", url: "https://www.trovaprezzi.it/categoria.aspx?id=-1&libera=" },
      { id: "amazon", nome: "Amazon", desc: "Controllate «Venduto e spedito da»", url: "https://www.amazon.it/s?k=" },
      { id: "keepa", nome: "Keepa", desc: "Storico dei prezzi di Amazon: scoprite i finti sconti", url: "https://keepa.com/#!search/8-" },
      { id: "google", nome: "Google Shopping", desc: "Tutti i negozi in una ricerca", url: "https://www.google.com/search?tbm=shop&q=" },
      { id: "backmarket", nome: "Back Market", desc: "Ricondizionati con garanzia", url: "https://www.backmarket.it/it-it/search?q=", ricondizionato: true },
      { id: "ebay", nome: "eBay", desc: "Anche ricondizionati certificati", url: "https://www.ebay.it/sch/i.html?_nkw=", ricondizionato: true },
      { id: "subito", nome: "Subito", desc: "Usato tra privati: vedete l'oggetto prima di pagare", url: "https://www.subito.it/annunci-italia/vendita/usato/?q=", ricondizionato: true }
    ],
    sicurezzaAcquisto: [
      "Comprate da negozi con Partita IVA, indirizzo e recensioni verificabili; diffidate dei prezzi troppo bassi.",
      "Pagate con carta di credito, carta prepagata o PayPal (protezione acquisti). Mai bonifici o ricariche a sconosciuti.",
      "Online avete 14 giorni per il recesso e sempre 2 anni di garanzia legale dal venditore (per i ricondizionati controllate le condizioni: almeno 12 mesi).",
      "Controllate lo storico del prezzo (idealo, Keepa): uno sconto del 40% su un prezzo gonfiato non è uno sconto.",
      "Nei marketplace leggete chi vende davvero e da dove spedisce (dogana e garanzia per l'estero).",
      "Conservate fattura o scontrino: servono per la garanzia e, per le aziende, per la contabilità."
    ],
    perGruppi: [
      "Prendete lo stesso modello per tutte le postazioni: assistenza, ricambi e configurazione diventano semplicissimi.",
      "Chiedete la fattura intestata e, per più pezzi, un preventivo: i rivenditori fanno sconti sulle quantità.",
      "Valutate i ricondizionati «business» (es. Lenovo ThinkPad/ThinkCentre, Dell Latitude/OptiPlex, HP EliteBook/EliteDesk): robusti, economici, facili da riparare.",
      "Per scuole, centri anziani e associazioni: mini PC + monitor costano poco e consumano 10-15 W; con Linux (es. FeniceOS, Linux Mint) niente licenze da pagare.",
      "Garanzia «on site» (il tecnico viene da voi) per le postazioni di lavoro.",
      "Gli enti pubblici acquistano tramite le convenzioni e il mercato elettronico della Pubblica Amministrazione: verificate con l'ufficio acquisti."
    ]
  };
})();
