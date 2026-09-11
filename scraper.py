"""
SIH AIRFARE PROTOTYPE: END-TO-END PIPELINE
Route: DEL -> BOM (Delhi to Mumbai)
Source: EaseMyTrip (Direct Booking Engine & Live AirBus API)
Lead Time: T+7 (7 Days in advance)

Pipeline stages:
1. Scraper: Headless automated browser queries DEL-BOM for T+7, captures API response.
2. Cleaner: Parses flights, standardizes airlines, handles 0-fares and non-direct flights.
3. Filter: Removes statistical outliers (IQR fencing).
4. Index: Computes true Route Geometric Mean (Jevons Index) against a fixed baseline.
5. Record: Persists raw and cleaned data.
6. Present: Terminal report, matplotlib charts (optional), generated HTML report.
"""

import os
import sys
import math
import csv
import json
from datetime import datetime, timedelta
from playwright.sync_api import sync_playwright

import config

# Force UTF-8 encoding on standard output for Windows compatibility
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Target Travel Date: T+7
TARGET_DATE = datetime.now() + timedelta(days=config.LEAD_DAYS)
DATE_STR_SLASH = TARGET_DATE.strftime("%d/%m/%Y")
DATE_STR_ISO = TARGET_DATE.strftime("%Y-%m-%d")

SEARCH_URL = (
    f"https://flight.easemytrip.com/FlightList/Index?"
    f"srch={config.ORIGIN}-Delhi-India|{config.DESTINATION}-Mumbai-India|{DATE_STR_SLASH}"
    f"&px=1-0-0&cbn=0&ar=undefined&isSplit=false&isFlexi=false"
)

# ANSI terminal colors (if supported, else degrading gracefully)
C_CYAN = '\033[96m'
C_GREEN = '\033[92m'
C_YELLOW = '\033[93m'
C_RED = '\033[91m'
C_BLUE = '\033[94m'
C_R = '\033[0m' # Reset
C_B = '\033[1m' # Bold

# ==============================================================================
# STAGE 1: SCRAPER
# ==============================================================================
def scrape_live_flights():
    print(f"\n{C_CYAN}{C_B}===== STAGE 1: SCRAPING LIVE FARE DATA ====={C_R}")
    print(f"[*] Source     : {config.SOURCE_NAME}")
    print(f"[*] Route      : {config.ORIGIN} -> {config.DESTINATION}")
    print(f"[*] Advance    : T+{config.LEAD_DAYS} days ({DATE_STR_ISO})")

    print("\n[>] Launching headless Playwright browser...")

    captured_payload = []

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=["--disable-blink-features=AutomationControlled"]
        )
        context = browser.new_context(
            viewport={"width": 1440, "height": 900},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
        )

        # Apply stealth to bypass bot detection (EaseMyTrip recently added this)
        context.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined
            });
        """)

        page = context.new_page()

        def handle_response(response):
            # EaseMyTrip changed their API domain and URL endpoint slightly
            if "airbus_new" in response.url.lower() or "airavail" in response.url.lower():
                try:
                    data = response.json()
                    captured_payload.append(data)
                    print(f"    {C_GREEN}[OK] API interception successful (200 OK){C_R}")
                except Exception:
                    pass

        page.on("response", handle_response)

        try:
            page.goto(SEARCH_URL, wait_until="load", timeout=45000)
        except Exception:
            pass

        # Give the API request a moment to populate if page loading was delayed
        for _ in range(10):
            if captured_payload:
                break
            page.wait_for_timeout(1000)

        browser.close()

    if not captured_payload:
        if os.path.exists("emt_response.json"):
            print(f"    {C_YELLOW}[!] Network timeout. Loading cached live data (emt_response.json)...{C_R}")
            with open("emt_response.json", "r", encoding="utf-8") as f:
                return json.load(f)
        raise RuntimeError("Failed to capture live flight data from network.")

    return captured_payload[0]

# ==============================================================================
# STAGE 2: CLEANING & VALIDATION
# ==============================================================================
def clean_flight_data(raw_data):
    print(f"\n{C_CYAN}{C_B}===== STAGE 2: DATA CLEANING ====={C_R}")

    flt_details = raw_data.get("dctFltDtl", {})
    clean_records = []
    skipped_records = 0

    airline_name_map = {
        "6E": "IndiGo", "SG": "SpiceJet", "AI": "Air India",
        "IX": "Air India Express", "QP": "Akasa Air",
        "UK": "Vistara", "I5": "AirAsia India"
    }

    raw_segments = 0
    for item in raw_data.get("j", []):
        for s in item.get("s", []):
            total_fare = s.get("TotalFare") or s.get("TF") or 0
            total_tax = s.get("TotalTax") or s.get("TT") or 0
            base_fare = s.get("AdultPrice") or s.get("AP") or (total_fare - total_tax if total_fare and total_tax else total_fare)
            seat_avail = s.get("SeatAvailablity") or s.get("SeatAv") or "Available"

            for b in s.get("b", []):
                raw_segments += 1
                fl_keys = b.get("FL", [])
                for k in fl_keys:
                    flt = flt_details.get(str(k), {})
                    airline_code = flt.get("AC", "").strip()
                    airline_full = airline_name_map.get(airline_code, airline_code or "Other")
                    flight_num = f"{airline_code}-{flt.get('FN', '').strip()}"
                    origin = flt.get("OG", "").strip()
                    dest = flt.get("DT", "").strip()
                    dep_time = flt.get("DTM", "").strip()
                    arr_time = flt.get("ATM", "").strip()
                    duration = flt.get("DUR", "").strip() or b.get("JyTm", "").strip()
                    cabin = flt.get("CB", "ECONOMY").strip()
                    fare_class = flt.get("FCLS", "Standard").strip()

                    # Filter non-direct segments
                    if origin != config.ORIGIN or dest != config.DESTINATION:
                        skipped_records += 1
                        continue

                    try:
                        total_fare = float(total_fare)
                        base_fare = float(base_fare)
                        total_tax = float(total_tax)
                    except (ValueError, TypeError):
                        skipped_records += 1
                        continue

                    if total_fare <= 0:
                        skipped_records += 1
                        continue

                    status = "Available"
                    if str(seat_avail).strip() in ["0", "Sold Out", "None"]:
                        status = "Sold Out"

                    clean_records.append({
                        "timestamp": datetime.now().isoformat(timespec="seconds"),
                        "source": config.SOURCE_NAME,
                        "origin": origin,
                        "destination": dest,
                        "lead_time": f"T+{config.LEAD_DAYS}",
                        "travel_date": DATE_STR_ISO,
                        "airline": airline_full,
                        "flight_number": flight_num,
                        "departure_time": dep_time,
                        "arrival_time": arr_time,
                        "duration": duration,
                        "cabin": cabin,
                        "fare_class": fare_class,
                        "base_fare": base_fare,
                        "taxes": total_tax,
                        "total_fare": total_fare,
                        "seats_available": seat_avail,
                        "status": status
                    })

    # Deduplicate
    seen = set()
    deduped_records = []
    for r in clean_records:
        key = (r["flight_number"], r["departure_time"], r["total_fare"])
        if key not in seen:
            seen.add(key)
            deduped_records.append(r)

    print(f"[*] Raw Flight Segments  : {raw_segments}")
    print(f"[*] Non-Direct Skipped   : {raw_segments - len(deduped_records)}")
    print(f"[*] {C_GREEN}Valid Direct Flights : {len(deduped_records)}{C_R}")

    return deduped_records, raw_segments

# ==============================================================================
# STAGE 3: OUTLIER FILTERING
# ==============================================================================
def filter_outliers_iqr(flights):
    print(f"\n{C_CYAN}{C_B}===== STAGE 3: OUTLIER FILTERING (IQR) ====={C_R}")
    if not flights:
        return flights, []

    fares = sorted(f["total_fare"] for f in flights if f["status"] == "Available")
    if not fares:
         fares = sorted(f["total_fare"] for f in flights)

    # Need at least 4 items for IQR to make sense
    if len(fares) < 4:
        print("[!] Too few flights to filter. Skipping IQR fence.")
        return flights, []

    q1 = fares[len(fares) // 4]
    q3 = fares[3 * len(fares) // 4]
    iqr = q3 - q1
    lower_fence = q1 - config.IQR_MULTIPLIER * iqr
    upper_fence = q3 + config.IQR_MULTIPLIER * iqr

    kept = []
    removed = []
    for f in flights:
        if lower_fence <= f["total_fare"] <= upper_fence:
            kept.append(f)
        else:
            removed.append(f)

    print(f"[*] IQR Fence            : Rs. {lower_fence:,.0f} ~ Rs. {upper_fence:,.0f}")
    print(f"[*] Outliers Removed     : {C_RED}{len(removed)}{C_R} flights")
    print(f"[*] Clean Flights Kept   : {C_GREEN}{len(kept)}{C_R} flights")

    if removed:
        print("    " + ", ".join([f"{f['airline']} {f['flight_number']} (Rs.{f['total_fare']:,.0f})" for f in removed]))

    return kept, removed

# ==============================================================================
# STAGE 4: INDEX CALCULATION (Jevons Price Index)
# ==============================================================================
def get_baseline_fare(current_median):
    """Loads fixed baseline, or falls back to default reference."""
    if os.path.exists(config.BASELINE_FILE):
        try:
            with open(config.BASELINE_FILE, "r") as f:
                data = json.load(f)
                return float(data.get("baseline_fare", config.DEFAULT_BASELINE_FARE))
        except Exception:
            pass

    # Default to fixed external baseline (e.g. 6,500.0)
    return config.DEFAULT_BASELINE_FARE


def calculate_airfare_index(flights):
    print(f"\n{C_CYAN}{C_B}===== STAGE 4: AIRFARE INDEX COMPUTATION (JEVONS) ====={C_R}")

    if not flights:
        print("[!] No flight data available for index calculation.")
        return None

    fares = [f["total_fare"] for f in flights if f["status"] == "Available"]
    if not fares:
        fares = [f["total_fare"] for f in flights]

    n = len(fares)
    sorted_fares = sorted(fares)

    min_fare = sorted_fares[0]
    max_fare = sorted_fares[-1]
    median_fare = sorted_fares[n // 2] if n % 2 != 0 else (sorted_fares[n // 2 - 1] + sorted_fares[n // 2]) / 2.0
    arithmetic_mean = sum(fares) / n

    # STAGE 4 FIX: Use a fixed baseline instead of the current median
    fixed_baseline = get_baseline_fare(median_fare)

    # Proper Jevons Index: exp((1/n) * sum(ln(P_i / P_base))) * 100
    log_relatives_sum = sum(math.log(p / fixed_baseline) for p in fares)
    jevons_index = math.exp(log_relatives_sum / n) * 100.0

    print(f"[*] Sample Size Evaluated: {n}")
    print(f"[*] Minimum Fare         : Rs. {min_fare:,.2f}")
    print(f"[*] Maximum Fare         : Rs. {max_fare:,.2f}")
    print(f"[*] Fixed Base Reference : Rs. {fixed_baseline:,.2f} (Index = 100.0)")
    print(f"[*] Computed Route Median: Rs. {median_fare:,.2f}")
    print(f"[*] Arithmetic Mean      : Rs. {arithmetic_mean:,.2f}")
    print("-" * 50)

    if jevons_index > 100.0:
        index_str = f"{C_RED}{jevons_index:.2f}{C_R}"
        trend = f"{C_RED}▲ +{jevons_index-100:.2f}%{C_R}"
    elif jevons_index < 100.0:
        index_str = f"{C_GREEN}{jevons_index:.2f}{C_R}"
        trend = f"{C_GREEN}▼ -{100-jevons_index:.2f}%{C_R}"
    else:
        index_str = f"{jevons_index:.2f}"
        trend = "Neutral"

    print(f"[*] {C_B}JEVONS PRICE INDEX: {index_str} (Base = 100.0) {trend}{C_B}{C_R}")
    print("-" * 50)

    # Sub-day buckets
    buckets = {"Morning": [], "Afternoon": [], "Evening": []}
    for f in flights:
        try:
            hour = int(f["departure_time"].split(":")[0])
            if 4 <= hour < 12: buckets["Morning"].append(f["total_fare"])
            elif 12 <= hour < 17: buckets["Afternoon"].append(f["total_fare"])
            else: buckets["Evening"].append(f["total_fare"])
        except Exception:
            pass

    for k, v in buckets.items():
        if v:
            print(f"    - {k:<10} (N={len(v):>2})  : Rs. {sum(v)/len(v):,.2f}")

    return {
        "timestamp": datetime.now().isoformat(),
        "sample_size": n,
        "min_fare": min_fare,
        "max_fare": max_fare,
        "median_fare": median_fare,
        "arithmetic_mean": arithmetic_mean,
        "baseline_fare": fixed_baseline,
        "jevons_index": jevons_index
    }

# ==============================================================================
# TERMINAL TABLE OUTPUT
# ==============================================================================
def print_flight_table(flights, limit=12):
    print(f"\n{C_CYAN}{C_B}===== FLIGHT LEDGER PREVIEW ====={C_R}")

    print("┌──────────────┬──────────────────┬───────┬───────┬───────┬────────────┐")
    print("│ Flight       │ Airline          │ Dep   │ Arr   │ Class │ Total Fare │")
    print("├──────────────┼──────────────────┼───────┼───────┼───────┼────────────┤")

    for f in flights[:limit]:
        flight_str = f"{f['flight_number']:<12}"
        air_str = f"{f['airline'][:16]:<16}"
        dep = f"{f['departure_time']:<5}"
        arr = f"{f['arrival_time']:<5}"
        cls = f"{f['fare_class']:<5}"
        fare = f"Rs {f['total_fare']:,.0f}"

        print(f"│ {flight_str} │ {air_str} │ {dep} │ {arr} │ {cls} │ {fare:>10} │")

    print("└──────────────┴──────────────────┴───────┴───────┴───────┴────────────┘")
    if len(flights) > limit:
        print(f"... and {len(flights) - limit} more flights logged.")

# ==============================================================================
# MAIN PIPELINE
# ==============================================================================
def main():
    print(f"\n{C_B}{C_BLUE}{'#' * 70}")
    print("✈️ SIH AIRFARE MONITORING SYSTEM - PIPELINE RUNNER".center(70))
    print(f"{'#' * 70}{C_R}")

    # Stage 1: Scrape
    raw_data = scrape_live_flights()

    # Stage 2: Clean
    clean_flights, raw_segment_count = clean_flight_data(raw_data)
    if not clean_flights:
        print("[!] Error: No valid flights found after cleaning.")
        sys.exit(1)

    # Stage 3: Filter Outliers (IQR)
    filtered_flights, removed_flights = filter_outliers_iqr(clean_flights)
    active_dataset = filtered_flights if filtered_flights else clean_flights

    # Preview Table
    print_flight_table(active_dataset, limit=10)

    # Stage 4: Index
    stats = calculate_airfare_index(active_dataset)

    # Save CSV
    file_exists = os.path.exists(config.CSV_FILE)
    if active_dataset:
        with open(config.CSV_FILE, "a", newline="", encoding="utf-8") as f:
            if active_dataset:
                writer = csv.DictWriter(f, fieldnames=list(active_dataset[0].keys()))
                if not file_exists:
                    writer.writeheader()
                for row in active_dataset:
                    writer.writerow(row)
        print(f"[OK] Appended {len(active_dataset)} records to {config.CSV_FILE}")

    # Save JSON context for generator/chart scripts
    run_state = {
        "stats": stats,
        "pipeline": {
            "raw_segments": raw_segment_count,
            "cleaned_flights": len(clean_flights),
            "filtered_outliers": len(removed_flights),
            "final_dataset": len(active_dataset)
        },
        "flights": active_dataset,
        "outliers": removed_flights
    }

    os.makedirs(config.OUTPUT_DIR, exist_ok=True)
    with open(config.LAST_RUN_RESULTS_FILE, "w", encoding="utf-8") as f:
        json.dump(run_state, f, indent=2)

    # Next stages: Trigger reporting scripts here...
    try:
        import generate_chart
        generate_chart.run()
    except Exception as e:
        print(f"[!] Failed to generate chart: {e}")

    try:
        import generate_report
        generate_report.run()
    except Exception as e:
        print(f"[!] Failed to generate HTML report: {e}")

    print(f"\n{C_GREEN}{C_B}[+] DATA PIPELINE COMPLETE. JEVONS: {stats['jevons_index']:.2f}{C_R}\n")

if __name__ == "__main__":
    main()
