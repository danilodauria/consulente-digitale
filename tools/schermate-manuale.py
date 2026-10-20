#!/usr/bin/env python3
"""Fotografa il programma vero per il vademecum: avvia server + finto Ollama, percorre le pagine e salva
JPEG in docs/sorgenti/img/. Uso: python3 tools/schermate-manuale.py
Autore: Danilo D'Auria - Codice MIT"""
import base64
import io
import os
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.request

from PIL import Image
from playwright.sync_api import sync_playwright

RADICE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(RADICE, "docs", "sorgenti", "img")
PORTA, PIA = 18950, 18951


def salva(png, nome, larghezza=1500):
    im = Image.open(io.BytesIO(png)).convert("RGB")
    if im.width > larghezza:
        im = im.resize((larghezza, round(im.height * larghezza / im.width)), Image.LANCZOS)
    im.save(os.path.join(OUT, nome + ".jpg"), "JPEG", quality=80, optimize=True, progressive=True)
    print("  ", nome, im.size)


def attendi(url):
    for _ in range(100):
        try:
            urllib.request.urlopen(url, timeout=1)
            return
        except Exception:
            time.sleep(0.2)
    raise SystemExit("non parte: " + url)


def main():
    os.makedirs(OUT, exist_ok=True)
    for f in os.listdir(OUT):          # si rifanno solo le foto; copertina e logo si rigenerano sotto
        if f.endswith((".jpg", ".png")):
            os.remove(os.path.join(OUT, f))
    shutil.copy(os.path.join(RADICE, "src", "web", "img", "logo.svg"), os.path.join(OUT, "logo.svg"))
    dati = tempfile.mkdtemp()
    # manifesto degli aggiornamenti finto (stessa versione: «siete aggiornati» con le novità vere)
    sito = tempfile.mkdtemp()
    import json
    v = open(os.path.join(RADICE, "VERSION")).read().strip()
    nov = json.load(open(os.path.join(RADICE, "docs", "novita.json"), encoding="utf-8"))["versioni"][0]
    json.dump({"versione": v, "data": nov["data"], "novita": nov["novita"]}, open(os.path.join(sito, "aggiornamenti.json"), "w"))
    web = subprocess.Popen([sys.executable, "-m", "http.server", str(PORTA + 2), "--bind", "127.0.0.1"], cwd=sito, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    env = dict(os.environ, CD_DATA_DIR=dati, OLLAMA_HOST="http://127.0.0.1:%d" % PIA, CD_HARDWARE_PROVA="1", CD_APERTURE_PROVA="1", CD_NOTIZIE_PROVA="1",
               CD_MANIFESTO="http://127.0.0.1:%d/aggiornamenti.json" % (PORTA + 2))
    ia = subprocess.Popen([sys.executable, os.path.join(RADICE, "tests", "finto_ollama.py"), str(PIA)])
    srv = subprocess.Popen([sys.executable, os.path.join(RADICE, "src", "server", "cd_server.py"), "--port", str(PORTA), "--inattivo", "0"],
                           env=env, stdout=subprocess.DEVNULL)
    base = "http://127.0.0.1:%d/" % PORTA
    try:
        attendi(base + "api/status")
        attendi("http://127.0.0.1:%d/api/tags" % PIA)
        with sync_playwright() as p:
            b = p.chromium.launch(args=["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"])
            ctx = b.new_context(viewport={"width": 1366, "height": 860}, device_scale_factor=1.25, locale="it-IT")
            ctx.grant_permissions(["microphone"], origin=base.rstrip("/"))
            ctx.add_init_script("try{sessionStorage.setItem('cd.salutato','1')}catch(e){}")
            pg = ctx.new_page()

            def foto(nome, full=False, sel=None, attesa=0.9):
                time.sleep(attesa)
                if sel:   # foto di un riquadro: la barra in alto e il cervellino non devono coprirlo
                    pg.evaluate("document.querySelector('.barra').style.position='static';document.getElementById('neura-dock').style.display='none'")
                    salva(pg.locator(sel).first.screenshot(), nome)
                    pg.evaluate("document.querySelector('.barra').style.position='';document.getElementById('neura-dock').style.display=''")
                else:
                    salva(pg.screenshot(full_page=full), nome)

            def vai(h, sel):
                pg.evaluate("var s=document.getElementById('modale-sfondo'); if(s){s.hidden=true;s.innerHTML='';}")
                pg.goto(base + "?nosaluto#/" + h)
                pg.wait_for_selector(sel, timeout=30000)

            pg.goto(base + "?nosaluto")
            pg.wait_for_selector("#benv-tipi .tessera")
            foto("benvenuto-1", attesa=1.5)
            pg.click('[data-t="ditta"]')
            pg.fill("#benv-nome", "Ferramenta Rossi")
            pg.fill("#benv-quanti", "4")
            foto("benvenuto-2")
            pg.click("#benv-fine")
            pg.wait_for_selector("#home-pc .metro", timeout=30000)
            pg.evaluate("document.getElementById('dock-pannello').hidden=true")
            foto("inizio", attesa=1.5)
            pg.click("#dock-cervello")
            foto("dock", attesa=1.2)
            pg.click("#dock-chiudi")

            vai("neura", "#neura-input")
            for q in ("che ore sono?", "Che computer consigli per la contabilità della ditta?", "il mio computer è lento"):
                pg.fill("#neura-input", q)
                pg.press("#neura-input", "Enter")
                time.sleep(2.2)
            foto("neura", attesa=0.8)
            pg.evaluate("CD.cervello.stato('ascolto')"); foto("neura-ascolto", sel=".neura-grande", attesa=1.2)
            pg.evaluate("CD.cervello.stato('pensiero')"); foto("neura-pensiero", sel=".neura-grande", attesa=1.2)
            pg.evaluate("CD.cervello.stato('parla')"); foto("neura-parla", sel=".neura-grande", attesa=1.2)
            pg.evaluate("CD.cervello.stato('riposo')"); foto("neura-riposo", sel=".neura-grande", attesa=1.2)

            vai("acquisti", "[data-disp]")
            foto("acquisti-1")
            pg.click('[data-disp="portatile"]'); foto("acquisti-2", sel=".acq-passi")
            pg.click('[data-chi="ditta"]'); pg.click("#acq-avanti")
            for u in ("ufficio", "web", "videochiamate"):
                pg.check('[data-uso="%s"]' % u)
            foto("acquisti-3", sel=".acq-passi")
            pg.click("#acq-avanti"); pg.click('[data-fascia="medio"]'); pg.click('[data-sis="windows"]')
            foto("acquisti-4", sel=".acq-passi")
            pg.click("#acq-avanti")
            pg.wait_for_selector("#acq-annuncio")
            foto("acquisti-scheda")
            pg.fill("#acq-annuncio", "Notebook 15,6\" Intel Core i5-1335U, 16GB RAM, SSD 512GB NVMe, Full HD IPS, 549 €")
            pg.click("#acq-valuta")
            foto("acquisti-offerta-buona", sel="#acq-esito")
            pg.fill("#acq-annuncio", "PC portatile 14\" Celeron N4020 4GB 64GB eMMC 1366x768 solo 199 € -65% pagamento con bonifico")
            pg.click("#acq-valuta")
            foto("acquisti-offerta-cattiva", sel="#acq-esito")
            foto("acquisti-calendario", sel=".scheda:has(.momento)")

            vai("analisi", "#an-corpo .metri"); foto("analisi")
            vai("analisi/sistemi", ".so"); foto("analisi-sistemi")
            vai("analisi/migliorie", "#an-corpo .scheda, #an-corpo .avviso"); foto("analisi-migliorie")
            vai("aggiornamenti", "#agg-cerca"); foto("aggiornamenti")
            pg.click("#agg-cerca")
            pg.wait_for_selector("#agg-installa", timeout=120000)
            pg.wait_for_selector("#lav-stato.ok, #lav-stato.male", timeout=120000)
            foto("aggiornamenti-console")
            pg.evaluate("var s=document.getElementById('modale-sfondo'); s.hidden=true; s.innerHTML='';")
            foto("aggiornamenti-risultato")
            vai("ottimizza", "[data-az]"); foto("ottimizza")
            pg.click('[data-az="ottimizza"]'); pg.wait_for_selector(".modale"); foto("conferma-azione")
            pg.keyboard.press("Escape")
            vai("ottimizza/script/windows", "[data-vedi]"); foto("script-elenco")
            pg.click("[data-vedi]"); pg.wait_for_selector(".modale pre"); foto("script-aperto"); pg.keyboard.press("Escape")
            vai("ottimizza/esperti", "[data-az]"); foto("esperti")
            vai("ottimizza/soluzioni", "details"); pg.click("details.problema summary"); foto("soluzioni")
            vai("strumenti", "[data-run]")
            pg.evaluate("CD.esegui('batteria','',{senzaConferma:true})")
            pg.wait_for_selector("#lav-stato.ok, #lav-stato.male", timeout=60000)
            foto("console-lavoro")
            pg.evaluate("var s=document.getElementById('modale-sfondo'); s.hidden=true; s.innerHTML='';")
            pg.goto(base + "?nosaluto#/strumenti")
            pg.wait_for_selector("[data-run]")
            pg.click("#st-pilota")
            pg.wait_for_selector("#pl-rapporto .neura-dice", timeout=240000)
            foto("pilota")
            vai("strumenti/ora", ".ora-mega"); foto("ora")
            vai("programmi", "[data-inst]"); foto("programmi")
            vai("sapere", ".tessera"); foto("sapere")
            vai("storia", ".linea-tempo li"); foto("storia")
            vai("impostazioni", "#imp-voce"); foto("impostazioni", full=True)
            vai("licenza", ".cc-badge"); foto("licenza")
            # --- novità 1.1: hardware, diagnosi, aperture, cerca, economia circolare, aggiornamenti (Nonni Teach dalla 1.4.0 è nel Professore Digitale)
            vai("hardware", ".hw-tessera"); foto("hardware", attesa=9)
            pg.click('[data-tab="schema"]'); pg.wait_for_selector(".hw-schema svg"); foto("hardware-schema", sel=".hw-schema", attesa=1.2)
            foto("hardware-legenda", sel=".sm-problemi", attesa=0.3)
            pg.click('[data-tab="cpu"]'); foto("hardware-cpu", attesa=0.8)
            pg.click('[data-tab="sensori"]'); foto("hardware-sensori", attesa=2.5)
            vai("interventi", "#int-nuova"); pg.click("#int-nuova"); pg.wait_for_selector(".int-lavori li", timeout=30000)
            pg.locator("[data-fatto]").first.check(); pg.wait_for_selector(".modale #int-esito"); pg.fill("#int-esito", "Copia su disco esterno, 40 GB")
            pg.click(".modale .primario"); foto("interventi", full=True, attesa=1)
            vai("strumenti/apri", "[data-ap]"); foto("apri")
            pg.click("[data-ap]"); pg.wait_for_selector("#banner-consenso.visibile"); foto("consenso", attesa=0.6)
            pg.click("#bc-no")
            pg.click("#btn-cerca"); pg.keyboard.type("batteria"); foto("cerca", attesa=1)
            pg.keyboard.press("Escape")
            vai("circolare", "[data-s]"); foto("circolare")
            vai("circolare/regole", ".scheda h3"); foto("circolare-regole")
            vai("circolare/quiz", "[data-r]"); pg.click("[data-r]"); foto("circolare-quiz")
            # 1.2.0: notizie, stop, reset e backup, lingue
            vai("notizie", ".nz-card"); foto("notizie", attesa=1.2)
            pg.locator(".nz-card").first.locator("[data-a=\"salva\"]").click(); foto("notizie-azioni", sel=".nz-card", attesa=0.6)
            foto("barra-pulsanti", sel=".strumenti-barra", attesa=0.3)
            vai("impostazioni", "#imp-voce"); pg.locator("#sez-backup").scroll_into_view_if_needed(); foto("backup", sel="#sez-backup", attesa=0.6)
            pg.click("#btn-reset"); pg.wait_for_selector(".modale"); foto("reset", sel=".modale", attesa=0.6); pg.keyboard.press("Escape")
            pg.click("#btn-lingua"); pg.wait_for_selector(".modale .lingue"); foto("lingue", sel=".modale", attesa=0.6); pg.keyboard.press("Escape")
            pg.evaluate("CD.i18n.cambia('en')"); time.sleep(4); vai("", "#home-pc .metro"); foto("inglese", attesa=1.5)
            pg.evaluate("CD.i18n.cambia('it')"); time.sleep(4)
            vai("programma", "#pg-controlla"); pg.click("#pg-controlla"); pg.wait_for_selector("#pg-esito ul"); foto("programma")
            # schede di stampa: si cattura il documento preparato per la stampante
            for nome, codice in (("stampa-analisi", "CD.analisi.dati().then(CD.analisi.stampa)"),
                                 ("stampa-diagnosi", "CD.interventi.carica().then(function(d){CD.interventi.stampaDiagnosi(d.schede[0])})"),
                                 ("stampa-lavori", "CD.interventi.carica().then(function(d){CD.interventi.stampaEseguiti(d.schede[0])})")):
                pg.evaluate("window.__orig=window.__orig||CD.stampa; CD.stampa=function(t,c,o){window.__orig(t,c,o)}; " + codice)
                time.sleep(2.5)
                html = pg.evaluate("document.getElementById('cornice-stampa').contentDocument.documentElement.outerHTML")
                fogli = ctx.new_page()
                fogli.set_viewport_size({"width": 794, "height": 1123})
                fogli.set_content(html.replace("<head>", '<head><base href="%s">' % base, 1), wait_until="load")
                time.sleep(0.6)
                salva(fogli.screenshot(full_page=True), nome, 1000)
                fogli.close()
            # il cervello grande, trasparente, per la copertina
            cop = ctx.new_page()
            cop.set_viewport_size({"width": 1000, "height": 1000})
            cop.goto(base + "?noprofilo&nosaluto#/neura")
            cop.wait_for_selector("#cervello-grande")
            cop.add_style_tag(content=".neura-grande canvas{width:900px!important;max-width:none!important}")
            cop.evaluate("window.dispatchEvent(new Event('resize')); CD.cervello.stato('riposo')")
            time.sleep(2.5)
            u = cop.evaluate("document.getElementById('cervello-grande').toDataURL('image/png')")
            open(os.path.join(OUT, "cervello.png"), "wb").write(base64.b64decode(u.split(",")[1]))
            print("   cervello.png")
            cop.close()
            vai("neura", "#neura-input")
            pg.click("#neura-pulisci")
            # l'app del telefono come sul sito: solo le pagine, senza il programma (modalità telefono)
            st = subprocess.Popen([sys.executable, "-m", "http.server", str(PORTA + 3), "--bind", "127.0.0.1", "-d", os.path.join(RADICE, "src", "web")],
                                  stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            attendi("http://127.0.0.1:%d/" % (PORTA + 3))
            tb = "http://127.0.0.1:%d/" % (PORTA + 3)
            tel = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True, locale="it-IT",
                                user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1")
            tel.add_init_script("try{localStorage.setItem('cd.profilo','{\"tipo\":\"persona\",\"nome\":\"Maria\"}')}catch(e){}")
            pt = tel.new_page()
            pt.goto(tb + "?nosaluto#/")
            pt.wait_for_selector(".plancia"); time.sleep(1.4)
            salva(pt.screenshot(), "telefono", 700)
            pt.goto(tb + "?nosaluto#/telefono"); pt.wait_for_selector("#tel-dati tr"); time.sleep(0.8)
            salva(pt.screenshot(), "telefono-utility", 700)
            pt.goto(tb + "?nosaluto#/telefono/salute"); pt.wait_for_selector("#tel-controllo"); time.sleep(0.6)
            salva(pt.screenshot(), "telefono-salute", 700)
            pt.click("#menu-btn"); time.sleep(0.6)
            salva(pt.screenshot(), "telefono-menu", 700)
            pt.click("#menu-btn"); pt.evaluate("CD.telefono.banner(true)"); time.sleep(0.8)
            salva(pt.screenshot(), "telefono-banner", 700)
            pt.goto(tb + "?nosaluto#/impostazioni"); pt.wait_for_selector("#imp-telefono"); pt.locator("#imp-telefono").scroll_into_view_if_needed(); time.sleep(0.8)
            salva(pt.screenshot(), "telefono-app", 700)
            st.terminate()
            b.close()
    finally:
        srv.terminate()
        ia.terminate()
        web.terminate()
        shutil.rmtree(dati, ignore_errors=True)


if __name__ == "__main__":
    main()
