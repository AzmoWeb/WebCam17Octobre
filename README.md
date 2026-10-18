# CamManif

Site de caméras en direct : chaque utilisateur crée des caméras, reçoit une clé de stream privée
(`rtmp://ton-serveur/live/CLE_SECRETE`) à coller dans sa caméra ou dans OBS, et les visiteurs regardent
en HLS avec un chat en temps réel modéré.

**Stack** : Next.js 15 (TypeScript) · Supabase (comptes, Postgres, temps réel) · MediaMTX (RTMP/RTSP → HLS,
enregistrement) · Leaflet / OpenStreetMap (carte).

## Fonctionnalités

| | |
| --- | --- |
| **Regarder** | Accueil avec recherche, filtres, onglets En direct / À venir / Abonnements / Favoris · **carte en direct** · **mosaïque** 2 à 9 caméras · lecteur avec qualité (Source / 720p / 480p), capture, PiP, mode cinéma |
| **Interagir** | Chat temps réel, réactions emoji, compteur de spectateurs, favoris, **abonnements**, **messages privés**, **clips** des 15 / 30 / 60 dernières secondes |
| **Diffuser** | Studio : clé privée, guide OBS / caméra IP / téléphone, position sur la carte, **direct programmé** (compte à rebours), rattachement à un **événement**, **statistiques** (pic, durée, courbe d'audience), **replays** |
| **Événements** | Page qui regroupe toutes les caméras d'une manif / d'un événement, avec un chat commun et une vue mosaïque |
| **Modération** | Signalements, suppression, bannissement par caméra · **admin** : file de signalements du site, bannissement global, suppression de caméras · **anti-spam** (10 messages / min, doublons bloqués, captcha Turnstile facultatif) |
| **Comptes** | E-mail / mot de passe, **Google**, **GitHub** · profil public avec bio, abonnés, clips et replays |
| **Mobile** | **Application installable (PWA)**, page hors connexion |

> **Floutage des visages** : non inclus. Il faut un pipeline de détection de visages en temps réel
> (modèle d'IA, idéalement sur GPU) entre MediaMTX et les spectateurs, ce que ni MediaMTX ni ffmpeg ne
> font seuls. C'est une piste pour une V2 (par exemple un service Python + OpenCV/MediaPipe qui relit le
> flux et le republie flouté).

## Comment ça marche

```
Caméra / OBS ──RTMP──▶ MediaMTX :1935 ──(auth)──▶ Next.js /api/mediamtx/auth → clé valide ? compte banni ?
                          │  runOnReady / runOnNotReady ──▶ /api/mediamtx/hook (début / fin du direct)
                          │  enregistrement ./recordings (7 jours)
                          │  HLS 127.0.0.1:8888 · playback 127.0.0.1:9996 · API 127.0.0.1:9997 (privés)
                          ▼
Spectateur ──HTTP──▶ Next.js /api/hls/<id>/…      (direct, la clé n'est jamais exposée)
                     Next.js /api/clips/<id>/video, /api/replays/<id>/video  (enregistrements)
Spectateur ◀──WebSocket──▶ Supabase Realtime (chat, messages, présence, réactions)
```

## Installation (en local, sous Windows)

### 1. Supabase

1. Crée un projet sur <https://supabase.com>.
2. **SQL Editor** : exécute les 3 fichiers **dans cet ordre**, chacun dans une nouvelle requête :
   1. [supabase/schema.sql](supabase/schema.sql)
   2. [supabase/002_features.sql](supabase/002_features.sql)
   3. [supabase/003_platform.sql](supabase/003_platform.sql)
3. **Authentication → URL Configuration** : Site URL = `http://localhost:3000`,
   et ajoute `http://localhost:3000/auth/callback` dans les Redirect URLs.
4. (Facultatif, pour tester plus vite) **Authentication → Providers → Email** : désactive
   « Confirm email ».
5. Te nommer administrateur (après t'être inscrit sur le site) :

   ```sql
   update public.profiles set is_admin = true where username = 'TON_PSEUDO';
   ```

### 2. Variables d'environnement

Copie `.env.local.example` en **`.env.local`** (avec le point au début, sans `.txt`) à la racine du projet,
et remplis les valeurs depuis **Project Settings → API** (URL, clé `anon`, clé `service_role`).
Next.js ne lit ce fichier qu'au démarrage : relance `npm run dev` après chaque modification.

### 3. MediaMTX (+ ffmpeg)

1. Télécharge l'archive Windows (`mediamtx_vX.Y.Z_windows_amd64.zip`) depuis
   <https://github.com/bluenviron/mediamtx/releases> et place `mediamtx.exe` dans [mediamtx/](mediamtx/).
2. Dans [mediamtx/mediamtx.yml](mediamtx/mediamtx.yml), remplace les 2 `change-me-hook-secret` par la
   valeur de `MEDIAMTX_HOOK_SECRET` (`.env.local`).
3. Pour les qualités 720p / 480p, installe ffmpeg (`winget install Gyan.FFmpeg`). Sans ffmpeg, seule la
   qualité « Source » fonctionne.
4. Lance-le :

   ```bash
   cd mediamtx; .\mediamtx.exe mediamtx.yml
   ```

Les directs sont enregistrés dans `mediamtx/recordings/` et supprimés après 7 jours
(`recordDeleteAfter`). Les clips et replays ne sont disponibles que pendant cette durée.

### 4. Le site

```bash
npm install
```

```bash
npm run dev
```

Ouvre <http://localhost:3000>, crée un compte, puis une caméra dans le **Studio**.

### 5. Envoyer un flux

- **OBS** : Paramètres → Stream → Service « Personnalisé ». Serveur : `rtmp://localhost/live`,
  Clé : la clé affichée dans le Studio.
- **Caméra IP / appareil RTMP** : colle l'URL complète `rtmp://localhost/live/<clé>`.
- **Téléphone** : appli Larix Broadcaster, avec l'URL complète.
- **Test sans caméra** (si ffmpeg est installé) :

  ```bash
  ffmpeg -re -f lavfi -i testsrc=size=1280x720:rate=30 -f lavfi -i sine -c:v libx264 -preset veryfast -tune zerolatency -g 30 -c:a aac -f flv rtmp://localhost/live/TA_CLE
  ```

> Pour un délai faible, règle l'intervalle d'images clés à 1 s dans OBS
> (Sortie → mode Avancé → Intervalle d'images clés = 1).

## Options

### Connexion Google / GitHub

Supabase → **Authentication → Sign In / Providers** → active **Google** et/ou **GitHub** :

- **GitHub** : crée une OAuth App sur <https://github.com/settings/developers> avec comme
  « Authorization callback URL » l'URL indiquée par Supabase (`https://<projet>.supabase.co/auth/v1/callback`),
  puis colle le Client ID et le secret dans Supabase.
- **Google** : crée des identifiants OAuth dans Google Cloud Console (même URL de callback).

Le pseudo est créé automatiquement à partir du compte (modifiable plus tard via SQL si besoin).

### Captcha (anti-robots)

1. Crée un widget **Cloudflare Turnstile** (gratuit) sur <https://dash.cloudflare.com>.
2. Mets la clé du site dans `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (`.env.local`).
3. Supabase → **Authentication → Attack Protection** : active le captcha Turnstile avec la clé secrète.

### Application installable

Rien à configurer : en production (HTTPS), Chrome / Edge / Android proposent « Installer CamManif ».
Sur iPhone : Safari → Partager → « Sur l'écran d'accueil ».

## Mise en production (VPS)

- Fais tourner Next.js (`npm run build` puis `npm start`) et MediaMTX sur le même serveur
  (services systemd ou pm2), avec un reverse proxy HTTPS (Caddy ou Nginx) devant le port 3000.
- Ouvre au public uniquement **443** (site) et **1935** (RTMP), plus **8554** si des caméras
  publient en RTSP. Ne publie jamais 8888 (HLS), 9996 (playback) ni 9997 (API).
- Mets à jour `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_RTMP_URL` (`rtmp://ton-domaine/live`), un vrai
  `MEDIAMTX_HOOK_SECRET`, et l'URL du site dans Supabase.
- Toute la vidéo transite par Next.js. Au-delà de quelques dizaines de spectateurs, ajoute un cache
  Nginx/CDN devant `/api/hls/` ou passe à une offre gérée.
- Prévois de l'espace disque pour les enregistrements (environ 1 Go par heure de direct en 1080p).

## Structure

| Chemin | Rôle |
| --- | --- |
| `supabase/*.sql` | Tables, RLS, triggers anti-spam, temps réel (à exécuter dans l'ordre) |
| `mediamtx/mediamtx.yml` | Serveur vidéo : auth, enregistrement, qualités, hooks |
| `src/app/api/mediamtx/*` | Hooks MediaMTX (validation des clés, début / fin de direct) |
| `src/app/api/hls`, `api/clips`, `api/replays` | Proxys vidéo (direct, clips, replays) |
| `src/app/cam/[id]` | Page caméra : lecteur, chat, réactions, clips, replays |
| `src/app/carte`, `mosaique`, `events` | Carte en direct, mosaïque, événements |
| `src/app/dashboard` | Studio : caméras, clé, stats, guide, modération |
| `src/app/messages`, `u/[username]` | Messages privés, profils |
| `src/app/admin` | Administration du site |
