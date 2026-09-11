# generate_chart.py
# Generates the visual pipeline and fare distribution charts

import json
import os
import matplotlib
matplotlib.use('Agg')  # Headless backend (no display needed)
import matplotlib.pyplot as plt
import matplotlib.ticker as ticker
import config

def format_rupees(x, pos):
    """Format tick labels with Rupee symbol and commas."""
    return f"₹{int(x):,}"

def run(data=None):
    print("\n[*] Generating charts...")

    if data is None:
        if not os.path.exists(config.LAST_RUN_RESULTS_FILE):
            print(f"[!] {config.LAST_RUN_RESULTS_FILE} not found. Cannot generate chart.")
            return
        with open(config.LAST_RUN_RESULTS_FILE, "r") as f:
            data = json.load(f)

    flights = data.get("flights", [])
    if not flights:
        print("[!] No flight data to chart.")
        return

    route = data.get("route", f"{config.ORIGIN}-{config.DESTINATION}")
    lead_time = data.get("lead_time", f"T+{config.LEAD_DAYS}").replace("+", "")
    chart_output_file = f"{config.OUTPUT_DIR}/fare_chart_{route}_{lead_time}.png"

    stats = data["stats"]
    outliers = data.get("outliers", [])

    fares = [f["total_fare"] for f in flights]
    outlier_fares = [o["total_fare"] for o in outliers]
    all_fares = fares + outlier_fares

    baseline = stats["baseline_fare"]

    # Process airlines for bar chart
    airline_fares = {}
    for f in flights:
        al = f["airline"]
        if al not in airline_fares:
            airline_fares[al] = []
        airline_fares[al].append(f["total_fare"])

    # Figure Layout: 1 row, 2 columns (widen right column slightly)
    # We drop the funnel to keep it less cluttered; 2 panels is cleaner.
    fig = plt.figure(figsize=(12, 5))

    # ----------------------------------------------------
    # Panel 1: Histogram (Fare Distribution + Outliers)
    # ----------------------------------------------------
    ax1 = plt.subplot(1, 2, 1)

    bins = 15
    ax1.hist(fares, bins=bins, color='#3b82f6', edgecolor='white', alpha=0.8, label='Clean Fares')

    if outlier_fares:
        ax1.scatter(outlier_fares, [1]*len(outlier_fares), color='#ef4444',
                    marker='X', s=100, zorder=5, label=f'Outliers (n={len(outliers)})')

    # Add baseline reference line
    ax1.axvline(x=baseline, color='#10b981', linestyle='--', linewidth=2,
                label=f'Fixed Baseline (₹{baseline:,.0f})')

    ax1.set_title(f"Fare Distribution ({route} T{lead_time})",
                  fontweight='bold', pad=15)
    ax1.set_xlabel("Total Fare")
    ax1.set_ylabel("Number of Flights")

    # Format X axis to Rupees
    ax1.xaxis.set_major_formatter(ticker.FuncFormatter(format_rupees))
    ax1.grid(axis='y', linestyle=':', alpha=0.6)
    ax1.legend(loc='upper right', frameon=True, fontsize='small')
    ax1.spines['top'].set_visible(False)
    ax1.spines['right'].set_visible(False)

    # ----------------------------------------------------
    # Panel 2: Box Plot by Airline
    # ----------------------------------------------------
    ax2 = plt.subplot(1, 2, 2)

    airline_names = sorted(airline_fares.keys())
    airline_prices = [airline_fares[al] for al in airline_names]

    # Create horizontal boxplot
    bp = ax2.boxplot(airline_prices, vert=False, patch_artist=True,
                     medianprops={'color': '#1e3a8a', 'linewidth': 2},
                     flierprops={'marker': 'o', 'markerfacecolor': '#94a3b8', 'markersize': 4})

    # Color the boxes
    for patch in bp['boxes']:
        patch.set_facecolor('#bfdbfe')
        patch.set_edgecolor('#3b82f6')

    ax2.set_yticklabels(airline_names)

    # Add baseline reference line
    ax2.axvline(x=baseline, color='#10b981', linestyle='--', linewidth=2, zorder=0)

    ax2.set_title("Fare Spread by Airline", fontweight='bold', pad=15)
    ax2.set_xlabel("Total Fare")

    # Format X axis to Rupees
    ax2.xaxis.set_major_formatter(ticker.FuncFormatter(format_rupees))
    ax2.grid(axis='x', linestyle=':', alpha=0.6)
    ax2.spines['top'].set_visible(False)
    ax2.spines['right'].set_visible(False)

    # Clean layout and save
    plt.tight_layout(pad=2.0)

    os.makedirs(config.OUTPUT_DIR, exist_ok=True)
    plt.savefig(chart_output_file, dpi=150, bbox_inches='tight')
    plt.close()

    # Create legacy symlink or copy for backward comp
    import shutil
    shutil.copy(chart_output_file, config.CHART_FILE)

    print(f"    [OK] Saved chart to {chart_output_file}")

if __name__ == "__main__":
    run()
