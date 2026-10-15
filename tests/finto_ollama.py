#!/usr/bin/env python3
"""Finto server Ollama per i test: /api/tags e /api/chat in streaming. Ricorda l'ultima richiesta (/ultima).
Uso: python3 tests/finto_ollama.py PORTA"""
import json
import sys
import time
from http.server import BaseHTTPRequestHandler, HTTPServer
from socketserver import ThreadingMixIn

RISPOSTA = ("Certo! Per studiare vi consiglio un **portatile leggero** con 16 GB di RAM e un SSD da 512 GB.\n"
            "- Peso sotto 1,5 kg\n- Batteria da almeno 50 Wh\n"
            "Se potete aspettare, il Black Friday è vicino.\n[[vai:acquisti/portatile]]\n[[azione:aggiornamenti_cerca]]")
ULTIMA = {}


class H(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def _json(self, o):
        b = json.dumps(o).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(b)))
        self.end_headers()
        self.wfile.write(b)

    def do_GET(self):
        if self.path == "/api/tags":
            return self._json({"models": [{"name": "qwen3.5:4b"}, {"name": "qwen3.5:0.8b"}]})
        if self.path == "/ultima":
            return self._json(ULTIMA)
        self.send_response(404)
        self.end_headers()

    def do_POST(self):
        n = int(self.headers.get("Content-Length", 0))
        req = json.loads(self.rfile.read(n))
        ULTIMA.clear()
        ULTIMA.update(req)
        self.send_response(200)
        self.send_header("Content-Type", "application/x-ndjson")
        self.end_headers()
        for i in range(0, len(RISPOSTA), 12):
            self.wfile.write((json.dumps({"message": {"content": RISPOSTA[i:i + 12]}, "done": False}) + "\n").encode())
            self.wfile.flush()
            time.sleep(0.01)
        self.wfile.write((json.dumps({"message": {"content": ""}, "done": True}) + "\n").encode())


class S(ThreadingMixIn, HTTPServer):
    daemon_threads = True


if __name__ == "__main__":
    S(("127.0.0.1", int(sys.argv[1])), H).serve_forever()
