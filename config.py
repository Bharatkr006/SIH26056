# config.py
# SIH Airfare Prototype - Configuration Constants

# Route-specific baselines
BASELINES = {
    "DEL-BOM": 6500.0,
    "DEL-BLR": 8500.0,
    "BOM-BLR": 5500.0
}
DEFAULT_BASELINE_FARE = 6500.0

ROUTES = [
    {"origin": "DEL", "destination": "BOM", "city_origin": "Delhi-India", "city_dest": "Mumbai-India"},
    {"origin": "DEL", "destination": "BLR", "city_origin": "Delhi-India", "city_dest": "Bangalore-India"},
    {"origin": "BOM", "destination": "BLR", "city_origin": "Mumbai-India", "city_dest": "Bangalore-India"}
]

LEAD_TIMES = [1, 7, 15]

# Legacy Defaults (for backward compatibility if needed)
ORIGIN = "DEL"
DESTINATION = "BOM"
LEAD_DAYS = 7
SOURCE_NAME = "EaseMyTrip"

IQR_MULTIPLIER = 1.5

BASELINE_FILE = "baseline.json"
CSV_FILE = "fares.csv"
OUTPUT_DIR = "output"
LAST_RUN_RESULTS_FILE = f"{OUTPUT_DIR}/latest_run.json"
SUMMARY_JSON_FILE = f"{OUTPUT_DIR}/summary.json"
HTML_REPORT_FILE = f"{OUTPUT_DIR}/report.html"
CHART_FILE = f"{OUTPUT_DIR}/fare_chart.png"
