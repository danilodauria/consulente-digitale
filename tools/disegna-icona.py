#!/usr/bin/env python3
"""Disegna l'icona del Consulente Digitale: «Neura», un cervello di neuroni di luce dentro una sfera, con l'anello
dell'orbita e la scintilla d'oro della fenice al centro (l'intelligenza che rinasce).
Genera src/web/img/logo.svg (dettagliata) e src/web/img/logo-piccolo.svg (per 16-48 px).
Uso: python3 tools/disegna-icona.py
Grafica © 2026 Danilo D'Auria - CC BY-NC-SA 4.0 · codice MIT"""
import math
import os
import random

RADICE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMG = os.path.join(RADICE, "src", "web", "img")
META = ('<metadata><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:cc="http://creativecommons.org/ns#" '
        'xmlns:dc="http://purl.org/dc/elements/1.1/"><cc:Work rdf:about=""><dc:title>Neura – Consulente Digitale</dc:title>'
        '<dc:creator>Danilo D\'Auria</dc:creator><cc:license rdf:resource="https://creativecommons.org/licenses/by-nc-sa/4.0/"/>'
        '</cc:Work></rdf:RDF></metadata>')


def cervello(n=170, seme=7):
    """Punti di un cervello visto di tre quarti (stessa idea del cervello animato), proiettati in 2D."""
    rnd = random.Random(seme)
    oro = math.pi * (3 - math.sqrt(5))
    pts = []
    for i in range(n):
        y = 1 - (i / (n - 1)) * 2
        r = math.sqrt(1 - y * y)
        th = oro * i
        sx, sy, sz = math.cos(th) * r, y, math.sin(th) * r
        if abs(sx) < 0.07:
            continue
        p = 1 + 0.06 * math.sin(11 * sy + 7 * sz) + 0.04 * math.sin(13 * sz - 5 * sx)
        X = (sx + (0.1 if sx > 0 else -0.1)) * 0.98 * p
        Y = sy * 0.78 * p
        Z = sz * 1.15 * p
        if Y < -0.34:
            Y = -0.34 + (Y + 0.34) * 0.3
        a = -0.55
        x1 = X * math.cos(a) - Z * math.sin(a)
        z1 = X * math.sin(a) + Z * math.cos(a)
        y2 = Y * math.cos(0.32) - z1 * math.sin(0.32)
        z2 = Y * math.sin(0.32) + z1 * math.cos(0.32)
        pts.append((x1, -y2 + 0.06, z2, 1 if sx > 0 else -1))
    rnd.shuffle(pts)
    return pts


def archi(pts):
    out, visti = [], set()
    for i, p in enumerate(pts):
        d = sorted(((p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2, j) for j, q in enumerate(pts) if j != i and (q[3] == p[3]))
        for dist, j in d[:3]:
            k = (min(i, j), max(i, j))
            if dist < 0.13 and k not in visti:
                visti.add(k)
                out.append(k)
    return out


def logo(dettagliato=True):
    S = 512
    cx, cy, R = 256, 262, 168
    p = []
    p.append('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="Neura, Consulente Digitale">')
    p.append("<title>Neura – Consulente Digitale · © 2026 Danilo D'Auria · CC BY-NC-SA 4.0</title>" + META)
    p.append("""<defs>
<radialGradient id="fondo" cx="50%" cy="38%" r="75%"><stop offset="0" stop-color="#14254f"/><stop offset=".55" stop-color="#0a1230"/><stop offset="1" stop-color="#040714"/></radialGradient>
<radialGradient id="sfera" cx="38%" cy="32%" r="78%"><stop offset="0" stop-color="#1e5aa8" stop-opacity=".95"/><stop offset=".45" stop-color="#0f2b66" stop-opacity=".9"/><stop offset="1" stop-color="#070d26" stop-opacity=".95"/></radialGradient>
<radialGradient id="alone" cx="50%" cy="50%" r="50%"><stop offset=".55" stop-color="#38bdf8" stop-opacity=".0"/><stop offset=".78" stop-color="#38bdf8" stop-opacity=".35"/><stop offset="1" stop-color="#38bdf8" stop-opacity="0"/></radialGradient>
<linearGradient id="anello" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#5eead4"/><stop offset=".45" stop-color="#38bdf8"/><stop offset=".8" stop-color="#a78bfa"/><stop offset="1" stop-color="#f472b6"/></linearGradient>
<linearGradient id="bordo" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7dd3fc"/><stop offset=".5" stop-color="#6366f1" stop-opacity=".6"/><stop offset="1" stop-color="#a78bfa"/></linearGradient>
<radialGradient id="scintilla" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fffbeb"/><stop offset=".25" stop-color="#fde047"/><stop offset=".6" stop-color="#f59e0b" stop-opacity=".55"/><stop offset="1" stop-color="#f97316" stop-opacity="0"/></radialGradient>
<radialGradient id="riflesso" cx="35%" cy="22%" r="40%"><stop offset="0" stop-color="#ffffff" stop-opacity=".35"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient>
<filter id="luce" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="3.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<filter id="luceforte" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="9"/></filter>
<clipPath id="dentro"><circle cx="CX" cy="CY" r="RR"/></clipPath>
</defs>""".replace("CX", str(cx)).replace("CY", str(cy)).replace("RR", str(R - 4)))
    p.append('<clipPath id="tessera"><rect width="512" height="512" rx="116"/></clipPath>')
    p.append('<rect width="512" height="512" rx="116" fill="url(#fondo)"/>')
    # griglia prospettica in basso (fantascienza)
    g = ['<g opacity=".28" stroke="#38bdf8" stroke-width="1.2" fill="none" clip-path="url(#tessera)">'] if dettagliato else ["<g>"]
    for i in (range(-6, 7) if dettagliato else []):
        g.append('<line x1="%d" y1="512" x2="%d" y2="392"/>' % (256 + i * 95, 256 + i * 32))
    for k, y in enumerate((400, 418, 442, 474, 512) if dettagliato else ()):
        g.append('<line x1="0" y1="%d" x2="512" y2="%d" opacity="%.2f"/>' % (y, y, 0.4 + k * 0.15))
    g.append("</g>")
    p.append("".join(g))
    # alone e sfera
    p.append('<circle cx="%d" cy="%d" r="%d" fill="url(#alone)"/>' % (cx, cy, R + 34))
    p.append('<circle cx="%d" cy="%d" r="%d" fill="url(#sfera)" stroke="url(#bordo)" stroke-width="5"/>' % (cx, cy, R))
    # anello dell'orbita: parte dietro
    rx, ry, rot = 232, 62, -16
    p.append('<g transform="rotate(%d %d %d)"><path d="M%d %d A%d %d 0 0 1 %d %d" fill="none" stroke="url(#anello)" stroke-width="7" opacity=".45"/></g>' % (
        rot, cx, cy, cx - rx, cy, rx, ry, cx + rx, cy))
    # cervello di neuroni
    pts = cervello(190 if dettagliato else 34)
    sc = R * (0.76 if dettagliato else 0.7)
    P = [(cx + x * sc, cy + y * sc, z) for x, y, z, _ in pts]
    q = ['<g clip-path="url(#dentro)">']
    for i, j in archi(pts):
        a, b = P[i], P[j]
        prof = (2.2 - (a[2] + b[2]) / 2) / 3.2
        q.append('<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="#7dd3fc" stroke-opacity="%.2f" stroke-width="%.1f"/>' % (
            a[0], a[1], b[0], b[1], max(0.18, min(0.85, prof)), 1.6 if dettagliato else 7))
    q.append('</g><g filter="url(#luce)">')
    for x, y, z in P:
        d = (1.7 - z) / 3
        rr = (2.2 + 2.6 * d) if dettagliato else (11 + 5 * d)
        col = "#e0f2fe" if d > 0.55 else "#7dd3fc"
        q.append('<circle cx="%.1f" cy="%.1f" r="%.1f" fill="%s" fill-opacity="%.2f"/>' % (x, y, rr, col, max(0.35, min(1, d * 1.3))))
    q.append("</g>")
    p.append("".join(q))
    # impulsi (sinapsi accese) - solo nella versione grande
    if dettagliato:
        for (i, j) in archi(pts)[5:200:23]:
            a, b = P[i], P[j]
            p.append('<circle cx="%.1f" cy="%.1f" r="6" fill="#fde68a" filter="url(#luce)"/>' % ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2))
    # scintilla d'oro della fenice al centro
    p.append('<circle cx="%d" cy="%d" r="58" fill="url(#scintilla)" filter="url(#luceforte)"/>' % (cx, cy + 4))
    p.append('<circle cx="%d" cy="%d" r="34" fill="url(#scintilla)"/>' % (cx, cy + 4))
    k = 1 if dettagliato else 1.9
    p.append('<path transform="translate(%d %d) scale(%.2f)" d="M-4 26 c-14 -16 -10 -34 4 -46 c-2 12 6 18 12 22 c6 -10 4 -20 0 -28 c18 12 24 32 12 50 c-6 10 -18 14 -28 2z" fill="#fff7d6" filter="url(#luce)"/>' % (cx, cy, k))
    if not dettagliato:
        p[-2] = p[-2].replace('r="34"', 'r="70"')
    # riflesso della sfera
    p.append('<ellipse cx="%d" cy="%d" rx="%d" ry="%d" fill="url(#riflesso)"/>' % (cx - 52, cy - 82, 92, 52))
    # anello dell'orbita: parte davanti con il satellite
    p.append('<g transform="rotate(%d %d %d)"><path d="M%d %d A%d %d 0 0 0 %d %d" fill="none" stroke="url(#anello)" stroke-width="%d" stroke-linecap="round" filter="url(#luce)"/>'
             '<circle cx="%d" cy="%d" r="%d" fill="#f0fdfa" filter="url(#luce)"/></g>' % (
                 rot, cx, cy, cx - rx, cy, rx, ry, cx + rx, cy, 9 if dettagliato else 22, cx + int(rx * 0.71), cy + int(ry * 0.71), 11 if dettagliato else 22))
    p.append("</svg>")
    return "\n".join(p)


if __name__ == "__main__":
    os.makedirs(IMG, exist_ok=True)
    for nome, det in (("logo.svg", True), ("logo-piccolo.svg", False)):
        with open(os.path.join(IMG, nome), "w", encoding="utf-8") as f:
            f.write(logo(det))
        print("scritto", nome)
