# AI DJ Bąbel — Docker

Pełna konteneryzacja: **frontend** (nginx + SPA) + **backend** (Fastify) + sieć współdzielona, jeden plik `docker-compose.yml`.

```
┌─────────────────────────────────────────────────┐
│  host:8080 ──► [client]  nginx :80              │
│                  │                              │
│                  │  /api/*  ─► [server] :3001   │
│                  │                              │
│                  └───────► statyki Vite (SPA)   │
└─────────────────────────────────────────────────┘
```

## Wymagania

- **Docker** 24+ (z buildx) i **Docker Compose** v2
- Lokalnie wystarczy [Docker Desktop](https://www.docker.com/products/docker-desktop) (Mac M1) — buildx w komplecie
- Na Ubuntu LTS: `docker-ce` + `docker-compose-plugin` (Docker official repo)

## TL;DR — uruchomienie

```bash
cd bubble
cp server/.env.example server/.env   # i wklej GROQ_API_KEY
docker compose up -d --build         # build + start w tle
open http://localhost:8080           # gotowe
docker compose logs -f               # live logs
docker compose down                  # stop + cleanup
```

## Konfiguracja

| Plik / zmienna             | Co kontroluje                                                |
| -------------------------- | ------------------------------------------------------------ |
| `server/.env`              | Sekrety backendu (`GROQ_API_KEY` itd.) — nie commitowane     |
| `PUBLIC_PORT` (env)        | Port hostowy dla frontu (default `8080`)                     |
| `LOG_LEVEL`, `LOG_PRETTY`  | Logi backendu                                                |
| `docker-compose.yml`       | Skład usług, sieć, healthchecki                              |
| `docker/nginx.conf`        | Routing nginx + proxy `/api` → `server:3001`                 |
| `Dockerfile` (root)        | Obraz frontendu (multi-stage builder → nginx)                |
| `server/Dockerfile`        | Obraz backendu (multi-stage Node 20 alpine)                  |
| `.dockerignore` (oba)      | Co NIE leci do kontekstu builda                              |

Przykład uruchomienia z innym portem:

```bash
PUBLIC_PORT=3000 docker compose up -d --build
```

## Workflow Mac M1 → Ubuntu LTS deploy

Mam M1 (`linux/arm64`), produkcja Ubuntu (`linux/amd64`). Dwa scenariusze:

### Scenariusz A (zalecany) — build na maszynie docelowej

Najmniej kombinowania, tylko Git + Docker:

```bash
# Na Ubuntu serwerze
git clone https://github.com/<you>/bubble.git
cd bubble
cp server/.env.example server/.env
nano server/.env                     # wklej GROQ_API_KEY
docker compose up -d --build
docker compose ps                    # sanity check (oba healthy)
```

Build uruchamia się z natywną architekturą Ubuntu (amd64). Re-deploy:

```bash
git pull && docker compose up -d --build
```

### Scenariusz B — cross-build z M1, push na registry

Gdy serwer Ubuntu nie ma zasobów na build:

```bash
# Na M1 — jednorazowy setup buildx
docker buildx create --name baibel-builder --use
docker buildx inspect --bootstrap

# Login do dowolnego registry (Docker Hub, GHCR, ECR…)
docker login ghcr.io

# Build + push pod amd64
docker buildx build --platform linux/amd64 \
  -t ghcr.io/<user>/baibel-server:latest -f server/Dockerfile --push .
docker buildx build --platform linux/amd64 \
  -t ghcr.io/<user>/baibel-client:latest -f Dockerfile --push .
```

Na Ubuntu używasz wtedy `compose.prod.yml` z `image:` zamiast `build:`:

```yaml
services:
  server:
    image: ghcr.io/<user>/baibel-server:latest
  client:
    image: ghcr.io/<user>/baibel-client:latest
    ports: ["8080:80"]
```

Plus `docker compose -f docker-compose.yml -f compose.prod.yml pull && up -d`.

### Scenariusz C — dev wieloarchitektura jednym strzałem

```bash
docker buildx build --platform linux/amd64,linux/arm64 \
  -t baibel-server:multi -f server/Dockerfile --load .
```

Uwaga: `--load` działa tylko dla pojedynczej platformy. Dla multi-arch musisz `--push` na registry.

## Operacje

```bash
# Status + zdrowie
docker compose ps
docker inspect --format='{{.State.Health.Status}}' baibel-server

# Logi konkretnej usługi
docker compose logs -f server
docker compose logs -f client

# Wejście do kontenera (debug)
docker compose exec server sh
docker compose exec client sh

# Restart pojedynczej usługi
docker compose restart server

# Pełny rebuild bez cache (np. po zmianie deps)
docker compose build --no-cache
docker compose up -d

# Stop + delete kontenerów + sieci
docker compose down

# + delete volumes (na razie nie używamy persistent storage)
docker compose down -v
```

## Healthchecki

- **server**: `node -e "fetch('http://localhost:3001/api/health')..."` co 30 s
- **client**: `wget --spider http://localhost/` co 30 s

`docker compose ps` pokaże `(healthy)` przy obu gdy wszystko OK.

## Troubleshooting

**`build failed: GROQ_API_KEY not set`** — env nie jest zaciągany w trakcie builda. Build NIE potrzebuje klucza — używamy go tylko w runtime przez `env_file`. Sprawdź `server/.env` istnieje i zawiera `GROQ_API_KEY=gsk_...`.

**`server unhealthy`** — sprawdź `docker compose logs server`. Najczęściej:
- brak `server/.env` → backend startuje, ale `/api/transcribe` zwraca 503 (zamierzone)
- port 3001 zajęty przez coś innego na hoście — kontener używa go tylko wewnątrz, więc to nie powinno blokować

**`client → /api/* zwraca 502`** — backend padł lub jeszcze startuje. `docker compose ps` + logi.

**Mikrofon w przeglądarce nie działa** — `localhost:8080` to **secure context**, więc `getUserMedia` zadziała. Jeśli pierwsza prośba nie wyskakuje, sprawdź:
1. macOS: System Settings → Privacy → Microphone → włącz dla swojej przeglądarki, **zrestartuj przeglądarkę**.
2. Strona settings (`chrome://settings/content/microphone`) → upewnij się że `localhost:8080` nie jest w "Block".

**Multi-arch build jest powolny** — buildx z QEMU emuluje obcą architekturę → wolne. Dla CI prefer ARM-based runner do arm64 i x86 do amd64.

## Co NIE jest skonteneryzowane (świadomie)

- **Sample bank** — używamy publicznych URLi Pixabay CDN, nie hostujemy plików.
- **Database** — aplikacja stateless.
- **HTTPS / domena** — w prod stawiamy reverse proxy (Caddy/Traefik) PRZED `client:80` lub używamy `ports: ["443:443"]` z certyfikatami. Poza zakresem MVP.

## Przykład Caddyfile (jeśli chcesz HTTPS od ręki na Ubuntu)

```caddyfile
baibel.example.com {
  reverse_proxy localhost:8080
}
```

Caddy automatycznie wystawi cert Let's Encrypt. Wtedy frontend leci na 8080 lokalnie, Caddy na 443 publicznie.
