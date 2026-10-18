#!/usr/bin/env python3
"""Prova del lettore di notizie su feed di esempio (RSS 2.0, Atom, Windows-1252, & sciolte). Danilo D'Auria - MIT"""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "src", "server"))
import cd_notizie as N

RSS = """<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/" xmlns:content="http://purl.org/rss/1.0/modules/content/"><channel><title>Prova</title>
<item><title>Nuova truffa via SMS: attenzione ai finti pacchi &amp; corrieri</title><link>https://esempio.it/a</link>
<description><![CDATA[<p>La <b>Polizia Postale</b> avverte & invita a non cliccare.</p> L'articolo Nuova truffa proviene da Esempio.]]></description>
<pubDate>Thu, 15 Oct 2026 20:10:00 +0200</pubDate><media:content url="https://esempio.it/img.jpg" type="image/jpeg"/></item>
<item><title>Raspberry Pi e sensori: progetto per la scuola</title><link>https://esempio.it/b</link><description>Elettronica facile</description><pubDate>Thu, 15 Oct 2026 10:00:00 +0000</pubDate></item>
<item><title>Senza link</title></item></channel></rss>"""
ATOM = """<?xml version="1.0" encoding="utf-8"?><feed xmlns="http://www.w3.org/2005/Atom"><title>Atom</title>
<entry><title>Windows 11: il Patch Tuesday corregge una falla zero-day</title><link rel="alternate" href="https://atom.it/x"/><updated>2026-10-15T21:03:00+02:00</updated><summary>Aggiornate il PC.</summary></entry></feed>"""
f = {"id": "prova", "nome": "Prova"}
a = N.analizza(N._decodifica(RSS.encode("utf-8")), f)
assert len(a) == 2, a
assert "&" in a[0]["titolo"] and "Polizia Postale" in a[0]["sommario"] and "proviene" not in a[0]["sommario"], a[0]
assert a[0]["immagine"] == "https://esempio.it/img.jpg"
assert a[0]["quando"] > a[1]["quando"] > 0
assert "sicurezza" in N.temi_di(a[0]) and "elettronica" in N.temi_di(a[1]), (N.temi_di(a[0]), N.temi_di(a[1]))
b = N.analizza(ATOM, f)
assert b[0]["link"] == "https://atom.it/x" and abs(b[0]["quando"] - 1792090980) < 2, b
assert set(["sicurezza", "computer"]) <= set(N.temi_di(b[0]))
c = N._decodifica("Prezzo 269€ l’offerta".encode("cp1252"))
assert "€" in c and "’" in c
print("notizie: tutto bene")
