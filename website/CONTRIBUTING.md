# Contributing to Foxnox

## Documentation Website

The documentation site lives in `website/` and is built with [VitePress](https://vitepress.dev/). Content files are Markdown documents under `website/docs/guide/`. The sidebar and navigation are configured in `website/docs/.vitepress/config.mjs`.

### Start the dev server

```sh
./scripts/start-dev.sh
```

This starts all services including the `website` container. The VitePress dev server runs inside the container with the `website/docs/` folder mounted as a live volume, so any change to a `.md` file or to `config.mjs` is reflected immediately. The site is available via the Traefik proxy at `http://localhost:8100/docs/`.

To run it outside Docker instead:

```sh
cd website
npm install
npm run dev
```

### Build for production

```sh
./scripts/build-prod.sh website
```

Builds the `website` production image using `website/dockerfile.prod`. The production container runs nginx and serves the pre-built static files under `/docs`. The build sets `VITEPRESS_BASE=/docs/` so asset URLs match the nginx location; override that variable if you serve the site from a different path.

### Adding or editing pages

| Task | What to do |
|---|---|
| Edit an existing page | Edit the corresponding `.md` file in `website/docs/guide/` |
| Add a new page | Create a `.md` file and register it in the `sidebar` array in `website/docs/.vitepress/config.mjs` |
| Change top-level navigation | Edit the `nav` array in `config.mjs` |
| Change the site title or description | Edit the `title` / `description` fields in `config.mjs` |
| Replace the logo or favicon | Edit `website/docs/public/logo.svg` / `favicon.svg` |
