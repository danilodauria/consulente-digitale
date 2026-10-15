#!/bin/bash
# Installa un programma consigliato. CD_PARAM: "flatpak:ID" oppure "pkg:nome" (dalla lista bianca del programma).
tipo="${CD_PARAM%%:*}"; nome="${CD_PARAM#*:}"
passo 1 2 "Preparazione"
if [ "$tipo" = "flatpak" ]; then
    c_e flatpak || installa_pacchetto flatpak
    flatpak remote-add --if-not-exists flathub https://dl.flathub.org/repo/flathub.flatpakrepo
    passo 2 2 "Installo $nome da Flathub"
    flatpak install -y --noninteractive flathub "$nome" && ok "Installato. Lo trovate nel menu dei programmi."
    exit $?
fi
passo 2 2 "Installo $nome dalla distribuzione"
[ "$GESTORE" = "apt" ] && apt-get update >/dev/null
installa_pacchetto $nome && ok "Installato. Lo trovate nel menu dei programmi."
