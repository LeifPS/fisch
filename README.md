# Fischerdock auf Cloudflare

Das Spiel läuft als ein einziger Cloudflare Worker:

- **public/index.html**: das komplette Spiel (3D-Engine wird von cdn.jsdelivr.net geladen)
- **src/worker.js**: liefert das Spiel aus und betreibt ein Durable Object „GameRoom“ für
  - Live-Multiplayer (WebSocket: Mitspieler sehen, Chat, Fänge)
  - Rangliste
  - Cloud-Spielstand (pro Gerät/Browser)

Alles passt in den **kostenlosen Workers-Plan**.

## Einmalig einrichten

1. **Node.js** installieren (Version 20 oder neuer): https://nodejs.org
2. Diesen Ordner entpacken, ein Terminal darin öffnen und ausführen:
   ```
   npm install
   npx wrangler login
   ```
   Beim Login öffnet sich der Browser, dort mit deinem Cloudflare-Konto anmelden (kostenloses Konto reicht).

## Veröffentlichen

```
npx wrangler deploy
```

Am Ende zeigt Wrangler die Adresse, z. B. `https://fischerdock.DEIN-NAME.workers.dev`.
Diesen Link an Freunde schicken: Alle, die ihn gleichzeitig offen haben, spielen in derselben Welt.

## Lokal testen (optional)

```
npx wrangler dev
```
Dann http://localhost:8787 in zwei Browserfenstern öffnen.

## Eigene Domain (optional)

Im Cloudflare-Dashboard → Workers & Pages → fischerdock → Settings → Domains & Routes → „Add Custom Domain“.

## Gut zu wissen

- **Accounts**: Beim Start meldet man sich mit Name und Passwort an oder legt einen Account an. Jeder Name existiert nur einmal (wer zuerst kommt). Der Spielstand liegt auf dem Server, man kann also von jedem Gerät weiterspielen.
- **Admin**: nur der Account „leif“, nach einmal `/admin code:8283` im Chat. Danach gehen alle Admin-Werkzeuge per Chat-Befehl (beim Tippen von `/` erscheinen Vorschläge, `/help` zeigt alle). Welt-Befehle (Uhrzeit, Wetter, Events, Admin-Wetter) wirken für **alle** Spieler. Admin-Spielstände erscheinen nicht in der Rangliste.
- Alle Spieler landen in **einer** gemeinsamen Welt. Das reicht locker für einige Dutzend gleichzeitig.
- Grafik: Handys starten automatisch in niedriger Qualität; unter Spieler → Profil lässt sich Hoch/Mittel/Niedrig einstellen.

## Spiel ändern (für Entwickler)

Der Quellcode liegt in `dev/src` (core.js = Daten & Regeln, world.js = 3D-Welt, game.js = Spiel & UI, head.html = Oberfläche).
`python3 dev/build.py` baut daraus `public/index.html`. 3D-Modelle (Blender-Export) liegen in `public/assets`.

## Was ist neu in v3

- Riesige Welt: Inseln 4× größer, ca. 1 Minute Motorboot zwischen Nachbarinseln, echte Meeresweite
- Fischgebiete wie in Fisch, sichtbar mit dem Fisch-Radar (Story-Belohnung, Taste R)
- Hunts ohne Kreise: ein riesiger Schatten zieht durch ein Gebiet, dort beißt manchmal der Hunt-Fisch
- 3 Admin-Wetter für alle (Blutmond, Sternenfall, Leviathans Zorn) mit super seltenen Fischen
- Seltenheits-Ausrufezeichen mit Animation und Sound, auch bei Mitspielern sichtbar
- Ruten-Fähigkeiten, Tryhard-Rod-Prüfung, Fisch hochhalten (H)
- Blender-Modelle für Ruten, Boote, Häuser, Stege, Leuchtturm, Bäume; neue Figuren und Fische
- Gut versteckte Secrets … (mehr wird nicht verraten)

Inoffizielles Fanprojekt nach dem Roblox-Spiel Fisch, nicht mit dessen Entwicklern verbunden.
