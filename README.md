# Chroma – Modal Temperament Designer

Chroma is a pure frontend React + TypeScript application for sketching modal temperaments and exporting retuning data for MIDI instruments. Version 1.0 ships with interval authoring, octave-normalised pitch mapping, drag-and-drop editing, and automated autofill from interval definitions.

## Features

- **Interval workspace** – define arbitrarily complex expressions per interval, with live evaluation, octave normalisation, disable toggles, and drag-and-drop ordering.
- **Autofill engine** – collapse interval data into a 12-note pitch lattice while deduplicating, prioritising closest octave matches, and respecting locked tonic rows.
- **Pitch table** – inspect target vs. standard frequencies, cent offsets, and per-note expressions; edit descriptions and expressions inline; reset rows individually or via autofill.
- **Config ribbon** – change concert pitch or key frequency, set the display range, and swap reference anchors (Concert A vs. key frequency) with live recalculation.
- **Modern tooling** – Vite bundler, ESLint, TypeScript, and optional Docker workflow for reproducible dev environments.

## Getting Started

### Prerequisites

- Node.js ≥ 18.20 (20.x or 22.x recommended)
- npm ≥ 9
- Docker & Docker Compose (optional, for containerised development)

### Local Development

```bash
npm install
npm run dev
```

Visit `http://localhost:5173/` to interact with the app. File changes inside `src/` enable hot reloading.

### Quality & Build

- `npm run lint` – static analysis via ESLint
- `npm run build` – type-check and produce the production bundle (`dist/`)

### Docker Dev Environment (optional)

```bash
docker compose up --build
```

Browser sync runs at `http://localhost:5173/`. Stop with `Ctrl+C` or `docker compose down`.

## Deployment

Production assets are emitted to `dist/`. Use the provided `build-prod.bat` (Windows) or the Vite CLI directly:

```bash
npm run build
```

Serve `dist/` behind any static host (Vite preview, Nginx, S3, Netlify, etc.).

## Project Structure

- `src/` – React entry (`main.tsx`) plus UI (`App.tsx`), styles, and assets
- `public/` – static files copied as-is
- `Dockerfile`, `docker-compose.yml` – container setup for development
- `tsconfig*.json` – TypeScript project references
- `build-prod.bat` – helper script to produce a fresh `dist/` bundle on Windows