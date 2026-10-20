# 🧠 Consulente Digitale

**Il cervello che sceglie, aggiorna e ottimizza i vostri dispositivi.**
Ideato e sviluppato da **Danilo D'Auria** — un progetto FeniceOS, fratello del [Professore Digitale](https://danilodauria.github.io/professore-digitale/).

Funziona su **Windows 10/11, Linux e macOS**, con o senza Internet, con l'intelligenza artificiale **sul computer** (Ollama):
quello che dite a Neura non esce dal PC.

## Cosa fa
| | |
|---|---|
| 🧠 **Neura** | Cervello digitale olografico che ascolta, parla e si illumina; conversa in italiano, propone azioni come pulsanti, capisce comandi anche senza IA («che ore sono», «il computer è lento», «parla più piano»…). Conversazione a mani libere. |
| 👥 **Scelta iniziale** | Persona, famiglia, persona anziana, studente, creativo, professionista, ditta, azienda, scuola, centro anziani, ente: tutti i consigli si adattano. |
| 🛒 **Cosa comprare, e quando** | Computer, mini PC, tablet, smartphone, smart TV, monitor, stampanti, e-reader: requisiti minimi e ideali, trappole, serie affidabili, **momento migliore calcolato sul giorno e sull'ora esatti** (ora del PC + ora ufficiale INRiM/NTP) con conto alla rovescia, ricerca delle offerte del momento sui comparatori, **controllo di un annuncio**, scheda stampabile. |
| 🔬 **Analisi del PC** | Punteggi, compatibilità Windows 11, **sistema operativo consigliato** per quell'hardware e quel profilo (Windows 11, macOS, FeniceOS, Linux Mint, Zorin, Ubuntu, Fedora, ChromeOS Flex…), migliorie convenienti, **scheda tecnica professionale** con firme. |
| ⬇️ **Aggiornamenti e driver** | Cerca e installa sistema, programmi, driver, firmware e app del negozio dalle fonti ufficiali (Windows Update, winget, Microsoft Store · apt/dnf/zypper/pacman, Flatpak, Snap, fwupd, ubuntu-drivers · Aggiornamento Software, Homebrew, App Store). |
| 🚀 **Ottimizza** | Pulsanti automatici (punto di ripristino, ottimizzazione completa, pulizia, privacy, modalità PC vecchio, ora esatta), **script pronti all'uso** per i 3 sistemi da vedere/salvare/stampare, **Chris Titus WinUtil/LinUtil**, Homebrew, consigli e soluzioni, guide. |
| 🩺 **Salute** | Disco (S.M.A.R.T.), batteria, controllo sicurezza, velocità di Internet, riparazioni, licenza di Windows, **pilota automatico** con rapporto stampabile. |
| 🧬 **Hardware e sensori** | Come HWiNFO, CPU-Z e GPU-Z: componenti in dettaglio, temperature, ventole, tensioni e consumi in diretta; **schema della scheda madre** disegnato dai dati letti con i **punti di un guasto imminente**. |
| 🛠️ **Diagnosi e interventi** | Diagnosi, **lavori da eseguire** (anche con un clic), lavori fatti, **scheda di diagnosi** e **scheda lavori eseguiti** da stampare. |
| 🎙️ **Nonni Teach** | Dalla 1.4.0 si è trasferito nel [Professore Digitale](https://danilodauria.github.io/professore-digitale/), dove Neura continua a intervistare i nonni. Le interviste registrate qui restano sul computer e il Professore le copia con un clic (o da un backup «con le registrazioni»). |
| ♻️ **Economia circolare** | Cosa fare dei vecchi dispositivi, RAEE, diritto alla riparazione, USB-C, ecodesign, batterie; consigli, quiz, patto stampabile. |
| 🪟 **Neura apre le finestre** | Impostazioni, gestione attività, dispositivi, dischi, stampanti… sempre dopo il consenso nel banner. |
| 🔎 **Cerca** · 🖨️ **Stampa** | In alto a destra: trova tutto nel programma; stampa ogni pagina come scheda. |
| ⏹ **Stop** | Accanto all'altoparlante: zittisce Neura all'istante (anche con Esc). |
| 📰 **Notizie** | Informatica, elettronica, sicurezza e IA da testate italiane (feed RSS pubblici), temi scelti per il profilo; si attivano e disattivano, si salvano, si stampano o salvano in PDF, si condividono su WhatsApp, Telegram e Facebook. |
| 🌐 **Lingue** | Italiano, English, Français, Español, Deutsch, Română: interfaccia tradotta con dizionari scritti a mano, Neura risponde e parla nella lingua scelta, testi lunghi tradotti dall'IA locale. |
| 🧹 **Reset** · 💾 **Backup** | Azzera l'ultima domanda, i nomi rimasti o tutto, a scelta, proponendo prima un backup; file `.cdbackup` da importare su Windows, Linux, macOS o sul telefono. |
| 📱 **App per telefono** | Android, iPhone e iPad: si installa dal sito (`/app/`), funziona anche senza Internet. Riconosce il dispositivo e mostra le sue utility: Il mio telefono, Aggiornamenti, Salute e sicurezza con controllo guidato, App consigliate; banner «Aggiungi alla schermata Home»; pulsante ← Indietro. |
| 🔄 **Scarica gli aggiornamenti** | Nuove versioni dal sito ufficiale, verificate con SHA-256. |
| 📦 **Programmi consigliati** | 56 programmi affidabili filtrati per sistema, profilo e RAM, installati con un clic. |
| 💡 **Cose da sapere** · 📜 **Storia** | Backup, password, truffe, privacy, IA, salute, sostenibilità, glossario · linea del tempo dall'abaco all'IA con le tappe italiane (Olivetti, Faggin…), famiglie dei sistemi operativi, quiz. |

## Sicurezza
- Il server ascolta **solo su 127.0.0.1**, controlla Host/Origin e usa un token di sessione.
- Il browser **non può eseguire comandi qualsiasi**: solo le azioni del catalogo (`src/azioni/<sistema>/`), con un parametro in lista bianca.
- I permessi di amministratore li chiede il sistema (UAC, pkexec, password del Mac). Niente telemetria.

## Installare
- **Windows**: `ConsulenteDigitale-Setup-X.Y.Z.exe` (non servono permessi di amministratore; al primo avvio, se manca, scarica Python ufficiale e ne verifica la firma).
- **Linux**: `sudo apt install ./consulente-digitale_X.Y.Z_all.deb`
- **macOS**: aprite lo zip, trascinate l'app in Applicazioni, la prima volta tasto destro → Apri.
- **Portatile**: `ConsulenteDigitale-X.Y.Z-portatile.zip` (anche da chiavetta, per tutti e tre i sistemi).
- **Telefono e tablet**: aprite https://danilodauria.github.io/consulente-digitale/app/ e scegliete «Installa app» (Android) o «Aggiungi alla schermata Home» (iPhone, iPad).

## Vademecum
Il libro di istruzioni completo (138 pagine A4, stampabile) è `docs/Vademecum_Consulente_Digitale.pdf`; si apre anche dal menu del programma
(«📘 Vademecum»). Si rigenera con `python3 tools/schermate-manuale.py` (foto del programma vero) e `python3 tools/genera-vademecum.py`:
le tabelle (azioni e passi degli script, calendario, requisiti, programmi, glossario, storia) sono lette dai dati del programma.

## Sviluppo
```bash
python3 src/server/cd_server.py --port 8810 --apri   # dai sorgenti
python3 tests/test_ui.py                               # prova completa (Playwright + finto Ollama)
python3 tests/controlla_powershell.py                  # sintassi degli script PowerShell
./build.sh                                             # pacchetti in dist/
python3 tools/i18n/costruisci.py                       # dizionari delle lingue da tools/i18n/*.tsv
python3 tests/test_notizie.py; python3 tests/test_backup.py
python3 tools/prepara-pubblicazione.py                 # cartella sito/ per GitHub Pages (download, aggiornamenti.json, app/ per telefono)
```
Pubblicazione: GitHub Desktop → Commit → Push; il workflow `.github/workflows/pubblica-sito.yml` mette online `sito/`.

## Licenze
Codice **MIT** (`LICENSE`) · contenuti, grafica e il personaggio di Neura **CC BY-NC-SA 4.0** (`LICENZA-CONTENUTI.md`) · © 2026 Danilo D'Auria
