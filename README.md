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

- **Spielstände** hängen am Browser (anonymer Schlüssel im localStorage). Browserdaten löschen = neuer Spieler.
- **Spielername**: Jeder bekommt automatisch „Angler-1234“, änderbar unter Spieler → Profil.
- **Admin**: nur wer im Profil „leif“ als Namen hat und einmal im Chat `/admin code:8283` eingibt. Danach gehen alle Admin-Werkzeuge auch per Chat-Befehl (`/help` zeigt alle). Admin-Spielstände erscheinen nicht in der Rangliste.
- **Rangliste** wird von den Browsern gemeldet; wer sich auskennt, kann schummeln. Für ein Spiel unter Freunden ist das ok.
- Alle Spieler landen in **einer** gemeinsamen Welt. Das reicht locker für einige Dutzend gleichzeitig.
- Das Spiel aktualisieren: neue `public/index.html` einsetzen, wieder `npx wrangler deploy`.

Inoffizielles Fanprojekt nach dem Roblox-Spiel Fisch, nicht mit dessen Entwicklern verbunden.
