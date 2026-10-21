# Consulente Digitale — istruzioni per chi mantiene il progetto (persone e assistenti IA)

Progetto di **Danilo D'Auria** (FeniceOS, Professore Digitale). Doppia licenza come il Professore: codice MIT (`LICENSE`),
contenuti CC BY-NC-SA 4.0 (`LICENZA-CONTENUTI.md`). Leggere tutto prima di modificare.

## Regole non negoziabili
- **Sicurezza delle azioni**: il browser può solo chiedere un'azione del catalogo `AZIONI` in `src/server/cd_azioni.py`; mai
  aggiungere API che eseguono testo arbitrario. Parametri solo in lista bianca (`valida_parametro`): programmi da
  `src/web/dati/programmi.json`, modelli con `RE_MODELLO`, fonti in `FONTI`. Le azioni che modificano il sistema richiedono il
  token di sessione (`/api/status` → `token`). Server solo su 127.0.0.1 con controllo Host/Origin.
- **Mai modifiche senza clic**: Neura propone azioni come pulsanti; avvia da sola solo azioni con `rischio: "nessuno"`
  e solo con l'impostazione `automatico` attiva.
- **Fonti ufficiali** per ogni download/installazione (Windows Update, winget, Microsoft Store, repository della distribuzione,
  Flathub, fwupd/LVFS, Apple, Homebrew, ollama.com, christitus.com). Verificare le firme quando possibile (Python, Ollama).
- **Server senza dipendenze**, Python 3.7+ (`vermin -t=3.7- --no-tips --violations src/server/*.py`). Interfaccia in JS ES5, niente framework, niente CDN.
- **Lingua**: italiano semplice e gentile, adatto agli anziani. Ogni stampa usa `CD.stampa()` (piè di pagina `CD.piedeStampa` in `licenza.js`).
- **Testi nuovi dell'interfaccia**: aggiungere la traduzione nelle 5 lingue in `tools/i18n/extra.tsv` e rigenerare i dizionari.
- **Prezzi**: solo fasce indicative con la data in `CD.ACQ.aggiornato` (`data-acquisti.js`): aggiornarla quando si cambiano.

## Mappa del codice
| Percorso | Contenuto |
|---|---|
| `src/server/cd_server.py` | Server HTTP: API (vedi intestazione), ora NTP (INRiM), prova velocità, Ollama, voce Piper/espeak, finestra in modalità app |
| `src/server/cd_sistema.py` | Analisi hardware per Windows (PowerShell/CIM), Linux (/proc, /sys, lsblk), macOS (system_profiler) e stima della generazione CPU |
| `src/server/cd_azioni.py` | Catalogo azioni, composizione script (`_comune` + corpo), lavori con registro in diretta, elevazione UAC/pkexec/osascript |
| `src/server/cd_hardware.py` | Dettagli dei componenti e sensori in diretta (sonda PowerShell/sh per Windows e Mac, /sys per Linux); `CD_HARDWARE_PROVA=1` = dati di prova |
| `src/server/cd_aperture.py` | Catalogo chiuso delle finestre del sistema che Neura apre dopo il consenso (`POST /api/apri`); `CD_APERTURE_PROVA=1` non apre nulla |
| `src/server/cd_nonni.py` | Nonni Teach: interviste, audio (`POST /api/nonni/<id>/audio/<n>` con `X-CD-Token`), montaggio FFmpeg con capitoli, sito + feed RSS |
| `src/server/cd_programma.py` | «Scarica gli aggiornamenti»: manifesto `aggiornamenti.json` su GitHub Pages, host ammessi, SHA-256, installazione per sistema (`CD_MANIFESTO` per le prove) |
| `src/server/cd_recupero.py`, `src/web/js/salvadati.js` | Salvadati: analisi unità (RAW/illeggibili/cifrate), piani in `CD_DATI/recupero/piano-<id>.json|.sh`, PhotoRec (`recupero-avvia`), controllo integrità dei file, doppioni, nomi, rapporto, copia. `CD_RECUPERO_PROVA=1` (+ `CD_RECUPERO_IMMAGINE`, `CD_RECUPERO_DEST`) |
| `src/server/cd_kit.py`, `src/web/js/kit.js` | Kit di emergenza: SystemRescue (URL e SHA-256 fissi in `cd_kit.py`) + cartella `neura/` + `sysrescue.d/500-neura.yaml` (gui_autostart → `avvia-neura.sh`, `CD_SOCCORSO=1`). Script `kit-crea.ps1` (UEFI, FAT32 ≤31 GB, nome RESCUE1302) e `kit-crea.sh`. `CD_KIT_PROVA=1` scrive in un'immagine |
| `src/server/cd_soccorso.py` | Neura Soccorso (dalla chiavetta): diagnosi a regole, riparazioni SOLO con le chiavi della diagnosi, «tutte sicure» = rischio basso. `CD_SOCCORSO_PROVA=1` = diagnosi finta e comandi simulati |
| `src/web/js/antivirus.js` | Antivirus: Defender/MRT/Defender Offline (Windows), ClamAV con quarantena (Linux/Mac) |
| `src/server/cd_stt_worker.py` | Trascrizione vocale locale (Vosk/faster-whisper), dal Professore Digitale |
| `src/azioni/{windows,linux,mac}/` | Script delle azioni. Protocollo righe: `@@PASSO|n|tot|testo`, `@@VOCE|fonte|nome|attuale|nuova|id|nota`, `@@INFO|chiave|valore`. PowerShell: **mai `exit`**, errori in `$global:CD_CODICE` |
| `src/web/js/core.js` | Nucleo: API, dati, impostazioni (`CD.PREDEFINITE`), profili (`CD.TIPI`), orologio sincronizzato (`CD.adesso`), router, modali, stampa |
| `src/web/js/cervello.js`, `voce.js`, `neura.js` | Il cervello animato; voce e microfono; conversazione (intenzioni locali → IA con `[[azione:ID]]`/`[[vai:PAGINA]]` → guida) |
| `src/web/js/lavori.js` | `CD.esegui(id, parametro, opzioni)` con conferma e console in diretta |
| `src/web/js/acquisti.js` + `data-acquisti.js` | Guida all'acquisto, calendario delle occasioni, controllo annunci |
| `src/web/js/analisi.js` | Punteggi, Windows 11, classifica dei sistemi operativi, migliorie, scheda stampabile |
| `src/web/js/hardware.js`, `scheda-madre.js`, `interventi.js` | Sensori e schede tecniche; modello dei componenti con soglie (`CD.hw.SOGLIE`) e disegno SVG della scheda madre; diagnosi, lavori e schede stampabili |
| `src/web/js/nonni.js`, `data-nonni.js` | Nonni Teach e la banca delle domande (contesti, temi) |
| `src/web/js/circolare.js`, `aperture.js`, `cerca.js`, `programma.js` | Economia circolare; banner del consenso; Cerca/Stampa in alto a destra; aggiornamenti del programma |
| altre pagine | `benvenuto`, `inizio`, `aggiornamenti`, `ottimizza`, `strumenti` (con il pilota automatico), `programmi`, `sapere`, `storia`, `impostazioni`, `licenza` |
| `src/server/cd_notizie.py`, `src/web/js/notizie.js` | Notizie: elenco chiuso di feed RSS verificati (`FONTI`), temi per regex, cache 30 min; solo titolo, riassunto e link (diritti delle testate). `CD_NOTIZIE_PROVA=1` = notizie finte. Il workflow crea `sito/notizie.json` per l'app del telefono |
| `src/server/cd_backup.py`, `src/web/js/backup.js` | File `.cdbackup` (zip: JSON + LICENZA + LEGGIMI + audio facoltativo), importazione unisci/sostituisci con percorsi sicuri, copie automatiche, reset a scelta |
| `src/web/js/i18n.js`, `src/web/i18n/*.json`, `src/server/cd_traduci.py`, `tools/i18n/` | Lingue (it, en, fr, es, de, ro). Chiavi = italiano normalizzato (# numeri, @g giorni, @m mesi, nello STESSO ordine nella traduzione). Si scrivono i lotti `tools/i18n/t*.tsv` ed `extra.tsv`, poi `python3 tools/i18n/costruisci.py`. Testi mancanti → IA locale (cache in `traduzioni/`) |
| `src/web/js/telefono.js` | Modalità telefono (app dal sito, senza server): riconosce telefono/tablet e Android/iPhone/iPad, toglie le pagine del computer (`SOLO_PC` → utility del telefono), pagine «Il mio telefono», aggiornamenti, salute e sicurezza, app consigliate; banner «Aggiungi alla schermata Home». La voce sui telefoni parte solo dopo un tocco (`voce.js`: sblocco e guardie) |
| `src/web/manifest.webmanifest`, `src/web/sw.js` | App per telefono (PWA) in `sito/app/`: il service worker si registra solo su https senza server locale; `prepara-pubblicazione.py` scrive versione ed elenco dei file |
| `packaging/`, `build.sh` | .deb, installatore NSIS (per utente), app macOS, portatile |
| `tests/` | `test_ui.py` (Playwright, finto Ollama), `controlla_powershell.py` (tree-sitter), `test_recupero.py` (PhotoRec vero su immagine FAT32), `test_kit.py` (kit-crea.sh su immagine + Neura dalla chiavetta) |

## Aggiungere un'azione
1. Script in `src/azioni/<sistema>/nome.(ps1|sh)` per ogni sistema supportato, usando le funzioni di `_comune`.
2. Voce in `AZIONI` (`cd_azioni.py`) con id, gruppo, icona, rischio, testi, `s` per sistema (`admin`, `finestra`).
3. Se serve, pulsante nella pagina giusta (`CD.esegui`) e intenzione in `neura.js`.
4. `python3 tests/controlla_powershell.py`, `shellcheck`, `python3 tests/test_ui.py`.

## Vademecum (obbligatorio a ogni versione)
`docs/sorgenti/vademecum/*.html` (parti in ordine di nome) + `stile-manuale.css` → `tools/genera-vademecum.py` → `docs/Vademecum_Consulente_Digitale.pdf`
(entra nei pacchetti e nel menu «📘 Vademecum»). I segnaposto `{{…}}` sono riempiti con i dati veri (catalogo `AZIONI`, passi letti dagli script,
calendario, livelli, programmi, glossario, storia). Le foto si rifanno con `tools/schermate-manuale.py`. A ogni nuova versione: aggiornare i testi
che cambiano, rifare foto e PDF, controllarlo pagina per pagina.

## Pubblicare (GitHub Pages)
`rilascio.conf` (indirizzo del sito) · `docs/novita.json` (novità, la prima voce deve essere la versione di `VERSION`) · `./build.sh` →
`python3 tools/prepara-pubblicazione.py` → cartella `sito/` (index, `aggiornamenti.json` con SHA-256, `scarica/`) → Commit/Push → workflow `pubblica-sito.yml`.

## Numerazione
SemVer come il Professore: correzione X.Y.(Z+1), novità X.(Y+1).0. `VERSION` è l'unica fonte. Un numero pubblicato non si riusa.

## Cosa non si può provare qui
Windows e macOS reali (UAC, Windows Update, winget, osascript), microfono e voce vera, Ollama vero, download reali,
dischi veri per Salvadati, chiavetta reale del kit e avvio di SystemRescue, riparazioni vere di Neura Soccorso, Defender/MRT:
si provano sui PC di Danilo (Windows 11 PCLenovo, Windows 10, Zorin OS) prima di pubblicare.
