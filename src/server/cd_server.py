#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Consulente Digitale - server locale (Windows, Linux, macOS)

Serve l'interfaccia (src/web) SOLO su 127.0.0.1 e offre le API:
  GET  /api/status                 versione, sistema, IA, voce, token di sessione
  GET  /api/sistema[?nuovo=1]      analisi completa del computer (cd_sistema)
  GET  /api/ora[?internet=1]       ora del computer e, se richiesto, ora ufficiale da Internet (NTP INRiM / pool.ntp.org)
  GET  /api/rete                   Internet funziona? (apre e chiude una connessione, nessun dato inviato)
  GET  /api/ia                     motore Ollama, modelli installati, modello consigliato per questa RAM
  POST /api/chat                   conversazione con l'IA locale (streaming NDJSON)
  POST /api/tts, /api/stt          voce del server (Piper/espeak-ng) e trascrizione locale (Vosk/whisper), se presenti
  GET  /api/azioni                 azioni automatiche disponibili su questo sistema (cd_azioni)
  POST /api/azioni/avvia           {id, parametro, token} avvia un'azione del catalogo -> {lavoro}
  GET  /api/lavori/<id>?da=N       registro in diretta del lavoro;  POST /api/lavori/<id>/ferma
  GET  /api/script?sistema=&nome=  testo di uno script del catalogo (Vedi / Stampa / Salva)
  GET  /api/programmi              catalogo dei programmi consigliati
  GET  /api/hardware/dettagli, /api/hardware/sensori   componenti in dettaglio e sensori in diretta (cd_hardware)
  GET  /api/aperture; POST /api/apri {id, token}       programmi e impostazioni che Neura apre col consenso (cd_aperture)
  GET  /api/nonni[/<id>[/file/<nome>]], /api/nonni/sito.zip; POST /api/nonni/salva|sito, /api/nonni/<id>/audio/<n>|monta|elimina  (cd_nonni)
  GET  /api/programma; POST /api/programma/controlla|scarica|installa   aggiornamenti del programma (cd_programma)
  POST /api/velocita               prova della velocita' di Internet (solo su richiesta)
  GET/POST /api/data/<chiave>      dati dell'utente (impostazioni, profilo, schede salvate, conversazione)
  POST /api/ciao, /api/spegni      presenza della finestra e spegnimento

Solo libreria standard, compatibile Python 3.7+.
Ideato e sviluppato da Danilo D'Auria - Codice MIT, contenuti CC BY-NC-SA 4.0
"""
import argparse
import json
import mimetypes
import re
import os
import secrets
import shutil
import socket
import struct
import subprocess
import sys
import tempfile
import threading
import time
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, HTTPServer
from socketserver import ThreadingMixIn

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import cd_sistema  # noqa: E402
import cd_azioni   # noqa: E402
import cd_hardware  # noqa: E402
import cd_aperture  # noqa: E402
import cd_nonni     # noqa: E402
import cd_programma  # noqa: E402

QUI = os.path.dirname(os.path.abspath(__file__))
SHARE_DIR = os.environ.get("CD_SHARE_DIR") or os.path.normpath(os.path.join(QUI, ".."))
WEB_DIR = os.path.join(SHARE_DIR, "web")
NOME_APP = "Consulente Digitale"


def _cartella_dati():
    if os.environ.get("CD_DATA_DIR"):
        return os.environ["CD_DATA_DIR"]
    portatile = os.path.join(SHARE_DIR, "..", "dati")
    if os.path.exists(os.path.join(SHARE_DIR, "..", "portatile.txt")):
        return os.path.normpath(portatile)
    if cd_sistema.WINDOWS:
        return os.path.join(os.environ.get("APPDATA") or os.path.expanduser("~"), "ConsulenteDigitale")
    if cd_sistema.MAC:
        return os.path.expanduser("~/Library/Application Support/ConsulenteDigitale")
    return os.path.join(os.environ.get("XDG_DATA_HOME") or os.path.expanduser("~/.local/share"), "consulente-digitale")


DATA_DIR = _cartella_dati()
os.environ.setdefault("CD_DATI_HW", DATA_DIR)
MODELS_DIR = os.path.join(DATA_DIR, "modelli")
RUNTIME_FILE = os.path.join(DATA_DIR, "server.json")
STT_WORKER = os.path.join(QUI, "cd_stt_worker.py")
OLLAMA_HOST = (os.environ.get("OLLAMA_HOST") or "http://127.0.0.1:11434").rstrip("/")
if not OLLAMA_HOST.startswith("http"):
    OLLAMA_HOST = "http://" + OLLAMA_HOST
CHIAVI_DATI = ("impostazioni", "profilo", "cronologia", "schede", "preferiti", "diario", "acquisti", "hardware", "interventi", "nonni", "circolare")
MAX_JSON = 2 * 1024 * 1024
MAX_WAV = 12 * 1024 * 1024
TOKEN = secrets.token_hex(16)        # cambia a ogni avvio: serve per le azioni che modificano il sistema
STATE = {"port": 0, "idle": 0, "rete": (0, None), "stt": None, "stt_t": 0}
ULTIMO = [time.time()]
LOCK = threading.Lock()


def _leggi_versione():
    for p in (os.path.join(SHARE_DIR, "VERSION"), os.path.join(SHARE_DIR, "..", "VERSION")):
        try:
            with open(p) as f:
                return f.read().strip()
        except OSError:
            pass
    return "1.0.0"


VERSIONE = _leggi_versione()


def log(*args):
    try:
        os.makedirs(DATA_DIR, exist_ok=True)
        with open(os.path.join(DATA_DIR, "server.log"), "a", encoding="utf-8") as f:
            f.write(time.strftime("%Y-%m-%d %H:%M:%S ") + " ".join(str(a) for a in args) + "\n")
    except OSError:
        pass


def scrivi_atomico(path, testo):
    d = os.path.dirname(path)
    os.makedirs(d, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=d, prefix=".tmp-")
    with os.fdopen(fd, "w", encoding="utf-8") as f:
        f.write(testo)
    os.replace(tmp, path)


def leggi_json(path, default=None):
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return default


# ------------------------------------------------------------------------------
#  Ora del computer e ora ufficiale da Internet
# ------------------------------------------------------------------------------
NTP_SERVER = ("time.inrim.it", "ntp1.inrim.it", "pool.ntp.org", "time.google.com", "time.apple.com", "time.windows.com")


def ora_ntp(host, timeout=2.5):
    """Chiede l'ora a un server NTP (protocollo semplice, porta 123 UDP). Restituisce (ora_unix, ritardo_s)."""
    pacchetto = b"\x1b" + 47 * b"\0"
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    s.settimeout(timeout)
    try:
        t0 = time.time()
        s.sendto(pacchetto, (host, 123))
        dati, _ = s.recvfrom(512)
        t1 = time.time()
    finally:
        s.close()
    if len(dati) < 48:
        raise ValueError("risposta NTP corta")
    sec, fraz = struct.unpack("!II", dati[40:48])
    if not sec:
        raise ValueError("risposta NTP vuota")
    ora = sec - 2208988800 + fraz / 2.0 ** 32
    ritardo = t1 - t0
    return ora + ritardo / 2.0, ritardo


def ora_http(url="https://www.inrim.it/", timeout=5):
    import email.utils
    t0 = time.time()
    req = urllib.request.Request(url, method="HEAD", headers={"User-Agent": NOME_APP})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        data = r.headers.get("Date")
    t1 = time.time()
    return email.utils.parsedate_to_datetime(data).timestamp() + (t1 - t0) / 2.0 + 0.5, t1 - t0


def ora_completa(internet=False):
    adesso = time.time()
    lt = time.localtime(adesso)
    r = {"locale": time.strftime("%Y-%m-%dT%H:%M:%S", lt), "unix": adesso, "fuso": time.strftime("%z", lt),
         "nome_fuso": time.tzname[lt.tm_isdst > 0] if time.daylight else time.tzname[0], "ora_legale": lt.tm_isdst > 0,
         "internet": None}
    if internet:
        for host in NTP_SERVER:
            try:
                ora, ritardo = ora_ntp(host)
                r["internet"] = {"unix": ora, "fonte": host, "metodo": "NTP", "scarto_s": round(time.time() - ora, 2),
                                 "ritardo_ms": round(ritardo * 1000)}
                break
            except (OSError, ValueError):
                continue
        if r["internet"] is None:
            try:
                ora, ritardo = ora_http()
                r["internet"] = {"unix": ora, "fonte": "www.inrim.it", "metodo": "HTTP", "scarto_s": round(time.time() - ora, 1),
                                 "ritardo_ms": round(ritardo * 1000)}
            except Exception as e:
                r["errore_internet"] = str(e)[:200]
    return r


def internet_ok():
    with LOCK:
        t, ok = STATE["rete"]
        if ok is not None and time.time() - t < 60:
            return ok
    ok = False
    for host in (("1.1.1.1", 443), ("9.9.9.9", 443), ("8.8.8.8", 53)):
        try:
            socket.create_connection(host, timeout=2).close()
            ok = True
            break
        except OSError:
            continue
    with LOCK:
        STATE["rete"] = (time.time(), ok)
    return ok


def prova_velocita():
    """Scarica ~25 MB da speed.cloudflare.com e misura; latenza con 5 connessioni TCP."""
    lat = []
    for _ in range(5):
        t0 = time.time()
        try:
            socket.create_connection(("speed.cloudflare.com", 443), timeout=3).close()
            lat.append((time.time() - t0) * 1000)
        except OSError:
            pass
    risultato = {"latenza_ms": round(sorted(lat)[len(lat) // 2]) if lat else None, "download_mbps": None, "upload_mbps": None}
    try:
        n = 25 * 1000 * 1000
        t0 = time.time()
        req = urllib.request.Request("https://speed.cloudflare.com/__down?bytes=%d" % n, headers={"User-Agent": NOME_APP})
        letti = 0
        with urllib.request.urlopen(req, timeout=40) as r:
            while True:
                b = r.read(256 * 1024)
                if not b:
                    break
                letti += len(b)
                if time.time() - t0 > 20:
                    break
        risultato["download_mbps"] = round(letti * 8 / 1e6 / max(0.01, time.time() - t0), 1)
        dati = b"0" * (5 * 1000 * 1000)
        t0 = time.time()
        req = urllib.request.Request("https://speed.cloudflare.com/__up", data=dati, headers={"User-Agent": NOME_APP,
                                     "Content-Type": "application/octet-stream"})
        with urllib.request.urlopen(req, timeout=40) as r:
            r.read()
        risultato["upload_mbps"] = round(len(dati) * 8 / 1e6 / max(0.01, time.time() - t0), 1)
    except Exception as e:
        risultato["errore"] = str(e)[:200]
    return risultato


# ------------------------------------------------------------------------------
#  Intelligenza artificiale locale (Ollama)
# ------------------------------------------------------------------------------
def modello_consigliato(ram_mb):
    """Stesse fasce del Professore Digitale."""
    if ram_mb and ram_mb < 6000:
        return "qwen3.5:0.8b"
    if ram_mb and ram_mb < 8000:
        return "qwen3.5:2b"
    if ram_mb and ram_mb < 16000:
        return "qwen3.5:4b"
    if ram_mb and ram_mb < 24000:
        return "qwen3.5:9b"
    return "gemma4:12b"


def ollama_modelli(timeout=1.5):
    try:
        with urllib.request.urlopen(OLLAMA_HOST + "/api/tags", timeout=timeout) as r:
            dati = json.loads(r.read().decode("utf-8"))
        return True, [m.get("name") for m in dati.get("models", []) if m.get("name")]
    except Exception:
        return False, []


def ollama_installato():
    if shutil.which("ollama"):
        return True
    candidati = []
    if cd_sistema.WINDOWS:
        candidati.append(os.path.join(os.environ.get("LOCALAPPDATA", ""), "Programs", "Ollama", "ollama.exe"))
    if cd_sistema.MAC:
        candidati += ["/Applications/Ollama.app", "/usr/local/bin/ollama", "/opt/homebrew/bin/ollama"]
    return any(os.path.exists(c) for c in candidati)


def stato_ia():
    ok, modelli = ollama_modelli()
    ram = 0
    try:
        ram = cd_sistema.analizza().get("memoria", {}).get("totale_mb", 0)
    except Exception:
        pass
    return {"motore": "ollama", "attivo": ok, "installato": ok or ollama_installato(), "modelli": modelli,
            "consigliato": modello_consigliato(ram), "ram_mb": ram}


# ------------------------------------------------------------------------------
#  Voce del server (facoltativa): Piper (anche quello del Professore Digitale) o espeak-ng
# ------------------------------------------------------------------------------
def piper_e_voce():
    bins = [shutil.which("piper")]
    voci = [os.path.join(MODELS_DIR, "piper")]
    if cd_sistema.LINUX:
        import platform
        arch = {"x86_64": "x86_64", "amd64": "x86_64", "aarch64": "aarch64", "arm64": "aarch64"}.get(platform.machine().lower(), "")
        bins.append("/usr/lib/professore-digitale/piper/%s/piper" % arch)
        voci.append("/usr/share/professore-digitale/voci")
    exe = next((b for b in bins if b and os.path.isfile(b) and os.access(b, os.X_OK)), None)
    if not exe:
        return None, None
    for d in voci:
        if os.path.isdir(d):
            for nome in sorted(os.listdir(d)):
                if nome.endswith(".onnx") and ("giorgio" in nome or "serena" in nome or "paola" in nome or "it_IT" in nome):
                    return exe, os.path.join(d, nome)
    return None, None


def voci_server():
    exe, voce = piper_e_voce()
    out = []
    if exe:
        out.append({"id": "piper", "nome": "Voce naturale (Piper)", "motore": "piper"})
    if shutil.which("espeak-ng") or shutil.which("espeak"):
        out.append({"id": "espeak", "nome": "Voce leggera (espeak-ng)", "motore": "espeak"})
    return out


def sintetizza(testo, voce="piper", velocita=1.0):
    testo = " ".join(str(testo).split())[:1500]
    with tempfile.NamedTemporaryFile(prefix="cd-tts-", suffix=".wav", delete=False) as f:
        out = f.name
    try:
        exe, modello = piper_e_voce()
        if voce == "piper" and exe:
            subprocess.run([exe, "--model", modello, "--output_file", out, "--length_scale", str(round(1.0 / max(0.5, velocita), 2)),
                            "--sentence_silence", "0.25"], input=testo.encode("utf-8"), stdout=subprocess.DEVNULL,
                           stderr=subprocess.DEVNULL, timeout=120, check=True)
        else:
            es = shutil.which("espeak-ng") or shutil.which("espeak")
            if not es:
                raise RuntimeError("nessuna voce del server")
            subprocess.run([es, "-v", "it+m3", "-s", str(int(150 * velocita)), "-w", out, testo], stdout=subprocess.DEVNULL,
                           stderr=subprocess.DEVNULL, timeout=120, check=True)
        with open(out, "rb") as f:
            return f.read()
    finally:
        try:
            os.unlink(out)
        except OSError:
            pass


def stt_prova(forza=False):
    with LOCK:
        if not forza and STATE["stt"] is not None and time.time() - STATE["stt_t"] < 120:
            return STATE["stt"]
    r = {"engine": None}
    try:
        p = subprocess.run([sys.executable or "python3", "-B", STT_WORKER, "--probe", "--models", MODELS_DIR],
                           stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, timeout=30, creationflags=cd_sistema.NO_WINDOW)
        r = json.loads(p.stdout.decode("utf-8") or "{}") or {"engine": None}
    except Exception as e:
        log("prova STT", e)
    with LOCK:
        STATE["stt"], STATE["stt_t"] = r, time.time()
    return r


def trascrivi(wav):
    if not stt_prova().get("engine"):
        raise RuntimeError("trascrizione locale non installata")
    with tempfile.NamedTemporaryFile(prefix="cd-stt-", suffix=".wav", delete=False) as f:
        f.write(wav)
        path = f.name
    try:
        p = subprocess.run([sys.executable or "python3", "-B", STT_WORKER, "--models", MODELS_DIR, path], stdout=subprocess.PIPE,
                           stderr=subprocess.DEVNULL, timeout=300, creationflags=cd_sistema.NO_WINDOW)
        out = json.loads(p.stdout.decode("utf-8") or "{}")
        if "error" in out:
            raise RuntimeError(out["error"])
        return out.get("text", "").strip()
    finally:
        try:
            os.unlink(path)
        except OSError:
            pass


# ------------------------------------------------------------------------------
#  HTTP
# ------------------------------------------------------------------------------
class Server(ThreadingMixIn, HTTPServer):
    daemon_threads = True
    allow_reuse_address = False

    def handle_error(self, request, client_address):
        log("errore nella richiesta", sys.exc_info()[1])


class Handler(BaseHTTPRequestHandler):
    server_version = "ConsulenteDigitale"
    protocol_version = "HTTP/1.1"

    def log_message(self, fmt, *args):
        pass

    # --- sicurezza: solo questo computer, solo le nostre pagine ---
    def _host_ok(self):
        host = (self.headers.get("Host") or "").lower()
        return host in ("127.0.0.1:%s" % STATE["port"], "localhost:%s" % STATE["port"])

    def _origin_ok(self):
        o = self.headers.get("Origin")
        return o is None or o in ("http://127.0.0.1:%s" % STATE["port"], "http://localhost:%s" % STATE["port"])

    def _intestazioni(self):
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("Cache-Control", "no-store")

    def _send_file(self, dati, ctype, nome_scarica=None):
        """Invia un file con il supporto dei «Range» (serve al lettore audio per andare avanti e indietro)."""
        tot, ini, fin = len(dati), 0, len(dati) - 1
        rng = self.headers.get("Range") or ""
        m = re.match(r"bytes=(\d*)-(\d*)$", rng.strip())
        if m and tot:
            if m.group(1):
                ini = int(m.group(1)); fin = min(int(m.group(2)) if m.group(2) else tot - 1, tot - 1)
            else:
                ini = max(0, tot - int(m.group(2) or 0))
            if ini > fin:
                self.send_response(416); self.send_header("Content-Range", "bytes */%d" % tot); self.end_headers(); return None
        parte = dati[ini:fin + 1]
        self.send_response(206 if m and tot else 200)
        self.send_header("Content-Type", ctype)
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Content-Length", str(len(parte)))
        if m and tot:
            self.send_header("Content-Range", "bytes %d-%d/%d" % (ini, fin, tot))
        if nome_scarica:
            self.send_header("Content-Disposition", 'attachment; filename="%s"' % nome_scarica)
        self._intestazioni()
        self.end_headers()
        self.wfile.write(parte)
        return None

    def _send(self, code, corpo, ctype="application/json; charset=utf-8"):
        if isinstance(corpo, (dict, list)):
            corpo = json.dumps(corpo, ensure_ascii=False).encode("utf-8")
        elif isinstance(corpo, str):
            corpo = corpo.encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(corpo)))
        self._intestazioni()
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(corpo)

    def _errore(self, code, msg):
        self._send(code, {"ok": False, "errore": msg})

    def _corpo(self, limite):
        try:
            n = int(self.headers.get("Content-Length") or 0)
        except ValueError:
            n = 0
        if n < 0 or n > limite:
            raise ValueError("richiesta troppo grande")
        return self.rfile.read(n) if n else b""

    def _json(self):
        if (self.headers.get("Content-Type") or "").split(";")[0].strip() != "application/json":
            raise ValueError("serve application/json")
        return json.loads(self._corpo(MAX_JSON).decode("utf-8") or "{}")

    def _query(self):
        from urllib.parse import parse_qs, urlsplit
        return dict((k, v[0]) for k, v in parse_qs(urlsplit(self.path).query).items())

    def do_HEAD(self):
        self.do_GET()

    def do_GET(self):
        if not self._host_ok():
            return self._errore(403, "host non consentito")
        ULTIMO[0] = time.time()
        path = self.path.split("?", 1)[0]
        try:
            if path.startswith("/api/"):
                return self._api_get(path)
            return self._statico(path)
        except (BrokenPipeError, ConnectionResetError):
            return None

    def do_POST(self):
        if not self._host_ok() or not self._origin_ok():
            return self._errore(403, "origine non consentita")
        ULTIMO[0] = time.time()
        path = self.path.split("?", 1)[0]
        try:
            return self._api_post(path)
        except ValueError as e:
            return self._errore(400, str(e))
        except (BrokenPipeError, ConnectionResetError):
            return None
        except Exception as e:
            log("POST", path, repr(e))
            return self._errore(500, str(e)[:300])

    def _statico(self, path):
        if path == "/":
            path = "/index.html"
        reale = os.path.normpath(os.path.join(WEB_DIR, path.lstrip("/")))
        if not reale.startswith(os.path.normpath(WEB_DIR) + os.sep) or not os.path.isfile(reale):
            return self._errore(404, "non trovato")
        ctype = mimetypes.guess_type(reale)[0] or "application/octet-stream"
        if ctype.startswith("text/") or ctype in ("application/javascript", "application/json", "image/svg+xml"):
            ctype += "; charset=utf-8"
        with open(reale, "rb") as f:
            self._send(200, f.read(), ctype)

    # --- GET ---
    def _api_get(self, path):
        q = self._query()
        if path == "/api/status":
            imp = leggi_json(os.path.join(DATA_DIR, "impostazioni.json"), {}) or {}
            return self._send(200, {
                "ok": True, "app": NOME_APP, "versione": VERSIONE, "sistema": cd_sistema.famiglia(),
                "nome_sistema": (cd_sistema.analizza().get("sistema") or {}).get("nome", ""), "token": TOKEN,
                "dati": DATA_DIR, "voci_server": voci_server(), "stt": bool(stt_prova().get("engine")),
                "online_permesso": imp.get("online", True) is not False, "python": sys.version.split()[0],
                "amministratore": _sono_amministratore()})
        if path == "/api/sistema":
            return self._send(200, cd_sistema.analizza(q.get("nuovo") == "1"))
        if path == "/api/ora":
            return self._send(200, ora_completa(q.get("internet") == "1"))
        if path == "/api/hardware/dettagli":
            return self._send(200, cd_hardware.dettagli(q.get("nuovo") == "1"))
        if path == "/api/hardware/sensori":
            return self._send(200, cd_hardware.sensori())
        if path == "/api/rete":
            return self._send(200, {"online": internet_ok()})
        if path == "/api/nonni":
            return self._send(200, {"episodi": cd_nonni.elenco(DATA_DIR), "ffmpeg": bool(cd_nonni.ffmpeg()), "voce_server": bool(voci_server()),
                                    "sito": os.path.join(DATA_DIR, "nonni-teach-sito"), "url_predefinito": cd_nonni.SITO_PREDEFINITO})
        if path == "/api/nonni/sito.zip":
            zp = os.path.join(DATA_DIR, "nonni-teach-sito.zip")
            if not os.path.isfile(zp):
                return self._errore(404, "sito non ancora creato")
            with open(zp, "rb") as f:
                return self._send_file(f.read(), "application/zip", "nonni-teach-sito.zip")
        if path.startswith("/api/nonni/"):
            parti = path.split("/")
            try:
                if len(parti) == 4:
                    return self._send(200, cd_nonni.leggi(DATA_DIR, parti[3]))
                if len(parti) == 6 and parti[4] == "file":
                    dati, ctype = cd_nonni.file_audio(DATA_DIR, parti[3], parti[5])
                    return self._send_file(dati, ctype)
            except ValueError as e:
                return self._errore(404, str(e))
        if path == "/api/programma":
            return self._send(200, {"versione": VERSIONE, "tipo": cd_programma.tipo_installazione(SHARE_DIR), "manifesto": cd_programma.MANIFESTO,
                                    "stato": cd_programma.stato()})
        if path == "/api/aperture":
            return self._send(200, {"aperture": cd_aperture.elenco()})
        if path == "/api/ia":
            return self._send(200, stato_ia())
        if path == "/api/azioni":
            return self._send(200, {"sistema": cd_azioni.FAM, "azioni": cd_azioni.elenco(q.get("sistema")),
                                    "lavori": cd_azioni.lavori_recenti()})
        if path.startswith("/api/lavori/"):
            lav = cd_azioni.lavoro(path.rsplit("/", 1)[1])
            if not lav:
                return self._errore(404, "lavoro non trovato")
            try:
                da = max(0, int(q.get("da", "0")))
            except ValueError:
                da = 0
            return self._send(200, lav.json(da))
        if path == "/api/script":
            sistema = q.get("sistema") or cd_azioni.FAM
            if sistema not in ("windows", "linux", "mac"):
                return self._errore(400, "sistema non valido")
            testo = cd_azioni.testo_script(sistema, q.get("nome", ""))
            if testo is None:
                return self._errore(404, "script non trovato")
            return self._send(200, {"sistema": sistema, "nome": q.get("nome"), "testo": testo})
        if path == "/api/programmi":
            return self._send(200, cd_azioni.programmi())
        if path.startswith("/api/data/"):
            chiave = path.rsplit("/", 1)[1]
            if chiave not in CHIAVI_DATI:
                return self._errore(404, "chiave sconosciuta")
            return self._send(200, {"valore": leggi_json(os.path.join(DATA_DIR, chiave + ".json"))})
        return self._errore(404, "API sconosciuta")

    # --- POST ---
    def _api_post(self, path):
        if path == "/api/ciao":
            self._corpo(4096)
            return self._send(200, {"ok": True})
        if path == "/api/chat":
            return self._chat(self._json())
        if path == "/api/tts":
            req = self._json()
            try:
                wav = sintetizza(req.get("testo", ""), req.get("voce", "piper"), float(req.get("velocita", 1.0)))
            except Exception as e:
                return self._errore(503, "voce del server non disponibile: %s" % e)
            return self._send(200, wav, "audio/wav")
        if path == "/api/stt":
            try:
                return self._send(200, {"testo": trascrivi(self._corpo(MAX_WAV))})
            except RuntimeError as e:
                return self._errore(503, str(e))
        if path.startswith("/api/data/"):
            chiave = path.rsplit("/", 1)[1]
            if chiave not in CHIAVI_DATI:
                return self._errore(404, "chiave sconosciuta")
            req = self._json()
            scrivi_atomico(os.path.join(DATA_DIR, chiave + ".json"), json.dumps(req.get("valore"), ensure_ascii=False, indent=1))
            return self._send(200, {"ok": True})
        if path == "/api/rete/velocita":
            self._corpo(4096)
            return self._send(200, prova_velocita())
        # registrazione di una risposta di Nonni Teach (corpo audio grezzo, token nell'intestazione)
        m = re.match(r"^/api/nonni/([a-z0-9-]+)/audio/(\d{1,2})$", path)
        if m:
            if self.headers.get("X-CD-Token") != TOKEN:
                return self._errore(403, "sessione scaduta: ricarica la pagina")
            corpo = self._corpo(cd_nonni.MAX_AUDIO)
            return self._send(200, cd_nonni.salva_audio(DATA_DIR, m.group(1), m.group(2), corpo, self.headers.get("Content-Type")))
        # da qui in poi: azioni che cambiano il sistema -> serve il token della sessione
        req = self._json()
        if req.get("token") != TOKEN:
            return self._errore(403, "sessione scaduta: ricarica la pagina")
        if path == "/api/azioni/avvia":
            try:
                lav = cd_azioni.avvia(str(req.get("id", "")), req.get("parametro", ""), DATA_DIR)
            except ValueError as e:
                return self._errore(400, str(e))
            log("azione", lav.azione, "lavoro", lav.id)
            return self._send(200, {"ok": True, "lavoro": lav.id})
        if path == "/api/programma/controlla":
            try:
                return self._send(200, cd_programma.controlla(VERSIONE, SHARE_DIR))
            except (OSError, ValueError) as e:
                return self._errore(502, "non riesco a leggere il sito degli aggiornamenti: %s" % e)
        if path == "/api/programma/scarica":
            return self._send(200, cd_programma.scarica(VERSIONE, SHARE_DIR, DATA_DIR))
        if path == "/api/programma/installa":
            srv = self.server
            return self._send(200, cd_programma.installa(SHARE_DIR, lambda: threading.Thread(target=srv.shutdown, daemon=True).start()))
        if path == "/api/nonni/salva":
            return self._send(200, cd_nonni.salva(DATA_DIR, req.get("episodio")))
        if path == "/api/nonni/sito":
            return self._send(200, cd_nonni.crea_sito(DATA_DIR, req.get("url"), req.get("titolo"), req.get("autore")))
        m = re.match(r"^/api/nonni/([a-z0-9-]+)/(monta|elimina)$", path)
        if m and m.group(2) == "elimina":
            return self._send(200, cd_nonni.elimina(DATA_DIR, m.group(1)))
        if m:
            try:
                return self._send(200, cd_nonni.monta(DATA_DIR, m.group(1), lambda t: sintetizza(t, "piper", 0.95)))
            except RuntimeError as e:
                return self._errore(500, str(e))
        if path == "/api/apri":
            try:
                esito = cd_aperture.apri(req.get("id"))
            except ValueError as e:
                return self._errore(400, str(e))
            except OSError as e:
                return self._errore(500, "non sono riuscita ad aprirlo: %s" % e)
            log("apertura", req.get("id"))
            return self._send(200, esito)
        if path.startswith("/api/lavori/") and path.endswith("/ferma"):
            return self._send(200, {"ok": cd_azioni.ferma(path.split("/")[3])})
        if path == "/api/spegni":
            self._send(200, {"ok": True})
            threading.Thread(target=self.server.shutdown, daemon=True).start()
            return None
        return self._errore(404, "API sconosciuta")

    def _chat(self, req):
        modello = str(req.get("modello") or "").strip()
        messaggi = req.get("messaggi") or []
        if not isinstance(messaggi, list) or not messaggi:
            raise ValueError("nessun messaggio")
        puliti = []
        for m in messaggi[-30:]:
            if isinstance(m, dict) and m.get("role") in ("system", "user", "assistant"):
                puliti.append({"role": m["role"], "content": str(m.get("content", ""))[:16000]})
        if not modello:
            ok, modelli = ollama_modelli()
            if not ok or not modelli:
                return self._errore(503, "IA locale non disponibile")
            modello = modelli[0]
        risposta = None
        for pensa in (False, None):
            corpo = {"model": modello, "messages": puliti, "stream": True, "keep_alive": "20m",
                     "options": {"temperature": float(req.get("temperatura", 0.5)), "num_ctx": int(req.get("contesto", 4096))}}
            if pensa is not None:
                corpo["think"] = pensa
            r = urllib.request.Request(OLLAMA_HOST + "/api/chat", data=json.dumps(corpo).encode("utf-8"),
                                       headers={"Content-Type": "application/json"})
            try:
                risposta = urllib.request.urlopen(r, timeout=600)
                break
            except urllib.error.HTTPError as e:
                dettaglio = e.read().decode("utf-8", "replace")[:300]
                if pensa is not None and "think" in dettaglio:
                    continue
                return self._errore(502, "Ollama ha risposto %s: %s" % (e.code, dettaglio))
            except Exception as e:
                return self._errore(503, "IA locale non raggiungibile: %s" % e)
        self.send_response(200)
        self.send_header("Content-Type", "application/x-ndjson; charset=utf-8")
        self.send_header("Connection", "close")
        self._intestazioni()
        self.end_headers()
        self.close_connection = True
        try:
            with risposta:
                for riga in risposta:
                    riga = riga.strip()
                    if not riga:
                        continue
                    try:
                        obj = json.loads(riga.decode("utf-8"))
                    except ValueError:
                        continue
                    out = {"t": (obj.get("message") or {}).get("content", "")}
                    if obj.get("done"):
                        out["fine"] = True
                    if obj.get("error"):
                        out["errore"] = obj["error"]
                    self.wfile.write((json.dumps(out, ensure_ascii=False) + "\n").encode("utf-8"))
                    self.wfile.flush()
                    ULTIMO[0] = time.time()
        except (BrokenPipeError, ConnectionResetError):
            pass
        return None


def _sono_amministratore():
    try:
        if cd_sistema.WINDOWS:
            import ctypes
            return bool(ctypes.windll.shell32.IsUserAnAdmin())
        return os.geteuid() == 0
    except Exception:
        return False


# ------------------------------------------------------------------------------
#  Finestra del programma: browser in modalita' «app» (Edge, Chrome, Chromium, Brave), altrimenti il browser predefinito
# ------------------------------------------------------------------------------
def trova_browser_app():
    cand = []
    if cd_sistema.WINDOWS:
        for base in (os.environ.get("ProgramFiles(x86)"), os.environ.get("ProgramFiles"), os.environ.get("LOCALAPPDATA")):
            if base:
                cand += [os.path.join(base, "Microsoft", "Edge", "Application", "msedge.exe"),
                         os.path.join(base, "Google", "Chrome", "Application", "chrome.exe"),
                         os.path.join(base, "BraveSoftware", "Brave-Browser", "Application", "brave.exe")]
    elif cd_sistema.MAC:
        cand += ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
                 "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
                 "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
                 "/Applications/Chromium.app/Contents/MacOS/Chromium"]
    else:
        cand += [shutil.which(n) for n in ("chromium", "chromium-browser", "google-chrome", "google-chrome-stable",
                                            "microsoft-edge", "brave-browser", "vivaldi")]
    return next((c for c in cand if c and os.path.isfile(c)), None)


def apri_finestra(url):
    exe = trova_browser_app()
    if exe:
        profilo = os.path.join(DATA_DIR, "finestra")
        try:
            subprocess.Popen([exe, "--app=" + url, "--user-data-dir=" + profilo, "--window-size=1366,880", "--no-first-run",
                              "--no-default-browser-check", "--autoplay-policy=no-user-gesture-required"],
                             stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, stdin=subprocess.DEVNULL,
                             creationflags=cd_sistema.NO_WINDOW)
            return True
        except OSError as e:
            log("finestra app non avviata", e)
    import webbrowser
    return webbrowser.open(url)


def guardiano(server):
    """Si spegne da solo dopo un periodo senza finestra aperta (mai durante un lavoro in corso)."""
    while True:
        time.sleep(15)
        attivi = any(l["stato"] == "in_corso" for l in cd_azioni.lavori_recenti())
        if STATE["idle"] > 0 and not attivi and time.time() - ULTIMO[0] > STATE["idle"]:
            log("inattivo: spegnimento")
            server.shutdown()
            return


def gia_attivo():
    info = leggi_json(RUNTIME_FILE, {}) or {}
    porta = info.get("port")
    if not porta:
        return None
    try:
        with urllib.request.urlopen("http://127.0.0.1:%d/api/status" % porta, timeout=1.5) as r:
            if json.loads(r.read().decode("utf-8")).get("app") == NOME_APP:
                return porta
    except Exception:
        return None
    return None


def main(argv=None):
    ap = argparse.ArgumentParser(description="Server locale del " + NOME_APP)
    ap.add_argument("--port", type=int, default=int(os.environ.get("CD_PORT", "8810")))
    ap.add_argument("--apri", action="store_true", help="apre la finestra del programma")
    ap.add_argument("--inattivo", type=int, default=900, help="secondi senza finestra prima di spegnersi (0 = mai)")
    ap.add_argument("--versione", action="store_true")
    a = ap.parse_args(argv)
    if a.versione:
        print(NOME_APP, VERSIONE)
        return 0
    os.makedirs(DATA_DIR, exist_ok=True)
    os.makedirs(MODELS_DIR, exist_ok=True)
    if a.apri:
        porta = gia_attivo()
        if porta:
            apri_finestra("http://127.0.0.1:%d/" % porta)
            return 0
    mimetypes.add_type("application/javascript", ".js")
    mimetypes.add_type("image/svg+xml", ".svg")
    mimetypes.add_type("text/css", ".css")
    server = None
    for porta in range(a.port, a.port + 40):
        try:
            server = Server(("127.0.0.1", porta), Handler)
            break
        except OSError:
            continue
    if not server:
        sys.stderr.write("Nessuna porta libera.\n")
        return 2
    STATE["port"] = server.server_address[1]
    STATE["idle"] = a.inattivo
    scrivi_atomico(RUNTIME_FILE, json.dumps({"port": STATE["port"], "pid": os.getpid(), "versione": VERSIONE}))
    threading.Thread(target=guardiano, args=(server,), daemon=True).start()
    threading.Thread(target=cd_sistema.analizza, daemon=True).start()   # analisi pronta quando si apre la pagina
    url = "http://127.0.0.1:%d/" % STATE["port"]
    print("%s %s in ascolto su %s" % (NOME_APP, VERSIONE, url), flush=True)
    log("avvio", VERSIONE, url)
    if a.apri:
        threading.Timer(0.4, apri_finestra, args=(url,)).start()
    try:
        server.serve_forever(poll_interval=0.5)
    except KeyboardInterrupt:
        pass
    finally:
        try:
            if (leggi_json(RUNTIME_FILE, {}) or {}).get("pid") == os.getpid():
                os.unlink(RUNTIME_FILE)
        except OSError:
            pass
        server.server_close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
