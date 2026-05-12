# AI DJ Bąbel

Interaktywna aplikacja "studio piosenek dla dzieci":
- frontend: React + Vite (`/`)
- backend API: Fastify + TypeScript (`/server`)

## Architektura i porty

- `http://localhost:5173` - frontend dev (Vite)
- `http://localhost:3001` - backend dev (Fastify API)
- `http://localhost:8080` - wersja Docker (nginx + frontend + proxy `/api` do backendu)

## Wymagania

- Node.js 20+
- npm 10+
- opcjonalnie Docker Desktop (jeśli uruchamiasz przez kontenery)

## Szybki start (lokalny development)

1. Wejdz do katalogu projektu:

```bash
cd bubble
```

2. Zainstaluj zaleznosci:

```bash
npm install
```

3. Skonfiguruj backend env:

```bash
cp server/.env.example server/.env
```

4. (Opcjonalnie) Wstaw klucz `GROQ_API_KEY` do `server/.env`.
   Bez klucza:
   - `POST /api/transcribe` zwroci `503`,
   - `POST /api/songs` nadal zadziala (fallback/template lyrics).

5. Uruchom aplikacje:

```bash
# tylko frontend
npm run dev

# tylko backend
npm run dev:server

# frontend + backend razem
npm run dev:all
```

## Build i sprawdzenie typow

```bash
# frontend + server typecheck
npm run typecheck

# frontend build
npm run build

# server build
npm run build:server

# oba buildy
npm run build:all
```

## Uruchomienie przez Docker

Szybka wersja:

```bash
cd bubble
cp server/.env.example server/.env
docker compose up -d --build
open http://localhost:8080
```

Pelna dokumentacja Docker:
- `DOCKER.md`

## Konfiguracja (najwazniejsze pliki)

- `server/.env.example` - szablon zmiennych backendu
- `server/.env` - lokalne sekrety (nie commitujemy)
- `server/README.md` - szczegoly API backendu
- `DOCKER.md` - deployment i operacje kontenerowe

## Najczestsze problemy

- Port `5173` lub `3001` zajety:
  - zmien port procesu, ktory blokuje, lub zatrzymaj kolidujaca aplikacje.
- Brak mikrofonu w przegladarce:
  - sprawdz uprawnienia systemowe i przegladarki dla `localhost`.
- Endpointy API nie dzialaja z frontendu:
  - upewnij sie, ze backend dziala (`npm run dev:server`) i odpowiada na `GET /api/health`.
- `POST /api/transcribe` zwraca `503`:
  - dodaj `GROQ_API_KEY` w `server/.env`.

## Komendy diagnostyczne

```bash
# zdrowie API
curl http://localhost:3001/api/health

# logi Docker
docker compose logs -f

# status kontenerow
docker compose ps
```