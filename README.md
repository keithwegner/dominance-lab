# Dominance Lab

Dominance Lab is an interactive sports analytics explainer about why elite teams produce very different regular-season records across leagues.

It compares recent top regular-season teams from the NBA, NFL, NHL, MLB, and English Premier League, then uses simple visual models to show how sport structure affects dominance.

Live site: https://keithwegner.github.io/dominance-lab/

## What It Explores

A great team’s record is not just a measure of team quality. It is shaped by:

- Scoring frequency
- Possession or event volume
- Superstar leverage
- League parity rules
- Draw and overtime-loss systems
- Season length
- Single-game variance

The core idea: top records are greatness multiplied by format.

## Features

- Interactive league comparison dashboard
- Win percentage and points-share views
- League "DNA" radar chart
- Slider-based variance lab
- 600-season simulation
- 1,000-game upset arena
- Counterfactual sport-structure scenarios
- Source cards for the real-world records used

## Data And Model Notes

The displayed team records are sourced from recent completed regular seasons.

The radar chart, sliders, simulations, and counterfactuals are explanatory heuristics. They are designed to make the mechanics visible, not to predict future seasons or evaluate betting markets.

## Run Locally

This is a static single-file site. No build step is required.

Open `index.html` in a browser, or serve the folder locally:

```bash
python3 -m http.server 8000
```

## Deploy 

The site is intended to run on GitHub Pages from the repository root:

- Branch: main
- Folder: / (root)

## Sources

The app links to source pages for the selected league records inside the page itself.

## License
No license has been selected yet.


The most important section is the **Data And Model Notes** one. Since the page looks polished and quantitative, the README should be explicit that the simulations are explanatory heuristics, not official metrics or forecasts.
