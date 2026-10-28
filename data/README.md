# TPV chart data

- dataset.json: 19 literature records and one Si HJT TPV point predicted in this work, including original-publication links.
- bibliography.json: original article titles, publisher URLs, DOIs and metadata verification sources.
- original_representative_114.csv: unchanged source table (19 studies, six economic scenarios).
- lin_si_temperature_scan.csv: 51 previously calculated Si temperatures and baseline selection costs.

LCOE = 1000 * 0.074 * CPA / (8760 * CF * Pout) + (LCOH_cent / 100) / (eta_pct / 100).

Units: LCOE $/kWh_e; LCOH cents/kWh_th; CPA $/cm2; Pout W/cm2; eta percent.
The Si HJT point is a project TPV prediction based on solar-cell parameters, not a TPV measurement from the paper.
Literature performance coordinates are preserved. Schulte and Dashiell include projected performance; see record source_note.
Changing economic inputs changes LCOE only. Bubble scale remains fixed to the original 114-row cost range; out-of-range sizes are clipped without changing reported costs. Zero cost uses the maximum bubble size.
Custom inputs are CPA, Pout and Qabs. The Pout and Qabs sliders are linear and start at zero. Calculations require Qabs >= Pout > 0; zero values are displayed without plotting an undefined custom result.
Only cell capital and heat costs are included; optical hardware, packaging, cooling and operation costs are excluded.

Bubble area is A=16+6384u^5 pt², with u the inverse-normalized log10(LCOE) in the fixed original cost range. Legend circles use the same mapping.
