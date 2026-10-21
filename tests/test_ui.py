#!/usr/bin/env python3
"""Prova completa dell'interfaccia con Chromium (Playwright): benvenuto, tutte le pagine, Neura con un finto Ollama,
guida all'acquisto, script, azioni vere sul server (cerca aggiornamenti) e screenshot (notte, giorno, telefono).
Uso: python3 tests/test_ui.py   -> screenshot in tests/screenshot/"""
import json
import os
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.request

from playwright.sync_api import sync_playwright

QUI = os.path.dirname(os.path.abspath(__file__))
RADICE = os.path.dirname(QUI)
FOTO = os.path.join(QUI, "screenshot")
PORTA, PORTA_IA = 18910, 18911
ERRORI = []


def attendi_url(url, sec=20):
    fine = time.time() + sec
    while time.time() < fine:
        try:
            urllib.request.urlopen(url, timeout=1).read()
            return True
        except Exception:
            time.sleep(0.2)
    return False


def controlla(cond, msg):
    if not cond:
        ERRORI.append(msg)
        print("  ✖", msg)
    else:
        print("  ✔", msg)


def api(percorso, corpo=None):
    req = urllib.request.Request("http://127.0.0.1:%d%s" % (PORTA, percorso), method="POST" if corpo is not None else "GET",
                                 data=json.dumps(corpo).encode() if corpo is not None else None,
                                 headers={"Content-Type": "application/json", "Host": "127.0.0.1:%d" % PORTA})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read().decode())


def main():
    shutil.rmtree(FOTO, ignore_errors=True)
    os.makedirs(FOTO)
    dati = tempfile.mkdtemp(prefix="cd-test-")
    # un'intervista di Nonni Teach registrata con la 1.3: dalla 1.4.0 resta sul disco e si apre nel Professore Digitale
    ep = os.path.join(dati, "nonni-teach", "20261016-1000-nonno-pippo")
    os.makedirs(ep)
    json.dump({"id": "20261016-1000-nonno-pippo", "titolo": "I racconti di nonno Pippo", "consenso_registrare": True, "domande": []}, open(os.path.join(ep, "episodio.json"), "w"))
    env = dict(os.environ, CD_DATA_DIR=dati, OLLAMA_HOST="http://127.0.0.1:%d" % PORTA_IA, CD_HARDWARE_PROVA="1", CD_APERTURE_PROVA="1", CD_NOTIZIE_PROVA="1",
               CD_RECUPERO_PROVA="1", CD_KIT_PROVA="1", CD_SOCCORSO_PROVA="1", CD_KIT_IMMAGINE=os.path.join(dati, "chiavetta-kit.img"))
    img_rec = None
    if shutil.which("photorec") and shutil.which("mcopy"):       # chiavetta di prova vera per Salvadati (vedi test_recupero.py)
        sys.path.insert(0, QUI)
        import test_recupero
        os.makedirs(os.path.join(dati, "rec"))
        img_rec = test_recupero.prepara_immagine(os.path.join(dati, "rec"))
        os.makedirs(os.path.join(dati, "disco-esterno"))
        env.update(CD_RECUPERO_IMMAGINE=img_rec, CD_RECUPERO_DEST=os.path.join(dati, "disco-esterno"))
    env.pop("DISPLAY", None)
    ia = subprocess.Popen([sys.executable, os.path.join(QUI, "finto_ollama.py"), str(PORTA_IA)])
    srv = subprocess.Popen([sys.executable, os.path.join(RADICE, "src", "server", "cd_server.py"), "--port", str(PORTA), "--inattivo", "0"], env=env)
    try:
        assert attendi_url("http://127.0.0.1:%d/api/status" % PORTA), "server non partito"
        assert attendi_url("http://127.0.0.1:%d/api/tags" % PORTA_IA), "finto Ollama non partito"
        print("API")
        st = api("/api/status")
        controlla(st["app"] == "Consulente Digitale" and len(st["token"]) == 32, "status e token")
        nt = api("/api/nonni")
        controlla(nt.get("trasferito") is True and nt["episodi"] == 1 and "professore-digitale" in nt["professore"], "Nonni Teach trasferito: le interviste vecchie restano e si contano")
        controlla(os.path.isfile(os.path.join(ep, "episodio.json")), "le interviste vecchie non vengono cancellate")
        az = api("/api/azioni")
        controlla(len(az["azioni"]) >= 15, "catalogo azioni (%d)" % len(az["azioni"]))
        for s in ("windows", "mac"):
            controlla(len(api("/api/azioni?sistema=" + s)["azioni"]) >= 15, "azioni per " + s)
            sc = api("/api/script?sistema=%s&nome=%s" % (s, "ottimizza.ps1" if s == "windows" else "ottimizza.sh"))
            controlla("Passo" in sc["testo"] or "passo" in sc["testo"], "script pronto all'uso per " + s)
        try:
            api("/api/azioni/avvia", {"id": "aggiornamenti_cerca", "token": "sbagliato"})
            controlla(False, "token sbagliato rifiutato")
        except urllib.error.HTTPError as e:
            controlla(e.code == 403, "token sbagliato rifiutato")
        try:
            api("/api/azioni/avvia", {"id": "programma_installa", "parametro": "rm -rf /", "token": st["token"]})
            controlla(False, "parametro fuori lista rifiutato")
        except urllib.error.HTTPError as e:
            controlla(e.code == 400, "parametro fuori lista rifiutato")
        lav = api("/api/azioni/avvia", {"id": "batteria", "token": st["token"]})["lavoro"]
        for _ in range(60):
            j = api("/api/lavori/" + lav)
            if j["stato"] != "in_corso":
                break
            time.sleep(0.5)
        controlla(j["stato"] == "fatto" and j["info"].get("salute") == "nessuna", "azione vera «batteria» eseguita (%s)" % j["stato"])
        lav = api("/api/azioni/avvia", {"id": "pulizia", "token": st["token"]})["lavoro"]
        for _ in range(240):
            j = api("/api/lavori/" + lav)
            if j["stato"] != "in_corso":
                break
            time.sleep(0.5)
        controlla(j["stato"] in ("negato", "fatto"), "azione da amministratore senza finestra di permesso: %s" % j["stato"])
        ora = api("/api/ora")
        controlla(ora["locale"] and ora["internet"] is None, "ora del computer")

        print("Interfaccia")
        with sync_playwright() as p:
            b = p.chromium.launch(args=["--autoplay-policy=no-user-gesture-required"])
            ctx = b.new_context(viewport={"width": 1440, "height": 900}, locale="it-IT")
            pg = ctx.new_page()
            pg.on("pageerror", lambda e: ERRORI.append("errore JS: %s %s" % (e, e.stack)))
            pg.on("console", lambda m: m.type == "error" and "favicon" not in m.text and ERRORI.append("console: " + m.text))
            pg.on("response", lambda r: r.status >= 400 and ERRORI.append("risposta %d: %s" % (r.status, r.url)))
            base = "http://127.0.0.1:%d/" % PORTA
            pg.goto(base + "?nosaluto")
            pg.wait_for_selector("#benv-tipi .tessera")
            controlla("#/benvenuto" in pg.url, "primo avvio → scelta iniziale")
            pg.screenshot(path=os.path.join(FOTO, "01-benvenuto.png"))
            pg.click('[data-t="centro"]')
            pg.fill("#benv-nome", "Centro Anziani Il Girasole")
            pg.fill("#benv-quanti", "12")
            pg.screenshot(path=os.path.join(FOTO, "02-benvenuto-passo2.png"))
            pg.click("#benv-fine")
            pg.wait_for_selector(".plancia")
            pg.wait_for_selector("#home-pc .metro", timeout=30000)
            time.sleep(1.5)
            pg.screenshot(path=os.path.join(FOTO, "03-inizio-giorno.png"))
            piede = pg.inner_text(".menu-piede")
            ver = open(os.path.join(RADICE, "VERSION")).read().strip()
            controlla("Danilo D'Auria" in piede and "Codice MIT · Contenuti CC BY-NC-SA 4.0" in piede and ("v" + ver) in piede,
                      "in fondo al menu: autore, licenza e versione %s" % ver)
            controlla(pg.get_attribute(".menu-piede a.piede-lic", "href") == "#/licenza", "la licenza in fondo al menu apre la pagina Licenza")
            pg.wait_for_selector("#home-nonni:not([hidden]) #home-nonni-pd", timeout=15000)
            controlla("Professore Digitale" in pg.inner_text("#home-nonni") and "computer: 1." in pg.inner_text("#home-nonni"), "Inizio: avviso «Nonni Teach si è trasferito» con le interviste da copiare")
            controlla(pg.locator('a[href="#/nonni"]').count() == 0 and not pg.evaluate("!!(CD.viste && CD.viste.nonni)"), "Nonni Teach tolto dal menu e dalle pagine")
            pg.screenshot(path=os.path.join(FOTO, "03b-nonni-trasferito.png"))
            controlla(pg.get_attribute("html", "data-tema") == "giorno", "profilo centro anziani → tema chiaro")
            pg.evaluate("CD.imp.tema='notte'; CD.imp.testo=17; CD.salvaImpostazioni()")
            time.sleep(1.2)
            pg.screenshot(path=os.path.join(FOTO, "04-inizio-notte.png"))

            # Neura
            pg.goto(base + "#/neura")
            pg.wait_for_selector("#neura-input")
            pg.fill("#neura-input", "che ore sono?")
            pg.press("#neura-input", "Enter")
            pg.wait_for_function("document.querySelectorAll('#chat-grande .msg-neura').length >= 2 && !/…$/.test(document.querySelector('#chat-grande .msg-neura:last-child').textContent)")
            ultima = pg.inner_text("#chat-grande .msg-neura:last-child")
            controlla("Sono le" in ultima, "Neura dice l'ora: " + ultima[:60])
            pg.fill("#neura-input", "vorrei fare un podcast con i nonni")
            pg.press("#neura-input", "Enter")
            pg.wait_for_function("document.querySelectorAll('#chat-grande .msg-neura').length >= 3 && /Professore Digitale/.test(document.querySelector('#chat-grande .msg-neura:last-child').textContent)", timeout=15000)
            controlla("🌐 Il Professore Digitale" in pg.inner_text("#chat-grande .msg-neura:last-child"), "Neura: Nonni Teach è nel Professore Digitale (con il pulsante)")
            pg.fill("#neura-input", "Mi spieghi in due parole come scegliere un buon computer per mio nipote?")
            pg.press("#neura-input", "Enter")
            pg.wait_for_selector("#chat-grande .msg-neura:last-child [data-cmd]", timeout=15000)
            ult = json.loads(urllib.request.urlopen("http://127.0.0.1:%d/ultima" % PORTA_IA).read())
            sistema = ult.get("messages", [{}])[0].get("content", "")
            controlla("Neura" in sistema and "Danilo D'Auria" in sistema and "Oggi è" in sistema, "prompt di sistema con identità, autore e data")
            controlla("[[azione:aggiornamenti_cerca]]" in sistema, "prompt con le azioni disponibili")
            btn = pg.inner_text("#chat-grande .msg-neura:last-child .msg-azioni")
            controlla("Cosa comprare" in btn and "Cerca gli aggiornamenti" in btn, "comandi dell'IA diventati pulsanti")
            time.sleep(0.8)
            pg.screenshot(path=os.path.join(FOTO, "05-neura.png"))
            pg.fill("#neura-input", "il mio computer è lento")
            pg.press("#neura-input", "Enter")
            time.sleep(1.5)

            # Acquisti
            pg.goto(base + "#/acquisti")
            pg.wait_for_selector("[data-disp]")
            controlla(pg.locator(".rovescia").count() >= 1, "conto alla rovescia delle offerte")
            pg.click('[data-disp="portatile"]')
            pg.click('[data-chi="studente"]')
            pg.click("#acq-avanti")
            pg.check('[data-uso="studio"]')
            pg.check('[data-uso="videochiamate"]')
            pg.click("#acq-avanti")
            pg.click('[data-fascia="medio"]')
            pg.click("#acq-avanti")
            pg.wait_for_selector("#acq-annuncio")
            pg.fill("#acq-annuncio", "Notebook 15,6\" Intel Celeron N4500, 4GB RAM, 128GB eMMC, 299 €, pagamento con ricarica Postepay")
            pg.click("#acq-valuta")
            esito = pg.inner_text("#acq-esito")
            controlla("eMMC" in esito and "truffe" in esito, "controllo dell'annuncio trova le trappole")
            pg.screenshot(path=os.path.join(FOTO, "06-acquisti-risultato.png"), full_page=True)

            # Analisi
            pg.goto(base + "#/analisi")
            pg.wait_for_selector("#an-corpo .metri", timeout=30000)
            pg.screenshot(path=os.path.join(FOTO, "07-analisi.png"), full_page=True)
            pg.goto(base + "#/analisi/sistemi")
            pg.wait_for_selector(".so")
            controlla("FeniceOS" in pg.inner_text("#an-corpo"), "FeniceOS tra i sistemi consigliati (profilo centro anziani)")
            pg.screenshot(path=os.path.join(FOTO, "08-sistemi.png"), full_page=True)

            for vista, nome, sel in (("aggiornamenti", "09-aggiornamenti", "#agg-cerca"), ("ottimizza", "10-ottimizza", "[data-az]"),
                                     ("ottimizza/script/windows", "11-script-windows", "[data-vedi]"), ("ottimizza/soluzioni", "12-soluzioni", "details"),
                                     ("strumenti", "13-strumenti", "[data-run]"), ("strumenti/ora", "14-ora", ".ora-mega"), ("programmi", "15-programmi", "[data-inst]"),
                                     ("sapere", "16-sapere", ".tessera"), ("sapere/truffe", "17-sapere-scheda", ".sapere-art"), ("storia", "18-storia", ".linea-tempo li"),
                                     ("impostazioni", "19-impostazioni", "#imp-voce"), ("licenza", "20-licenza", ".cc-badge"), ("sostieni", "21-sostieni", ".qr svg"), ("strumenti/apri", "27-apri", "[data-ap]"),
                                     ("circolare", "28-circolare", "[data-s]"), ("circolare/regole", "29-circolare-regole", ".scheda h3"), ("circolare/quiz", "30-circolare-quiz", "[data-r]")):
                pg.goto(base + "#/" + vista)
                pg.wait_for_selector(sel, timeout=15000)
                time.sleep(0.4)
                pg.screenshot(path=os.path.join(FOTO, nome + ".png"), full_page=True)
            pg.goto(base + "#/ottimizza/script/linux")
            pg.wait_for_selector("[data-vedi]")
            pg.click("[data-vedi]")
            pg.wait_for_selector(".modale pre.codice")
            controlla("passo()" in pg.inner_text(".modale pre.codice"), "script Linux leggibile con le funzioni comuni")
            pg.screenshot(path=os.path.join(FOTO, "22-script-aperto.png"))
            pg.keyboard.press("Escape")
            pg.goto(base + "#/storia")
            pg.click("#st-quiz [data-k='1']")
            controlla("Esatto" in pg.inner_text("#qz-sp"), "quiz della storia")

            # Hardware e sensori (dati di prova) e diagnosi con i lavori
            pg.goto(base + "#/hardware")
            pg.wait_for_selector(".hw-tessera", timeout=20000)
            pg.click('[data-tab="schema"]')
            pg.wait_for_selector("svg.schema-scheda .sm-comp", timeout=10000)
            controlla(pg.locator(".sm-problemi li").count() >= 1, "schema della scheda madre con i punti a rischio")
            pg.screenshot(path=os.path.join(FOTO, "23-scheda-madre.png"), full_page=True)
            pg.goto(base + "#/interventi")
            pg.click("#int-nuova")
            pg.wait_for_selector(".int-lavori li", timeout=30000)
            pg.locator("[data-fatto]").first.check()
            pg.click(".modale .primario")
            pg.wait_for_selector(".int-lavori li.fatto", timeout=5000)
            controlla(True, "diagnosi, lavori da eseguire e lavoro segnato come fatto")
            pg.screenshot(path=os.path.join(FOTO, "24-interventi.png"), full_page=True)

            # Neura apre una finestra del sistema solo dopo il consenso nel banner
            pg.goto(base + "#/strumenti/apri")
            pg.wait_for_selector("[data-ap]", timeout=10000)
            pg.click("[data-ap]")
            pg.wait_for_selector("#banner-consenso.visibile #bc-si", timeout=5000)
            pg.click("#bc-si")
            pg.wait_for_selector(".avviso-volante.ok", timeout=5000)
            controlla("Aperto" in pg.inner_text("#avvisi"), "apertura di una finestra del sistema con consenso")

            # Azione dall'interfaccia: controllo batteria con la console in diretta
            pg.goto(base + "#/strumenti")
            pg.click('[data-run="batteria"]')
            pg.wait_for_selector("#esito-batteria table, #esito-batteria .vuoto", timeout=30000)
            controlla(True, "azione avviata dall'interfaccia")

            # 1.2.0 - Stop della voce
            pg.goto(base + "#/")
            pg.wait_for_selector("#btn-stop")
            pg.evaluate("CD.parla && CD.parla('Prova della voce di Neura, una frase abbastanza lunga da fermare.')")
            pg.click("#btn-stop")
            controlla(not pg.evaluate("CD.staParlando()"), "il pulsante Stop ferma la voce")

            # 1.2.0 - Notizie: elenco, salvataggio, condivisione, disattivazione
            pg.goto(base + "#/notizie")
            pg.wait_for_selector(".nz-card", timeout=15000)
            controlla(pg.locator(".nz-card").count() >= 3, "notizie di prova in elenco")
            controlla(pg.locator(".nz-card a[href*='wa.me']").count() + pg.locator("[data-condividi]").count() > 0 or "WhatsApp" in pg.inner_text("#principale"), "condivisione WhatsApp/Telegram/Facebook")
            pg.screenshot(path=os.path.join(FOTO, "25-notizie.png"))
            st_n = api("/api/notizie")
            controlla(len(st_n.get("notizie", [])) >= 3, "API notizie")

            # 1.2.0 - Reset: finestra con le scelte e richiesta di backup
            pg.goto(base + "#/")
            pg.click("#btn-reset")
            pg.wait_for_selector(".modale", timeout=5000)
            controlla("TUTTO" in pg.inner_text(".modale") or "Tutto" in pg.inner_text(".modale"), "reset: scelta selezionabile (anche tutto)")
            pg.screenshot(path=os.path.join(FOTO, "26-reset.png"))
            pg.keyboard.press("Escape")
            bk = urllib.request.urlopen(urllib.request.Request("http://127.0.0.1:%d/api/backup" % PORTA, data=json.dumps({"token": st["token"]}).encode(),
                                                               headers={"Content-Type": "application/json", "Origin": "http://127.0.0.1:%d" % PORTA}), timeout=30)
            controlla(".cdbackup" in (bk.headers.get("Content-Disposition") or "") and bk.read(2) == b"PK", "backup .cdbackup (zip)")

            # 1.2.0 - Lingue: inglese e ritorno all'italiano
            print("Salvadati, antivirus, kit, soccorso")
            pg.goto(base + "#/recupero")
            pg.wait_for_selector("#sd-analisi table", timeout=30000)
            t = pg.inner_text("#sd-analisi")
            controlla("RAW" in t and "illeggibile" in t, "Salvadati: analisi con unità RAW e illeggibili")
            pg.screenshot(path=os.path.join(FOTO, "30-salvadati-analisi.png"), full_page=True)
            if img_rec:
                pg.check('input[name="sd-sorg"][value="%s"]' % img_rec)
                pg.check('input[name="sd-modo"][value="superficiale"]')
                pg.select_option("#sd-dest", "dest-prova")
                pg.click("#sd-avvia")
                pg.click(".modale .pulsanti button.primario")
                pg.wait_for_selector("#lav-stato.ok", timeout=120000)
                pg.click(".modale .pulsanti button.primario")
                pg.wait_for_selector(".maschera-salvadati", timeout=60000)
                t = pg.inner_text(".maschera-salvadati")
                controlla("file recuperati" in t and "spazio necessario" in t and "danneggiati" in t, "Salvadati: maschera finale con file, spazio e scartati")
                controlla(pg.inner_text(".cifra.grande.ok b").strip() == "3", "Salvadati: 3 file integri nella maschera")
                time.sleep(0.5)
                pg.screenshot(path=os.path.join(FOTO, "31-salvadati-risultato.png"), full_page=True)
            pg.goto(base + "#/antivirus")
            pg.wait_for_selector("[data-av]")
            controlla(pg.locator("[data-av]").count() >= 4, "Antivirus: pulsanti di aggiornamento, controlli e quarantena")
            pg.screenshot(path=os.path.join(FOTO, "32-antivirus.png"), full_page=True)
            open(os.path.join(dati, "chiavetta-kit.img"), "wb").close()
            pg.goto(base + "#/kit")
            pg.wait_for_selector('input[name="kit-u"]')
            controlla(pg.is_enabled("#kit-crea"), "Kit: chiavetta adatta trovata")
            pg.screenshot(path=os.path.join(FOTO, "33-kit-emergenza.png"), full_page=True)
            pg.goto(base + "#/soccorso")
            pg.wait_for_selector(".sintesi-neura")
            controlla(pg.locator(".problema").count() >= 3 and "ibernato" in pg.inner_text("#sc-corpo"), "Soccorso: diagnosi con i problemi trovati")
            pg.screenshot(path=os.path.join(FOTO, "34-neura-soccorso.png"), full_page=True)
            pg.click("#sc-tutto")
            pg.click(".modale .pulsanti button.primario")
            pg.wait_for_selector("text=Riparazione finita", timeout=20000)
            controlla("efibootmgr" in pg.inner_text("#sc-lavoro") and "ntfs-3g" not in pg.inner_text("#sc-lavoro"),
                      "Soccorso: «Ripara tutto ciò che è sicuro» fa solo le riparazioni a rischio basso")
            pg.screenshot(path=os.path.join(FOTO, "35-soccorso-riparato.png"), full_page=True)
            try:
                api("/api/soccorso/ripara", {"token": st["token"], "chiavi": ["rm -rf /"]})
                controlla(False, "Soccorso: riparazioni fuori dalla diagnosi rifiutate")
            except urllib.error.HTTPError as e:
                controlla(e.code == 400, "Soccorso: riparazioni fuori dalla diagnosi rifiutate")
            try:
                api("/api/kit/piano", {"token": st["token"], "disco": "/dev/sda"})
                controlla(False, "Kit: disco non adatto rifiutato")
            except urllib.error.HTTPError as e:
                controlla(e.code == 400, "Kit: disco non adatto rifiutato")
            pg.goto(base + "#/impostazioni"); time.sleep(1)
            pg.evaluate("CD.i18n.cambia('en')"); time.sleep(4)
            controlla("Settings" in pg.inner_text("#principale"), "interfaccia in inglese")
            pg.screenshot(path=os.path.join(FOTO, "27-inglese.png"))
            pg.evaluate("CD.i18n.cambia('it')"); time.sleep(4)
            controlla("Impostazioni" in pg.inner_text("#principale"), "ritorno all'italiano")

            # Telefono
            tel = b.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True, locale="it-IT")
            pt = tel.new_page()
            pt.on("pageerror", lambda e: ERRORI.append("errore JS (telefono): %s" % e))
            pt.goto(base + "?noprofilo&nosaluto#/")
            pt.wait_for_selector(".plancia")
            time.sleep(1)
            pt.screenshot(path=os.path.join(FOTO, "23-telefono.png"), full_page=True)
            controlla(pt.evaluate("document.documentElement.scrollWidth <= innerWidth + 1"), "telefono: niente scorrimento orizzontale")

            # App per telefono (sito, senza programma): iPhone con voce che parte solo dopo un tocco
            web = subprocess.Popen([sys.executable, "-m", "http.server", str(PORTA + 5), "--bind", "127.0.0.1", "-d", os.path.join(RADICE, "src", "web")],
                                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            try:
                attendi_url("http://127.0.0.1:%d/" % (PORTA + 5))
                ip = b.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True, locale="it-IT",
                                   user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/141.0 Mobile/15E148 Safari/604.1")
                ip.add_init_script("""(function(){var g=false;['touchend','click'].forEach(function(e){document.addEventListener(e,function(){g=true},true)});
                  window.__detti=[];var S=window.speechSynthesis;S.speak=function(u){if(!g)return;window.__detti.push(u.text);setTimeout(function(){u.onstart&&u.onstart({})},30);setTimeout(function(){u.onend&&u.onend({})},200)};
                  S.cancel=function(){};S.getVoices=function(){return []};try{localStorage.setItem('cd.profilo','{"tipo":"persona","nome":"Maria"}')}catch(e){}})();""")
                pi = ip.new_page()
                pi.on("pageerror", lambda e: ERRORI.append("errore JS (app iPhone): %s" % e))
                wb = "http://127.0.0.1:%d/" % (PORTA + 5)
                pi.goto(wb + "#/")
                time.sleep(4.5)
                controlla(pi.evaluate("CD.cervello.stato()") != "parla" and not pi.evaluate("document.getElementById('btn-stop').classList.contains('parla')"),
                          "app iPhone: senza tocco Neura non resta «gialla»")
                pi.tap("h1"); time.sleep(1.2)
                controlla(any("Maria" in t for t in pi.evaluate("window.__detti")), "app iPhone: dopo il tocco Neura saluta a voce")
                menu = pi.inner_text("#menu")
                controlla("Il mio telefono" in menu and "Analisi del PC" not in menu and "Ottimizza" not in menu, "app iPhone: menu con le utility del telefono")
                pi.goto(wb + "#/analisi"); time.sleep(1)
                controlla(pi.evaluate("location.hash") == "#/telefono", "app iPhone: Analisi del PC → Il mio telefono")
                pi.goto(wb + "#/telefono/salute"); pi.wait_for_selector("#tel-controllo")
                pi.click("#btn-indietro"); time.sleep(0.6)
                controlla(pi.evaluate("location.hash") == "#/telefono", "app iPhone: pulsante ← Indietro")
                pi.evaluate("CD.telefono.banner(true)"); pi.wait_for_selector("#banner-home")
                controlla("Condividi" in pi.inner_text("#banner-home"), "app iPhone: banner «Aggiungi alla schermata Home»")
                pi.screenshot(path=os.path.join(FOTO, "28-app-iphone.png"))
            finally:
                web.terminate()
            pt.goto(base + "?noprofilo&nosaluto#/acquisti/smartphone")
            pt.wait_for_selector("[data-chi]")
            pt.screenshot(path=os.path.join(FOTO, "24-telefono-acquisti.png"))
            b.close()
    finally:
        srv.terminate()
        ia.terminate()
        shutil.rmtree(dati, ignore_errors=True)
    print("\n%d problemi" % len(ERRORI))
    for e in ERRORI:
        print(" -", e)
    return 1 if ERRORI else 0


if __name__ == "__main__":
    sys.exit(main())
