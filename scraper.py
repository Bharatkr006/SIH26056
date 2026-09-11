"""
SIH AIRFARE PROTOTYPE: MULTI-ROUTE / MULTI-LEAD-TIME PIPELINE
Supports configurable routes and lead times via config.py
Routes: DEL→BOM, DEL→BLR, BOM→BLR
Lead Times: T+1, T+7, T+15

Pipeline stages:
1. Scraper: Headless automated browser queries route for specified lead time, captures API response.
2. Cleaner: Parses flights, standardizes airlines, handles 0-fares and non-direct flights.
3. Filter: Removes statistical outliers (IQR fencing).
4. Index: Computes true Route Geometric Mean (Jevons Index) against route-specific baseline.
5. Record: Persists raw and cleaned data with route/lead-time tagging.
6. Present: Terminal report, matplotlib charts (optional), generated HTML report.

CLI Usage:
    python scraper.py                  # Run all routes × all lead times (3×3 matrix)
    python scraper.py DEL-BOM 7        # Run single route with lead time 7
    python scraper.py DEL-BLR 15       # Run single route with lead time 15
"""

import os
import sys
import math
import csv
import json
from datetime import datetime, timedelta
from playwright.sync_api import sync_playwright
import argparse

import config

# Force UTF-8 encoding on standard output for Windows compatibility
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

# ANSI terminal colors (if supported, else degrading gracefully)
C_CYAN = '\033[96m'
C_GREEN = '\033[92m'
C_YELLOW = '\033[93m'
C_RED = '\033[91m'
C_BLUE = '\033[94m'
C_R = '\033[0m' # Reset
C_B = '\033[1m' # Bold

# ==============================================================================
# STAGE 1: SCRAPER (Parameterized)
# ==============================================================================
def scrape_live_flights(route_cfg, lead_days):
    """
    Scrape live flight data for a specific route and lead time.

    Args:
        route_cfg: dict with keys {origin, destination, city_origin, city_dest}
        lead_days: int, days in advance (e.g., 1, 7, 15)

    Returns:
        dict: Raw API response from EaseMyTrip
    """
    origin = route_cfg["origin"]
    destination = route_cfg["destination"]
    city_origin = route_cfg["city_origin"]
    city_dest = route_cfg["city_dest"]

    target_date = datetime.now() + timedelta(days=lead_days)
    date_str_slash = target_date.strftime("%d/%m/%Y")
    date_str_iso = target_date.strftime("%Y-%m-%d")

    search_url = (
        f"https://flight.easemytrip.com/FlightList/Index?"
        f"srch={origin}-{city_origin}|{destination}-{city_dest}|{date_str_slash}"
        f"&px=1-0-0&cbn=0&ar=undefined&isSplit=false&isFlexi=false"
    )

    print(f"\n{C_CYAN}{C_B}===== STAGE 1: SCRAPING LIVE FARE DATA ====={C_R}")
    print(f"[*] Source     : {config.SOURCE_NAME}")
    print(f"[*] Route      : {origin} → {destination}")
    print(f"[*] Advance    : T+{lead_days} days ({date_str_iso})")
    print(f"[*] URL        : {search_url[:80]}...")

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

        # Apply stealth to bypass bot detection
        context.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined
            });
        """)

        page = context.new_page()

        def handle_response(response):
            if "airbus_new" in response.url.lower() or "airavail" in response.url.lower():
                try:
                    data = response.json()
                    captured_payload.append(data)
                    print(f"    {C_GREEN}[OK] API interception successful (200 OK){C_R}")
                except Exception:
                    pass

        page.on("response", handle_response)

        try:
            page.goto(search_url, wait_until="load", timeout=45000)
        except Exception:
            pass

        # Give the API request a moment to populate if page loading was delayed
        for _ in range(10):
            if captured_payload:
                break
            page.wait_for_timeout(1000)

        browser.close()

    if not captured_payload:
        cache_file = f"emt_response_{origin}_{destination}_T{lead_days}.json"
        if os.path.exists(cache_file):
            print(f"    {C_YELLOW}[!] Network timeout. Loading cached data ({cache_file})...{C_R}")
            with open(cache_file, "r", encoding="utf-8") as f:
                return json.load(f)
        raise RuntimeError(f"Failed to capture live flight data from network for {origin}→{destination} T+{lead_days}.")

    return captured_payload[0]

# ==============================================================================
# STAGE 2: CLEANING & VALIDATION (Parameterized)
# ==============================================================================
def clean_flight_data(raw_data, route_cfg, lead_days):
    """
    Parse and clean raw API response into structured flight records.

    Args:
        raw_data: dict from EaseMyTrip API
        route_cfg: dict with origin/destination info
        lead_days: int, lead time in days

    Returns:
        tuple: (clean_records list, raw_segment_count int)
    """
    origin = route_cfg["origin"]
    destination = route_cfg["destination"]

    target_date = datetime.now() + timedelta(days=lead_days)
    date_str_iso = target_date.strftime("%Y-%m-%d")

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
                    flt_origin = flt.get("OG", "").strip()
                    flt_dest = flt.get("DT", "").strip()
                    dep_time = flt.get("DTM", "").strip()
                    arr_time = flt.get("ATM", "").strip()
                    duration = flt.get("DUR", "").strip() or b.get("JyTm", "").strip()
                    cabin = flt.get("CB", "ECONOMY").strip()
                    fare_class = flt.get("FCLS", "Standard").strip()

                    # Filter non-direct segments
                    if flt_origin != origin or flt_dest != destination:
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
                        "run_id": None, # Will be set during orchestration
                        "timestamp": datetime.now().isoformat(timespec="seconds"),
                        "source": config.SOURCE_NAME,
                        "route": f"{origin}-{destination}",
                        "origin": flt_origin,
                        "destination": flt_dest,
                        "lead_time": f"T+{lead_days}",
                        "travel_date": date_str_iso,
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
    """Remove statistical outliers using IQR fencing."""
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
# STAGE 4: INDEX CALCULATION (Jevons Price Index) - Route-Specific Baseline
# ==============================================================================
def calculate_airfare_index(flights, route_cfg):
    """
    Compute Jevons Price Index using route-specific baseline from config.

    Args:
        flights: list of flight records
        route_cfg: dict with origin/destination

    Returns:
        dict: Statistics including jevons_index, median_fare, etc.
    """
    origin = route_cfg["origin"]
    destination = route_cfg["destination"]
    route_key = f"{origin}-{destination}"

    print(f"\n{C_CYAN}{C_B}===== STAGE 4: AIRFARE INDEX COMPUTATION (JEVONS) ====={C_R}")

    if not flights:
        print(f"[!] No flight data available for index calculation on route {route_key}.")
        return {
            "timestamp": datetime.now().isoformat(),
            "route": route_key,
            "sample_size": 0,
            "min_fare": None,
            "max_fare": None,
            "median_fare": None,
            "arithmetic_mean": None,
            "baseline_fare": config.BASELINES.get(route_key, config.DEFAULT_BASELINE_FARE),
            "jevons_index": None
        }

    fares = [f["total_fare"] for f in flights if f["status"] == "Available"]
    if not fares:
        fares = [f["total_fare"] for f in flights]

    n = len(fares)
    sorted_fares = sorted(fares)

    min_fare = sorted_fares[0]
    max_fare = sorted_fares[-1]
    median_fare = sorted_fares[n // 2] if n % 2 != 0 else (sorted_fares[n // 2 - 1] + sorted_fares[n // 2]) / 2.0
    arithmetic_mean = sum(fares) / n

    # Use route-specific baseline from config.BASELINES
    fixed_baseline = config.BASELINES.get(route_key, config.DEFAULT_BASELINE_FARE)

    # Proper Jevons Index: exp((1/n) * sum(ln(P_i / P_base))) * 100
    log_relatives_sum = sum(math.log(p / fixed_baseline) for p in fares)
    jevons_index = math.exp(log_relatives_sum / n) * 100.0

    print(f"[*] Route                : {route_key}")
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
        "route": route_key,
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
    """Print formatted flight table preview."""
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
# SINGLE ROUTE/LEAD-TIME PIPELINE RUNNER
# ==============================================================================
def run_single_collection(route_cfg, lead_days, run_id):
    """
    Execute full pipeline for one route and one lead time.

    Args:
        route_cfg: dict with route information
        lead_days: int, lead time in days
        run_id: str, unique run identifier for this batch

    Returns:
        dict: Result summary with stats, pipeline counts, flights, outliers
    """
    origin = route_cfg["origin"]
    destination = route_cfg["destination"]
    route_key = f"{origin}-{destination}"

    print(f"\n{C_B}{C_BLUE}{'=' * 70}")
    print(f"✈️  PIPELINE: {route_key} T+{lead_days}".center(70))
    print(f"{'=' * 70}{C_R}")

    # Stage 1: Scrape
    raw_data = scrape_live_flights(route_cfg, lead_days)

    # Stage 2: Clean
    clean_flights, raw_segment_count = clean_flight_data(raw_data, route_cfg, lead_days)
    if not clean_flights:
        print(f"[!] Warning: No valid flights found after cleaning for {route_key} T+{lead_days}.")
        return {
            "route": route_key,
            "lead_time": f"T+{lead_days}",
            "run_id": run_id,
            "stats": calculate_airfare_index([], route_cfg),
            "pipeline": {
                "raw_segments": raw_segment_count,
                "cleaned_flights": 0,
                "filtered_outliers": 0,
                "final_dataset": 0
            },
            "flights": [],
            "outliers": []
        }

    # Stage 3: Filter Outliers (IQR)
    filtered_flights, removed_flights = filter_outliers_iqr(clean_flights)
    active_dataset = filtered_flights if filtered_flights else clean_flights

    # Inject run_id into records
    for f in active_dataset:
        f["run_id"] = run_id
    for f in removed_flights:
        f["run_id"] = run_id

    # Preview Table
    print_flight_table(active_dataset, limit=10)

    # Stage 4: Index
    stats = calculate_airfare_index(active_dataset, route_cfg)

    return {
        "route": route_key,
        "lead_time": f"T+{lead_days}",
        "run_id": run_id,
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

# ==============================================================================
# PERSISTENCE: Save results to CSV and JSON
# ==============================================================================
def save_results(all_results):
    """
    Persist all collection results to CSV and structured JSON files.

    Args:
        all_results: list of result dicts from run_single_collection
    """
    print(f"\n{C_CYAN}{C_B}===== PERSISTING RESULTS ====={C_R}")

    # Save CSV (append mode for all flights across all runs)
    all_flights = []
    for result in all_results:
        all_flights.extend(result["flights"])

    if all_flights:
        file_exists = os.path.exists(config.CSV_FILE)
        with open(config.CSV_FILE, "a", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=list(all_flights[0].keys()))
            if not file_exists:
                writer.writeheader()
            for row in all_flights:
                writer.writerow(row)
        print(f"[OK] Appended {len(all_flights)} records to {config.CSV_FILE}")

    # Save legacy latest_run.json (backward compatible - use first result or DEL-BOM T+7 if exists)
    os.makedirs(config.OUTPUT_DIR, exist_ok=True)

    # Find DEL-BOM T+7 for backward compatibility, else use first result
    legacy_result = None
    for r in all_results:
        if r["route"] == "DEL-BOM" and r["lead_time"] == "T+7":
            legacy_result = r
            break
    if not legacy_result and all_results:
        legacy_result = all_results[0]

    if legacy_result:
        with open(config.LAST_RUN_RESULTS_FILE, "w", encoding="utf-8") as f:
            json.dump(legacy_result, f, indent=2)
        print(f"[OK] Saved legacy format to {config.LAST_RUN_RESULTS_FILE}")

    # Save new summary.json (structured by route and lead time)
    summary = {
        "generated_at": datetime.now().isoformat(),
        "total_collections": len(all_results),
        "results": {}
    }

    for result in all_results:
        route = result["route"]
        lead_time = result["lead_time"]
        if route not in summary["results"]:
            summary["results"][route] = {}
        summary["results"][route][lead_time] = {
            "jevons_index": result["stats"]["jevons_index"],
            "median_fare": result["stats"]["median_fare"],
            "sample_size": result["stats"]["sample_size"],
            "baseline_fare": result["stats"]["baseline_fare"],
            "pipeline": result["pipeline"]
        }

    with open(config.SUMMARY_JSON_FILE, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)
    print(f"[OK] Saved structured summary to {config.SUMMARY_JSON_FILE}")

# ==============================================================================
# MAIN ENTRY POINT
# ==============================================================================
def main():
    """Main entry point with CLI argument parsing."""
    parser = argparse.ArgumentParser(
        description="SIH Airfare Multi-Route Multi-Lead-Time Data Collection Pipeline"
    )
    parser.add_argument(
        "route",
        nargs="?",
        default="all",
        help="Route in format ORIGIN-DESTINATION (e.g., DEL-BOM) or 'all' for all routes"
    )
    parser.add_argument(
        "lead_days",
        nargs="?",
        type=int,
        default=None,
        help="Lead time in days (e.g., 1, 7, 15) or omit to run all lead times"
    )

    args = parser.parse_args()

    print(f"\n{C_B}{C_BLUE}{'#' * 70}")
    print("✈️ SIH AIRFARE MONITORING SYSTEM - MULTI-ROUTE PIPELINE".center(70))
    print(f"{'#' * 70}{C_R}")

    run_id = datetime.now().strftime("%Y%m%d_%H%M%S")

    # Determine which routes and lead times to run
    if args.route == "all":
        target_routes = config.ROUTES
    else:
        # Find matching route
        route_parts = args.route.split("-")
        if len(route_parts) != 2:
            print(f"{C_RED}[ERROR] Invalid route format. Use ORIGIN-DESTINATION (e.g., DEL-BOM){C_R}")
            sys.exit(1)

        origin_query, dest_query = route_parts
        target_routes = [
            r for r in config.ROUTES
            if r["origin"] == origin_query and r["destination"] == dest_query
        ]

        if not target_routes:
            print(f"{C_RED}[ERROR] Route {args.route} not found in config.ROUTES{C_R}")
            sys.exit(1)

    if args.lead_days is not None:
        target_lead_times = [args.lead_days]
    else:
        target_lead_times = config.LEAD_TIMES

    print(f"[*] Run ID        : {run_id}")
    target_route_names = [f"{r['origin']}-{r['destination']}" for r in target_routes]
    print(f"[*] Target Routes : {', '.join(target_route_names)}")
    print(f"[*] Lead Times    : {', '.join([f'T+{lt}' for lt in target_lead_times])}")
    print(f"[*] Total Jobs    : {len(target_routes) * len(target_lead_times)}")

    all_results = []

    # Sequential execution (rate-limiting friendly)
    for route_cfg in target_routes:
        for lead_days in target_lead_times:
            try:
                result = run_single_collection(route_cfg, lead_days, run_id)
                all_results.append(result)

                # Rate limiting: 3 second pause between scrapes
                import time
                time.sleep(3)

            except Exception as e:
                print(f"{C_RED}[ERROR] Failed to collect {route_cfg['origin']}-{route_cfg['destination']} T+{lead_days}: {e}{C_R}")
                continue

    # Save all results
    if all_results:
        save_results(all_results)

        # Generate visualizations (use legacy result for chart compatibility)
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

        print(f"\n{C_GREEN}{C_B}[+] MULTI-ROUTE PIPELINE COMPLETE{C_R}")
        print(f"    Collected {len(all_results)} route×lead-time combinations")
        print(f"    Results saved to {config.SUMMARY_JSON_FILE}\n")
    else:
        print(f"\n{C_RED}[!] No successful collections. Pipeline incomplete.{C_R}\n")
        sys.exit(1)

if __name__ == "__main__":
    main()
