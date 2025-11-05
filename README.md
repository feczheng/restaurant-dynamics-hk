# Hong Kong Restaurant Dynamics (2016–2025) — Interactive

A single-file web app for exploring restaurant counts by cuisine and year. Built with Plotly + PapaParse, no build step required. Perfect for GitHub Pages.

## Features
- Load CSVs from `./data/` (wide format: `year_cuisine_counts_wide.csv`, totals: `yearly_totals_summary.csv`)
- Filters: year range, Top N cuisines or manual selection
- Interactive views: total line, net change bar (first→last in range), indexed growth, YoY net additions, share trajectories, diversity over time, and a YoY table
- Export: download current chart as PNG, download filtered data as CSV
- No dependencies beyond two CDNs

## Data format
- `year_cuisine_counts_wide.csv` — columns: `__Year, <Cuisine1>, <Cuisine2>, ...` (integer counts)
- `yearly_totals_summary.csv` — columns: `__Year, restaurants`

## Quick start
1. Create a repo (e.g., `restaurant-dynamics-hk`).
2. Put `index.html` at repo root. Create `data/` folder and add:
   - `year_cuisine_counts_wide.csv`
   - `yearly_totals_summary.csv`
3. Commit and push.

## Enable GitHub Pages
- Go to **Settings → Pages**.
- Set **Build and deployment** to “Deploy from a branch”.
- Select branch (e.g. `main`) and folder `/ (root)`.
- Save, then open the Pages URL shown.

## Local test
Just open `index.html` in a local web server (optional):
```bash
python3 -m http.server 8080
# Then visit http://localhost:8080
```

---

MIT License © 2025
