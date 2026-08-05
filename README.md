# NV ID Studio

> **FOR EDUCATIONAL USE ONLY** — see [LICENSE](LICENSE) for full terms.

A browser-based card layout design tool for studying ID card design, typography, barcode encoding, and print layout. Built with React + Vite.

## Live Demo

**GitHub Pages:** https://an1mal5.github.io/AAMVANV/

## Features

- Front & back card canvas rendering
- Draggable text anchor editor with font-size and bold controls
- Anchor positions saved to `localStorage` across sessions
- Eye/hair color dropdowns with standard abbreviation codes
- Signature pad + AI background removal for photos
- PDF export (front + back centered on US Letter paper at CR80 card size)
- PDF417 barcode generation

## Running Locally

```bash
npm install
npm run dev
```

Open http://localhost:5000

## Building for Production

```bash
npm run build
```

Output goes to `dist/`. The app is pre-configured to deploy to GitHub Pages at `/AAMVANV/`.

## Deployment

Push to `main` — the GitHub Actions workflow in `.github/workflows/deploy.yml` automatically builds and deploys to GitHub Pages.

**One-time setup:** In your GitHub repo → Settings → Pages → Source → set to **GitHub Actions**.

## License

[Educational Use License](LICENSE) — not for commercial or fraudulent use.
