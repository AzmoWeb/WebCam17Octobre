# CamManif

Site de caméras en direct : chaque utilisateur crée des caméras, reçoit une clé de stream privée
(`rtmp://ton-serveur/live/CLE_SECRETE`) à coller dans sa caméra ou dans OBS, et les visiteurs regardent
en HLS avec un chat en temps réel modéré.

**Stack** : Next.js 15 (TypeScript) · Supabase (comptes, Postgres, temps réel) · MediaMTX (RTMP/RTSP → HLS).

## Comment ça marche

```
Caméra / OBS ──RTMP──▶ MediaMTX :1935  ──(hook)──▶ Next.js /api/mediamtx/auth  → clé valide ?
                          │ HLS 127.0.0.1:8888 (privé)
                          ▼
Spectateur ──HTTP──▶ Next.js /api/hls/<id caméra>/index.m3u8  (proxy : la clé n'est jamais exposée)
Spectateur ◀──WebSocket──▶ Supabase Realtime (commentaires)
```

- Les caméras publient sur `live/<clé>`. MediaMTX demande au site si la clé existe.
- Le HLS et l'API MediaMTX n'écoutent que sur `127.0.0.1`. Les spectateurs passent par le proxy Next.js,
  qui traduit l'id public de la caméra en clé côté serveur.
- Les clés sont dans une table séparée (`stream_keys`) que seul leur propriétaire peut lire (RLS).
- Modération : signalement par les spectateurs, suppression de messages et bannissement par le
  propriétaire de la caméra (depuis le chat ou le tableau de bord).

## Installation (en local, sous Windows)

### 1. Supabase

1. Crée un projet sur <https://supabase.com>.
2. **SQL Editor** → colle le contenu de [supabase/schema.sql](supabase/schema.sql) → **Run**.
   Puis, dans une nouvelle requête, [supabase/002_features.sql](supabase/002_features.sql) → **Run**
   (catégories, villes, favoris, bio).
3. **Authentication → URL Configuration** : Site URL = `http://localhost:3000`,
   et ajoute `http://localhost:3000/auth/callback` dans les Redirect URLs.
4. (Facultatif, pour tester plus vite) **Authentication → Providers → Email** : désactive
   « Confirm email ».

### 2. Variables d'environnement

Copie `.env.local.example` en `.env.local` et remplis les valeurs depuis
**Project Settings → API** (URL, clé `anon`, clé `service_role`).

### 3. MediaMTX

1. Télécharge l'archive Windows (`mediamtx_vX.Y.Z_windows_amd64.zip`) depuis
   <https://github.com/bluenviron/mediamtx/releases>.
2. Place `mediamtx.exe` dans le dossier [mediamtx/](mediamtx/), à côté de `mediamtx.yml`.
3. Lance-le :

   ```bash
   cd mediamtx; .\mediamtx.exe mediamtx.yml
   ```

### 4. Le site

```bash
npm install
```

```bash
npm run dev
```

Ouvre <http://localhost:3000>, crée un compte, puis une caméra dans **Mes caméras**.

### 5. Envoyer un flux

- **OBS** : Paramètres → Stream → Service « Personnalisé ». Serveur : `rtmp://localhost/live`,
  Clé : la clé affichée dans le tableau de bord.
- **Caméra IP / appareil RTMP** : colle l'URL complète `rtmp://localhost/live/<clé>`.
- **Test sans caméra** (si ffmpeg est installé) :

  ```bash
  ffmpeg -re -f lavfi -i testsrc=size=1280x720:rate=30 -f lavfi -i sine -c:v libx264 -preset veryfast -tune zerolatency -g 30 -c:a aac -f flv rtmp://localhost/live/TA_CLE
  ```

Le badge « EN DIRECT » apparaît et la vidéo démarre en quelques secondes.

> Pour un délai faible, règle l'intervalle d'images clés à 1 s dans OBS
> (Sortie → mode Avancé → Intervalle d'images clés = 1).

## Mise en production (VPS)

- Fais tourner Next.js (`npm run build` puis `npm start`) et MediaMTX sur le même serveur
  (services systemd ou pm2), avec un reverse proxy HTTPS (Caddy ou Nginx) devant le port 3000.
- Ouvre au public uniquement **443** (site) et **1935** (RTMP), plus **8554** si des caméras
  publient en RTSP. Ne publie jamais 8888 (HLS) ni 9997 (API).
- Mets à jour `NEXT_PUBLIC_SITE_URL` et `NEXT_PUBLIC_RTMP_URL` (`rtmp://ton-domaine/live`), ainsi
  que l'URL du site dans Supabase.
- Toute la vidéo transite par Next.js. Au-delà de quelques dizaines de spectateurs, ajoute un cache
  Nginx/CDN devant `/api/hls/` (segments de quelques secondes) ou passe à une offre gérée.

## Structure

| Chemin | Rôle |
| --- | --- |
| `supabase/schema.sql` | Tables, RLS, triggers, publication temps réel |
| `mediamtx/mediamtx.yml` | Config du serveur vidéo |
| `src/app/api/mediamtx/auth` | Hook d'authentification MediaMTX (validation des clés) |
| `src/app/api/hls/[id]/[...file]` | Proxy HLS public → MediaMTX |
| `src/app/api/streams/[id]/status` | Statut en direct d'une caméra |
| `src/app/dashboard` | Caméras, clés, signalements, bannis |
| `src/app/cam/[id]` | Lecteur HLS + chat en temps réel |
| `src/app/login` | Inscription / connexion |
