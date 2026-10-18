#!/usr/bin/env python3
"""Prova di backup .cdbackup, reset e importazione (anche zip malevolo). Danilo D'Auria - MIT"""
import io, json, os, sys, tempfile, zipfile
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "src", "server"))
import cd_backup as B
d = tempfile.mkdtemp(); K = ("impostazioni", "profilo", "cronologia", "interventi", "notizie")
json.dump({"tipo": "persona", "nome": "Danilo"}, open(d + "/profilo.json", "w")); json.dump({"tema": "notte", "nomeUtente": "Dani"}, open(d + "/impostazioni.json", "w"))
json.dump([{"chi": "utente", "testo": "a"}, {"chi": "neura", "testo": "b"}, {"chi": "utente", "testo": "c"}, {"chi": "neura", "testo": "d"}], open(d + "/cronologia.json", "w"))
ep = d + "/nonni-teach/20261016-1000-nonno-pippo"; os.makedirs(ep); open(ep + "/r01.webm", "wb").write(b"x" * 100); json.dump({"id": "x"}, open(ep + "/episodio.json", "w"))
z, nome = B.crea(d, K, "1.2.0", True)
assert nome.endswith(".cdbackup") and "LICENZA.txt" in zipfile.ZipFile(io.BytesIO(z)).namelist()
B.reset(d, ["ultimo"], K, "1.2.0"); assert len(json.load(open(d + "/cronologia.json"))) == 2
B.reset(d, ["nomi"], K, "1.2.0"); assert json.load(open(d + "/profilo.json"))["nome"] == "" and json.load(open(d + "/impostazioni.json"))["nomeUtente"] == ""
B.reset(d, ["tutto"], K, "1.2.0", True); assert sorted(os.listdir(d)) == ["backup-automatici"]
r = B.importa(d, z, K, "1.2.0", "sostituisci"); assert r["file"] == 2 and json.load(open(d + "/profilo.json"))["nome"] == "Danilo"
r = B.importa(d, json.dumps({"formato": "cdbackup", "dati": {"profilo": {"tipo": "scuola"}, "estranea": 1}}).encode(), K, "1.2.0", "unisci")
assert r["chiavi"] == ["profilo"] and json.load(open(d + "/profilo.json")) == {"tipo": "scuola", "nome": "Danilo"}
buf = io.BytesIO(); zz = zipfile.ZipFile(buf, "w"); zz.writestr(B.NOME_JSON, json.dumps({"formato": "cdbackup", "dati": {}}))
zz.writestr("nonni-teach/../../evil/r01.webm", "x"); zz.writestr("../evil.json", "x"); zz.close()
assert B.importa(d, buf.getvalue(), K, "1.2.0")["file"] == 0 and not os.path.exists(os.path.dirname(d) + "/evil.json")
for cattivo in (b"", b"ciao", b"PK\x03\x04rotto"):
    try:
        B.importa(d, cattivo, K, "1.2.0"); raise SystemExit("accettato un file non valido")
    except ValueError:
        pass
print("backup: tutto bene")
