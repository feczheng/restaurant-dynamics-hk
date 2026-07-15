# Hong Kong Licensed Restaurant Dynamics (January 2016–January 2025)

Static interactive companion to *The Uneven Geography of Cuisine Change: Hong Kong's Urban Restaurantscape, 2016–2025* (manuscript data version: 12 July 2026).

## Data scope

- Ten January snapshots of licensed restaurants from the Food and Environmental Hygiene Department (FEHD).
- OpenRice Hong Kong labels collected in 2025, plus manually verified online sources, supplement cuisine identification.
- Citywide totals include eight named cuisine categories and the residual `Other` category.
- Manuscript composition, tier, KDE and diversity analyses use the eight named cuisines and exclude `Other`.
- Source labels `Mainland China` and `Chinese Mainland` are aliases for the same cuisine and are merged as `Chinese Mainland`; `Other` contains only genuinely residual labels.
- Counts are licence-stock snapshots, not annual openings, closures, sales or real-time operating status.

The eight named cuisines are `Hong Kong-style`, `Western`, `Chinese Mainland`, `Japanese`, `Korean`, `Taiwanese`, `Vietnamese` and `Thai`.

## Interactive views

- Table and cuisine counts use exactly the checked series.
- Total licensed restaurants includes `Other` and respects the applied year window.
- Net change never adds unselected cuisines.
- YoY change compares each point with the previous natural January.
- Citywide named-cuisine shares always use the pooled eight-cuisine total as the denominator; `Other` is excluded.
- Tier diversity displays pooled Shannon entropy for annually reassigned Tiers 1–4 after the same alias merge. Fixed named-cuisine count cutoffs are Tier 1 ≥110, Tier 2 60–109, Tier 3 24–59, and Tier 4 ≤23 restaurants per DCCA-year. Effective cuisines shown in hover are `exp(H)`. The teaching page does not reproduce bootstrap sensitivity ribbons.

Filters use an explicit Apply step. `Named 8` selects the manuscript analytical categories, `All + Other` also selects the residual category, and `Clear` leaves no cuisine series selected.

## Data files

- `data/year_cuisine_counts_wide.csv`: canonical year-by-cuisine counts used by the page.
- `data/yearly_totals_summary.csv`: all licensed restaurants, including `Other`.
- `data/tier_diversity_2016_2025.csv`: annual tier-level pooled Shannon values and `exp(H)`.
- `data/cuisine_net_change_first_last.csv`: full-period net changes.
- `data/cuisine_yearly_counts_with_changes_2016_2025.csv`: annual counts and full-period change.
- `data/cuisine_yearly_counts_with_yoy_2016_2025.csv`: annual counts with YoY percentages.

Sanity-check totals for 2016–2025 are: `13,478`, `13,869`, `14,461`, `14,986`, `15,455`, `15,880`, `16,412`, `16,812`, `16,966`, `16,729`.

## Run locally

Serve the directory with any static web server. For example:

```bash
python3 -m http.server 8080
```

Then open `http://127.0.0.1:8080/`.
