# TPV efficiency and LCOE

Interactive thermophotovoltaic efficiency, electrical power density and levelized cost of electricity explorer.

## Contents

- `index.html`: interactive chart and economic/custom-cell controls.
- `data.html`: numerical data and links to the original publications.
- `data/`: literature records, original 114-row comparison table, original-publication metadata and 51 previously calculated Si temperatures.
- `model.js`: LCOE calculations and numerical validation.
- `app.js`: controls, SVG rendering and CSV/SVG exports.

The application is static HTML/CSS/JavaScript and has no external runtime dependencies.

## GitHub Pages

Create a **public** repository, upload this folder's contents and keep `index.html` at the repository root.

For the simplest deployment, open **Settings > Pages**, select **Deploy from a branch**, then **main / (root)** and save. The `.nojekyll` file preserves the static assets without Jekyll processing.

Alternatively, select **GitHub Actions** as the Pages source to use the included workflow. It checks the numerical model, stages only the website assets, and deploys them through the official GitHub Pages actions.

The final website address is shown in the repository's Pages settings. No custom domain, database or paid server is required for a public repository on GitHub Free.

## Local checks

```sh
node check-model.cjs
python scripts/stage_site.py
python -m http.server 8765 --directory _site
```

Open `http://localhost:8765/`.

## Data and calculation

The chart retains 19 literature coordinates and one Lin-based Si TPV model point. A custom cell can be edited separately. All literature sources link to their original publisher or author-hosted manuscript.

LCOE = 1000 * CRF * CPA / (8760 * CF * Pout) + (LCOH / 100) / (eta / 100).

Units: LCOE $/kWh_e; LCOH cents/kWh_th; CPA $/cm2; Pout W/cm2; eta percent. CRF is fixed at 0.074.

The Lin point is a TPV model prediction based on solar-cell parameters, not a TPV measurement from the original paper. It is selected at the maximum baseline LCOE among 51 Si temperatures: 1600 K, eta = 18.3670331394%, Pout = 0.224289070919 W/cm2. The temperature remains fixed when changing economic inputs.

Literature performance coordinates are retained from the supplied compilation. Reported projections are noted in the record metadata. Only cell capital and heat costs are included.

Official deployment documentation: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
