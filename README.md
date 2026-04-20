# appendpage / web

The default frontend for [append.page](https://append.page).

This is **one viewer**, not THE viewer. The whole point of [append.page](https://append.page) is that the data layer (the append-only chain) and the presentation layer (this app) are decoupled — the chain doesn't care what renders it.

If you want a different viewer, **fork this repo** and ask your coding agent to redesign it. The wire format and API are documented at <https://append.page/AGENTS.md>. Set `APPEND_PAGE_API_URL` in `.env` to point at any spec-compatible backend (the official one at `https://append.page`, your own fork, a local dev instance, whatever).

## Quick start

```bash
cp .env.example .env
# edit .env: APPEND_PAGE_API_URL=https://append.page (or your own backend)
npm install
npm run codegen-types   # fetches /api/spec.json from APPEND_PAGE_API_URL and writes types
npm run dev
```

## Fork the viewer with a coding agent

```bash
git clone https://github.com/appendpage/web my-viewer
cd my-viewer
# open in your IDE; tell your agent to read README + AGENTS.md and redesign
```

The view-switcher pill bar (`AI view / Chronological / Raw JSONL`) is the contract you should keep — it's what makes the data/presentation disaggregation visible. Everything else is yours.

## License

MIT. See [`LICENSE`](./LICENSE).
