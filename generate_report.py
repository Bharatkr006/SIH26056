# generate_report.py
# Generates a self-contained HTML report with inline styling and embedded chart

import json
import base64
import os
import config
from datetime import datetime

# ==============================================================================
# HTML TEMPLATE (Single File, No External Deps)
# ==============================================================================
HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SIH Airfare Index - {route}</title>
    <style>
        :root {{
            --primary: #1e3a8a;
            --primary-light: #bfdbfe;
            --secondary: #0f172a;
            --accent: #10b981;
            --danger: #ef4444;
            --bg: #f8fafc;
            --card-bg: #ffffff;
            --border: #e2e8f0;
            --text-main: #334155;
            --text-light: #64748b;
        }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background-color: var(--bg);
            color: var(--text-main);
            margin: 0;
            padding: 0;
            line-height: 1.5;
        }}
        .container {{
            max-width: 1100px;
            margin: 0 auto;
            padding: 2rem;
        }}
        header {{
            background-color: var(--secondary);
            color: white;
            padding: 2rem 0;
            margin-bottom: 2rem;
            border-bottom: 4px solid var(--accent);
        }}
        .header-content {{
            max-width: 1100px;
            margin: 0 auto;
            padding: 0 2rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }}
        h1, h2, h3 {{ margin-top: 0; }}
        h1 {{ font-size: 1.8rem; margin-bottom: 0.5rem; }}
        .meta-badges {{ display: flex; gap: 1rem; flex-wrap: wrap; }}
        .badge {{
            background: rgba(255,255,255,0.1);
            padding: 0.4rem 0.8rem;
            border-radius: 4px;
            font-size: 0.85rem;
            font-family: monospace;
            border: 1px solid rgba(255,255,255,0.2);
        }}

        .grid {{
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1.5rem;
            margin-bottom: 2rem;
        }}
        .card {{
            background: var(--card-bg);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 1.5rem;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }}
        .card-full {{
            grid-column: 1 / -1;
        }}

        /* Metric block */
        .metric-row {{
            display: flex;
            gap: 2rem;
            align-items: flex-end;
            margin-bottom: 1rem;
        }}
        .metric {{
            display: flex;
            flex-direction: column;
        }}
        .metric-label {{
            font-size: 0.85rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: var(--text-light);
            font-weight: 600;
            margin-bottom: 0.25rem;
        }}
        .metric-value.huge {{
            font-size: 3.5rem;
            font-weight: 700;
            line-height: 1;
            color: var(--primary);
        }}
        .metric-value.huge.up {{ color: var(--danger); }}
        .metric-value.huge.down {{ color: var(--accent); }}

        .metric-value.large {{
            font-size: 1.8rem;
            font-weight: 600;
            line-height: 1.2;
        }}
        .trend-badge {{
            font-size: 1rem;
            font-weight: 600;
            padding: 0.25rem 0.75rem;
            border-radius: 1rem;
            margin-bottom: 0.5rem;
        }}
        .trend-up {{ background: #fef2f2; color: var(--danger); }}
        .trend-down {{ background: #ecfdf5; color: var(--accent); }}
        .trend-neutral {{ background: #f1f5f9; color: var(--text-light); }}

        /* Pipeline Steps */
        .pipeline {{
            display: flex;
            justify-content: space-between;
            background: var(--card-bg);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 1.5rem 2rem;
            margin-bottom: 2rem;
        }}
        .pipe-step {{
            text-align: center;
            position: relative;
            flex: 1;
        }}
        .pipe-step:not(:last-child)::after {{
            content: "→";
            position: absolute;
            right: -10px;
            top: 25px;
            font-size: 1.5rem;
            color: var(--border);
        }}
        .p-val {{ font-size: 2rem; font-weight: 700; color: var(--primary); }}
        .p-lbl {{ font-size: 0.85rem; color: var(--text-light); font-weight: 600; text-transform: uppercase; }}

        /* Chart Image */
        .chart-img {{
            width: 100%;
            border-radius: 4px;
            border: 1px solid var(--border);
        }}

        /* Data Table */
        table {{
            width: 100%;
            border-collapse: collapse;
            font-size: 0.9rem;
        }}
        th, td {{
            padding: 0.75rem 1rem;
            text-align: left;
            border-bottom: 1px solid var(--border);
        }}
        th {{
            background: #f8fafc;
            font-weight: 600;
            color: var(--text-light);
            text-transform: uppercase;
            font-size: 0.8rem;
        }}
        tbody tr:hover {{ background: #f1f5f9; }}
        td.num {{ text-align: right; font-family: monospace; font-size: 0.95rem; }}

        .outlier-tag {{
            display: inline-block;
            background: #fee2e2;
            color: #b91c1c;
            padding: 0.1rem 0.5rem;
            border-radius: 4px;
            font-size: 0.75rem;
            font-weight: bold;
            margin-left: 0.5rem;
        }}

        .methodology {{
            background: #f0fdf4;
            border: 1px solid #bbf7d0;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            font-size: 0.9rem;
            margin-top: 1rem;
        }}
        .methodology code {{
            background: rgba(0,0,0,0.05);
            padding: 0.2rem 0.4rem;
            border-radius: 4px;
            font-family: monospace;
        }}
    </style>
</head>
<body>

<header>
    <div class="header-content">
        <div>
            <h1>SIH End-to-End Pipeline Report</h1>
            <div class="meta-badges">
                <span class="badge">ROUTE: {route}</span>
                <span class="badge">LEAD: T+{lead}</span>
                <span class="badge">RUN: {run_time}</span>
            </div>
        </div>
        <div>
            <span style="opacity: 0.7; font-size: 0.9rem;">Source: {source}</span>
        </div>
    </div>
</header>

<div class="container">

    <!-- PIPELINE FUNNEL -->
    <div class="pipeline">
        <div class="pipe-step">
            <div class="p-val">{pipe_raw}</div>
            <div class="p-lbl">Raw Elements</div>
        </div>
        <div class="pipe-step">
            <div class="p-val">{pipe_clean}</div>
            <div class="p-lbl">Clean Segments</div>
        </div>
        <div class="pipe-step">
            <div class="p-val" style="color: var(--danger);">{pipe_outliers}</div>
            <div class="p-lbl">Outliers Filtered</div>
        </div>
        <div class="pipe-step">
            <div class="p-val" style="color: var(--accent);">{pipe_final}</div>
            <div class="p-lbl">Index Sample</div>
        </div>
    </div>

    <div class="grid">
        <!-- INDEX CARD -->
        <div class="card">
            <h3>Jevons Price Index</h3>
            <div class="metric-row">
                <div class="metric">
                    <span class="metric-value huge {trend_class}">{index_val}</span>
                </div>
                <div class="metric" style="padding-bottom: 0.5rem;">
                    {trend_html}
                    <span class="metric-label" style="text-transform: none;">Base = 100.0</span>
                </div>
            </div>

            <div class="methodology">
                <strong>Methodology:</strong> Elementary aggregate relative index.<br>
                Formula: <code>exp(&Sigma; ln(Price / Baseline) / n) &times; 100</code>
            </div>
        </div>

        <!-- STATS CARD -->
        <div class="card">
            <h3>Fare Statistics</h3>
            <table style="margin-top: 1rem; border-top: 1px solid var(--border);">
                <tbody>
                    <tr>
                        <td><strong>Fixed Baseline Ref.</strong></td>
                        <td class="num" style="color: var(--accent); font-weight: bold;">&#8377;{stat_base}</td>
                    </tr>
                    <tr>
                        <td>Current Median</td>
                        <td class="num">&#8377;{stat_median}</td>
                    </tr>
                    <tr>
                        <td>Arithmetic Mean</td>
                        <td class="num">&#8377;{stat_mean}</td>
                    </tr>
                    <tr>
                        <td>Lowest Available Fare</td>
                        <td class="num">&#8377;{stat_min}</td>
                    </tr>
                    <tr>
                        <td>Highest Valid Fare</td>
                        <td class="num">&#8377;{stat_max}</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- VISUALIZATION -->
        <div class="card card-full">
            <h3>Pipeline Visualization</h3>
            {chart_html}
        </div>

        <!-- DATA TABLE -->
        <div class="card card-full">
            <h3>Scraped Flights Ledger</h3>
            <p style="font-size: 0.85rem; color: var(--text-light); margin-top: -0.5rem; margin-bottom: 1rem;">
                Showing {pipe_final} valid flights and {pipe_outliers} filtered outliers.
            </p>

            <div style="overflow-x: auto;">
                <table>
                    <thead>
                        <tr>
                            <th>Flight</th>
                            <th>Airline</th>
                            <th>Dep/Arr</th>
                            <th class="num">Base (₹)</th>
                            <th class="num">Tax (₹)</th>
                            <th class="num">Total (₹)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {table_rows}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</div>

</body>
</html>
"""

def row_html(f, is_outlier=False):
    outlier_badge = '<span class="outlier-tag">FILTERED OUTLIER</span>' if is_outlier else ''
    total_style = "color: #b91c1c; font-weight: bold;" if is_outlier else "font-weight: 600;"
    row_bg = "background-color: #fef2f2;" if is_outlier else ""

    return f"""
        <tr style="{row_bg}">
            <td><strong>{f['flight_number']}</strong><br><span style="font-size:0.75rem; color:#64748b;">{f['cabin']} / {f['fare_class']}</span></td>
            <td>{f['airline']} {outlier_badge}</td>
            <td>{f['departure_time']} &rarr; {f['arrival_time']}<br><span style="font-size:0.75rem; color:#64748b;">{f['duration']}</span></td>
            <td class="num">{int(f['base_fare']):,}</td>
            <td class="num">{int(f['taxes']):,}</td>
            <td class="num" style="{total_style}">{int(f['total_fare']):,}</td>
        </tr>
    """

def run(data=None):
    print("\n[*] Generating HTML report...")

    if data is None:
        if not os.path.exists(config.LAST_RUN_RESULTS_FILE):
            print(f"[!] {config.LAST_RUN_RESULTS_FILE} not found. Cannot generate report.")
            return

        with open(config.LAST_RUN_RESULTS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)

    route = data.get("route", f"{config.ORIGIN}-{config.DESTINATION}")
    lead = data.get("lead_time", f"T+{config.LEAD_DAYS}").replace("T+", "")
    report_output_file = f"{config.OUTPUT_DIR}/report_{route}_T{lead}.html"
    chart_output_file = f"{config.OUTPUT_DIR}/fare_chart_{route}_T{lead}.png"

    stats = data["stats"]
    pipe = data["pipeline"]

    # 1. Format Jevons Trend
    j_idx = stats["jevons_index"]
    if j_idx > 100:
        trend_class = "up"
        trend_html = f'<div class="trend-badge trend-up">&uarr; +{j_idx-100:.2f}%</div>'
    elif j_idx < 100:
        trend_class = "down"
        trend_html = f'<div class="trend-badge trend-down">&darr; -{100-j_idx:.2f}%</div>'
    else:
        trend_class = ""
        trend_html = f'<div class="trend-badge trend-neutral">Flat</div>'

    # 2. Embed Chart (Base64)
    chart_html = '<div style="padding: 2rem; text-align: center; color: #64748b;">Chart generation failed or pending.</div>'
    target_chart = chart_output_file if os.path.exists(chart_output_file) else config.CHART_FILE
    if os.path.exists(target_chart):
        with open(target_chart, "rb") as cfile:
            b64 = base64.b64encode(cfile.read()).decode('utf-8')
            chart_html = f'<img src="data:image/png;base64,{b64}" class="chart-img" alt="Fare Charts">'

    # 3. Build Table Rows
    rows = []

    # Put outliers at the top so judges see them clearly
    for o in data.get("outliers", []):
        rows.append(row_html(o, is_outlier=True))

    for f in data.get("flights", []):
        rows.append(row_html(f, is_outlier=False))

    # 4. Render Template
    html = HTML_TEMPLATE.format(
        route=route.replace("-", "&rarr;"),
        lead=lead,
        run_time=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        source=config.SOURCE_NAME,

        pipe_raw=pipe["raw_segments"],
        pipe_clean=pipe["cleaned_flights"],
        pipe_outliers=pipe["filtered_outliers"],
        pipe_final=pipe["final_dataset"],

        index_val=f"{j_idx:.2f}",
        trend_class=trend_class,
        trend_html=trend_html,

        stat_base=f"{stats['baseline_fare']:,.0f}",
        stat_median=f"{stats['median_fare']:,.0f}",
        stat_mean=f"{stats['arithmetic_mean']:,.0f}",
        stat_min=f"{stats['min_fare']:,.0f}",
        stat_max=f"{stats['max_fare']:,.0f}",

        chart_html=chart_html,
        table_rows="\n".join(rows)
    )

    with open(report_output_file, "w", encoding="utf-8") as f:
        f.write(html)

    import shutil
    shutil.copy(report_output_file, config.HTML_REPORT_FILE)

    print(f"    [OK] Saved rich HTML report to {report_output_file}")

if __name__ == "__main__":
    run()
