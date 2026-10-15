#!/bin/bash
# Consulente Digitale - compila i pacchetti per Linux (.deb), Windows (installatore .exe), macOS (.app in .zip)
# e la versione portatile (.zip per chiavetta, tutti i sistemi). Uscita in dist/.
# Serve: python3, dpkg-deb, makensis (NSIS), rsvg-convert, Pillow (python3-pil), zip.
# Ideato e sviluppato da Danilo D'Auria - Codice MIT
set -euo pipefail
cd "$(dirname "$0")"
V="$(cat VERSION)"
B="build"; D="dist"
rm -rf "$B" "$D"; mkdir -p "$B" "$D"
echo "== Consulente Digitale $V"

# --- applicazione comune (server + interfaccia + script) ---
APP="$B/app"
mkdir -p "$APP/server" "$APP/azioni"
cp src/server/cd_*.py "$APP/server/"
cp -r src/web "$APP/web"
cp -r src/azioni/windows src/azioni/linux src/azioni/mac "$APP/azioni/"
cp VERSION "$APP/VERSION"
sed -i "s/CD.versione = \"[0-9.]*\"/CD.versione = \"$V\"/" "$APP/web/js/core.js"
# il vademecum dentro il programma (menu «📘 Vademecum») e accanto ai pacchetti
if [ -f docs/Vademecum_Consulente_Digitale.pdf ]; then
  mkdir -p "$APP/web/docs" && cp docs/Vademecum_Consulente_Digitale.pdf "$APP/web/docs/"
else
  echo "   (attenzione: manca docs/Vademecum_Consulente_Digitale.pdf: lanciate tools/genera-vademecum.py)"
fi
find "$APP" -name '__pycache__' -prune -exec rm -rf {} +
python3 -c "import ast,sys; [ast.parse(open(f).read()) for f in sys.argv[1:]]" "$APP"/server/*.py

# --- icone ---
ICO="$B/icone"; mkdir -p "$ICO"
# piccole (16-48 px): disegno semplificato; grandi: disegno completo di Neura
for s in 16 24 32 48; do rsvg-convert -w $s -h $s src/web/img/logo-piccolo.svg -o "$ICO/$s.png"; done
for s in 64 128 256 512 1024; do rsvg-convert -w $s -h $s src/web/img/logo.svg -o "$ICO/$s.png"; done
python3 - "$ICO" <<'PY'
import sys
from PIL import Image
d = sys.argv[1]
imgs = [Image.open(d + "/%d.png" % s).convert("RGBA") for s in (16, 24, 32, 48, 64, 128, 256)]
imgs[-1].save(d + "/icona.ico", format="ICO", sizes=[(i.width, i.height) for i in imgs], append_images=imgs[:-1])
Image.open(d + "/1024.png").save(d + "/icona.icns")
PY

LIC="$B/LICENZE.txt"
{ echo "CONSULENTE DIGITALE $V — ideato e sviluppato da Danilo D'Auria"; echo; cat LICENSE; echo; echo "--------"; echo; cat LICENZA-CONTENUTI.md; } > "$LIC"

# --- Linux: pacchetto .deb ---
P="$B/deb"
mkdir -p "$P/DEBIAN" "$P/usr/bin" "$P/usr/share/consulente-digitale" "$P/usr/share/applications" "$P/usr/share/doc/consulente-digitale"
cp -r "$APP"/* "$P/usr/share/consulente-digitale/"
install -m 755 packaging/linux/consulente-digitale "$P/usr/bin/consulente-digitale"
install -m 644 packaging/linux/consulente-digitale.desktop "$P/usr/share/applications/"
for s in 48 64 128 256 512; do mkdir -p "$P/usr/share/icons/hicolor/${s}x${s}/apps"; cp "$ICO/$s.png" "$P/usr/share/icons/hicolor/${s}x${s}/apps/consulente-digitale.png"; done
mkdir -p "$P/usr/share/icons/hicolor/scalable/apps"; cp src/web/img/logo.svg "$P/usr/share/icons/hicolor/scalable/apps/consulente-digitale.svg"
cp "$LIC" "$P/usr/share/doc/consulente-digitale/copyright"
sed "s/@VERSIONE@/$V/" packaging/linux/control > "$P/DEBIAN/control"
echo "Installed-Size: $(du -sk "$P/usr" | cut -f1)" >> "$P/DEBIAN/control"
find "$P" -type d -exec chmod 755 {} +; find "$P/usr/share" -type f -exec chmod 644 {} +
dpkg-deb --root-owner-group -Zxz --build "$P" "$D/consulente-digitale_${V}_all.deb" >/dev/null
echo "   .deb   → $D/consulente-digitale_${V}_all.deb"

# --- Windows: installatore NSIS ---
W="$B/win"; mkdir -p "$W/contenuto"
cp -r "$APP" "$W/contenuto/app"
cp packaging/windows/avvia.ps1 packaging/windows/avvia.vbs "$W/contenuto/"
sed -i 's/$/\r/' "$W/contenuto/avvia.vbs"
python3 -c "import sys; p=sys.argv[1]; t=open(p,encoding='utf-8').read().replace('\r\n','\n').replace('\n','\r\n'); open(p,'w',encoding='utf-8-sig',newline='').write(t)" "$W/contenuto/avvia.ps1"
cp "$ICO/icona.ico" "$W/"; cp "$ICO/icona.ico" "$W/contenuto/"
sed 's/$/\r/' "$LIC" > "$W/LICENZE.txt"; cp "$W/LICENZE.txt" "$W/contenuto/"
cp packaging/windows/installer.nsi "$W/"
( cd "$W" && makensis -V2 -DVERSIONE="$V" -DUSCITA="ConsulenteDigitale-Setup-$V.exe" installer.nsi )
mv "$W/ConsulenteDigitale-Setup-$V.exe" "$D/"
echo "   .exe   → $D/ConsulenteDigitale-Setup-$V.exe"

# --- macOS: app in uno zip ---
M="$B/mac"; A="$M/Consulente Digitale.app"
mkdir -p "$A/Contents/MacOS" "$A/Contents/Resources"
cp -r "$APP" "$A/Contents/Resources/app"
install -m 755 packaging/mac/avvia.sh "$A/Contents/MacOS/avvia.sh"
sed "s/@VERSIONE@/$V/g" packaging/mac/Info.plist > "$A/Contents/Info.plist"
cp "$ICO/icona.icns" "$A/Contents/Resources/icona.icns"
cp packaging/mac/LEGGIMI-MAC.txt "$LIC" "$M/"
( cd "$M" && zip -qry -X "../../$D/ConsulenteDigitale-$V-macOS.zip" "Consulente Digitale.app" LEGGIMI-MAC.txt LICENZE.txt )
echo "   macOS  → $D/ConsulenteDigitale-$V-macOS.zip"

# --- portatile (chiavetta): stessi file, dati accanto al programma ---
Z="$B/portatile/ConsulenteDigitale-$V"; mkdir -p "$Z"
cp -r "$APP" "$Z/app"
touch "$Z/app/../portatile.txt"
cp "$W/contenuto/avvia.ps1" "$W/contenuto/avvia.vbs" "$Z/"
printf '@echo off\r\nstart "" wscript.exe "%%~dp0avvia.vbs"\r\n' > "$Z/Avvia su Windows.bat"
printf '#!/bin/sh\ncd "$(dirname "$0")" && CD_SHARE_DIR="$PWD/app" exec python3 app/server/cd_server.py --apri\n' > "$Z/avvia-linux-mac.sh"; chmod 755 "$Z/avvia-linux-mac.sh"
cp "$Z/avvia-linux-mac.sh" "$Z/Avvia su Mac.command"
cp "$LIC" "$Z/LICENZE.txt"
cat > "$Z/LEGGIMI.txt" <<EOF
CONSULENTE DIGITALE $V — versione portatile (anche da chiavetta)
Ideato e sviluppato da Danilo D'Auria — codice MIT, contenuti CC BY-NC-SA 4.0

Windows: doppio clic su «Avvia su Windows.bat»
Linux:   doppio clic su «avvia-linux-mac.sh» (o nel terminale: sh avvia-linux-mac.sh)
macOS:   doppio clic su «Avvia su Mac.command» (la prima volta: tasto destro → Apri)

I dati (impostazioni, conversazione) restano nella cartella «dati» accanto al programma.
Serve Python 3.7 o successivo (su Windows viene scaricato da solo, se manca).
EOF
( cd "$B/portatile" && zip -qr -X "../../$D/ConsulenteDigitale-$V-portatile.zip" "ConsulenteDigitale-$V" )
echo "   zip    → $D/ConsulenteDigitale-$V-portatile.zip"

[ -f docs/Vademecum_Consulente_Digitale.pdf ] && cp docs/Vademecum_Consulente_Digitale.pdf "$D/Vademecum_Consulente_Digitale_$V.pdf"
( cd "$D" && sha256sum ./* > SHA256SUMS )
echo "== Fatto: $(ls "$D" | wc -l) file in $D/"
