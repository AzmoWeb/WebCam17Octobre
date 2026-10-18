# CamManif

Site de caméras en direct : chaque utilisateur crée des caméras, reçoit une clé de stream privée à coller dans
sa caméra ou dans OBS, et les visiteurs regardent en HLS avec un chat en temps réel modéré.

**Stack** : Next.js 15 (TypeScript, Tailwind CSS 4) · Supabase (comptes, Postgres, temps réel) · MediaMTX
(RTMP/RTSP → HLS, enregistrement) · Leaflet / OpenStreetMap (carte, sans clé d'API) · Zod (validation).

## Fonctionnalités

| | |
| --- | --- |
| **Regarder** | Accueil (recherche, filtres, En direct / À venir / Abonnements / Favoris) · **carte** avec un marqueur caméra par stream · **mosaïque** 2 à 9 caméras · lecteur (qualité, capture, PiP, mode cinéma) |
| **Interagir** | Chat temps réel, réactions, spectateurs en direct, favoris, abonnements, messages privés, **clips** |
| **Diffuser** | Studio : clé privée, guide OBS / caméra IP / téléphone, position, direct programmé, événement, **statistiques**, **replays** |
| **Modérer** | Signalements, suppression, bannissement par caméra · **panel admin** (`/admin`) avec journal d'audit |
| **Comptes** | E-mail / mot de passe, Google, GitHub · profil public |
| **Mobile** | Interface mobile d'abord · application installable (PWA) |

> **Floutage des visages** : non inclus (nécessite un pipeline de détection de visages en temps réel, piste V2).

## Comment ça marche

```
Caméra / OBS ──RTMP──▶ MediaMTX :1935  rtmp://serveur/live/<ID_CAMERA>?key=<CLE>
                          │ ──(auth + secret)──▶ /api/mediamtx/auth : hash(clé) == hash stocké ? caméra active ? compte non banni ?
                          │ ──(hooks + secret)─▶ /api/mediamtx/hook : début / fin de direct (stats, replays)
                          │  HLS 127.0.0.1:8888 · playback 127.0.0.1:9996 · API 127.0.0.1:9997 (jamais exposés)
                          ▼
Spectateur ──HTTPS──▶ Next.js /api/hls/<id>/…, /api/clips/<id>/video, /api/replays/<id>/video
Spectateur ◀──WSS───▶ Supabase Realtime (lecture seule, anonyme : chat public, présence, réactions)
Écritures ──────────▶ Server actions Next.js (session HttpOnly, Zod, rate limiting, RLS)
```

## Installation (en local, sous Windows)

### 1. Supabase

1. Crée un projet sur <https://supabase.com>.
2. **SQL Editor** : exécute les fichiers **dans cet ordre**, chacun dans une nouvelle requête :
   1. [supabase/schema.sql](supabase/schema.sql)
   2. [supabase/002_features.sql](supabase/002_features.sql)
   3. [supabase/003_platform.sql](supabase/003_platform.sql)
   4. [supabase/004_security.sql](supabase/004_security.sql)
3. **Authentication → URL Configuration** : Site URL = `http://localhost:3000`,
   Redirect URLs : `http://localhost:3000/auth/callback`.
4. Te nommer administrateur (après t'être inscrit) :

   ```sql
   update public.profiles set role = 'admin' where username = 'TON_PSEUDO';
   ```

> **Mise à jour depuis une version précédente** : après `004_security.sql`, les caméras publient sur
> `rtmp://serveur/live/<ID_CAMERA>?key=<CLE>` (le Studio affiche le nouveau format). Les clés existantes
> restent valables, seule l'URL change dans OBS.

### 2. Variables d'environnement

Copie `.env.local.example` en **`.env.local`** (point au début, pas de `.txt`) à la racine du projet et remplis
les valeurs (**Project Settings → API**). Génère un secret pour les hooks MediaMTX :

```bash
node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
```

Next.js ne lit `.env.local` qu'au démarrage : relance `npm run dev` après chaque modification.

### 3. MediaMTX (+ ffmpeg)

1. Télécharge `mediamtx_vX.Y.Z_windows_amd64.zip` depuis <https://github.com/bluenviron/mediamtx/releases> et
   place `mediamtx.exe` dans [mediamtx/](mediamtx/).
2. Génère la configuration (injecte `MEDIAMTX_HOOK_SECRET` dans `mediamtx/mediamtx.yml`, non versionné) :

   ```bash
   npm run mediamtx:config
   ```

3. Lance MediaMTX :

   ```bash
   cd mediamtx; .\mediamtx.exe mediamtx.yml
   ```

4. Pour les qualités 720p / 480p : `winget install Gyan.FFmpeg`.

### 4. Le site

```bash
npm install
```

```bash
npm run dev
```

### 5. Envoyer un flux

- **OBS** : Service « Personnalisé », Serveur `rtmp://localhost/live`, Clé `<ID_CAMERA>?key=<CLE>`.
- **Caméra IP / téléphone** : URL complète `rtmp://localhost/live/<ID_CAMERA>?key=<CLE>`.

La clé n'est affichée **qu'une fois**, à la création de la caméra ou après « Régénérer » dans le Studio.

## Sécurité

| Domaine | Mesures |
| --- | --- |
| **Base de données** | RLS sur toutes les tables, policies strictes, droits par colonne (rôle, bannissement et clés non modifiables par les utilisateurs), uniquement des requêtes paramétrées (client Supabase) |
| **Entrées** | Validation Zod côté serveur de chaque action et route (types, formats, longueurs), nettoyage des textes (caractères de contrôle / invisibles), corps des server actions limités à 100 ko |
| **XSS** | Aucun `dangerouslySetInnerHTML` ; rendu échappé par React ; popups de carte construites avec `textContent` ; CSP stricte avec nonce par requête |
| **En-têtes** | CSP, HSTS (prod), X-Frame-Options DENY, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, COOP |
| **Abus** | Rate limiting en base : connexion (IP + compte), inscription, OAuth, commentaires, signalements, messages, clics, clés ; captcha Turnstile facultatif |
| **Sessions / CSRF** | Cookies de session HttpOnly, Secure (prod), SameSite=Lax ; écritures via server actions (contrôle d'origine intégré à Next.js) |
| **Autorisations** | Utilisateur et rôle revérifiés côté serveur à chaque action ; panel admin invisible (404) sans le rôle ; messages d'erreur génériques |
| **Clés de stream** | Stockées hashées (SHA-256), affichées une seule fois, régénérables, jamais envoyées aux spectateurs ; la lecture passe par l'id public de la caméra |
| **Secrets** | Seules l'URL Supabase et la clé anon sont publiques ; `SUPABASE_SERVICE_ROLE_KEY`, `MEDIAMTX_*` restent côté serveur ; `.env.local` et `mediamtx.yml` sont dans `.gitignore` |

> Les clés présentes dans d'anciens commits restent dans l'historique Git : régénère la clé `service_role`
> (Supabase → Project Settings → API) si `.env.local` a déjà été poussé.

### Options

- **Google / GitHub** : Supabase → Authentication → Sign In / Providers (URL de callback indiquée par Supabase).
- **Captcha** : widget Cloudflare Turnstile → `NEXT_PUBLIC_TURNSTILE_SITE_KEY` + Supabase → Attack Protection.

## Mise en production (VPS)

- Next.js (`npm run build` puis `npm start`) et MediaMTX sur le même serveur, derrière un reverse proxy HTTPS
  (Caddy / Nginx) qui transmet `X-Real-IP` (utilisé par le rate limiting).
- Ports publics : **443** et **1935** (+ **8554** pour le RTSP). Jamais 8888, 9996 ni 9997.
- `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_RTMP_URL`, `MEDIAMTX_HOOK_SECRET` propres à la production, puis
  `npm run mediamtx:config`.

## Structure

| Chemin | Rôle |
| --- | --- |
| `supabase/*.sql` | Schéma, RLS, triggers, rate limiting (à exécuter dans l'ordre) |
| `mediamtx/mediamtx.example.yml` | Modèle de config MediaMTX (`npm run mediamtx:config`) |
| `src/middleware.ts`, `next.config.ts` | CSP avec nonce, en-têtes de sécurité, rafraîchissement de session |
| `src/lib/validation.ts`, `sanitize.ts`, `ratelimit.ts` | Zod, nettoyage, limitation de débit |
| `src/app/**/actions.ts` | Server actions (toutes les écritures) |
| `src/app/api/*` | Hooks MediaMTX, proxys vidéo (direct, clips, replays), statut |
| `src/components/ui` | Composants Tailwind (boutons, cartes, onglets, états vides / chargement) |
| `src/app/admin` | Panel d'administration + journal d'audit |
