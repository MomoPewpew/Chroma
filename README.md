# Chroma – Modal Temperament Designer

Chroma is a single-page React application for designing modal temperaments and producing the cent offsets needed to retune standard MIDI instruments. The current scaffold provides a clean starting point with TypeScript, ESLint, and a Docker-based development environment.

## Prerequisites

- Node.js ≥ 18.20 (20.x or 22.x recommended)
- npm ≥ 9
- Docker & Docker Compose (optional, for containerised development)

## Local Development

```bash
npm install
npm run dev
```

The Vite dev server runs on `http://localhost:5173/`. Edit files in `src/` and the page will hot-reload.

### Quality tools

- `npm run lint` – static analysis with ESLint
- `npm run build` – type-check and bundle the application

## Docker Dev Environment

1. Build and start the container:

   ```bash
   docker compose up --build
   ```

2. Visit `http://localhost:5173/`. Source changes on the host are mounted into the container, and the dev server restarts automatically.

To stop the environment, press `Ctrl+C` in the compose session or run `docker compose down`.

## Project structure

- `src/` – application entry point (`main.tsx`) and UI components (`App.tsx`, styles, assets)
- `public/` – static assets copied as-is to the served build
- `Dockerfile`, `docker-compose.yml` – container-based dev workflows
- `tsconfig*.json` – TypeScript project references for tooling and bundling