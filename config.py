# config.py
# SIH Airfare Prototype - Configuration Constants

# Hardcoded reference baseline for DEL-BOM economy (approx Q3 2026 median)
# This prevents the index from being self-referential (always ~100).
DEFAULT_BASELINE_FARE = 6500.0

# Route configuration
ORIGIN = "DEL"
DESTINATION = "BOM"
LEAD_DAYS = 7
SOURCE_NAME = "EaseMyTrip"

# Outlier filtering parameters
# IQR_MULTIPLIER = 1.5 is standard (Q1 - 1.5*IQR to Q3 + 1.5*IQR)
IQR_MULTIPLIER = 1.5

# File paths
BASELINE_FILE = "baseline.json"
CSV_FILE = "fares.csv"
OUTPUT_DIR = "output"
LAST_RUN_RESULTS_FILE = f"{OUTPUT_DIR}/latest_run.json"
HTML_REPORT_FILE = f"{OUTPUT_DIR}/report.html"
CHART_FILE = f"{OUTPUT_DIR}/fare_chart.png"
