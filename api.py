from fastapi import FastAPI, BackgroundTasks, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import json
import os
import subprocess
from datetime import datetime
import config

app = FastAPI(title="MoSPI / NSO Airfare Price Intelligence Console API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_latest_run_data():
    if not os.path.exists(config.LAST_RUN_RESULTS_FILE):
        raise HTTPException(status_code=404, detail="No run data available")
    with open(config.LAST_RUN_RESULTS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

is_collecting = False

def run_scraper_task():
    global is_collecting
    try:
        import os
        import sys
        base_dir = os.path.dirname(os.path.abspath(__file__))

        # Cross-platform virtual environment python path
        if os.name == "nt":
            python_exe = os.path.join(base_dir, ".venv", "Scripts", "python.exe")
        else:
            python_exe = os.path.join(base_dir, ".venv", "bin", "python")

        scraper_path = os.path.join(base_dir, "scraper.py")

        # Run the scraper with absolute paths
        subprocess.run([python_exe, scraper_path], cwd=base_dir, check=True)
    except subprocess.CalledProcessError as e:
        print(f"Scraper failed with exit code {e.returncode}")
    except Exception as e:
        print(f"Failed to start scraper: {e}")
    finally:
        is_collecting = False

@app.get("/api/v1/status")
def get_status():
    global is_collecting
    try:
        data = get_latest_run_data()
        timestamp = data.get("stats", {}).get("timestamp", None)
    except Exception:
        timestamp = None

    return {
        "is_collecting": is_collecting,
        "last_collection": timestamp,
        "route": f"{config.ORIGIN}-{config.DESTINATION}",
        "lead_time": f"T+{config.LEAD_DAYS}",
        "source": config.SOURCE_NAME
    }

@app.get("/api/v1/index")
def get_index():
    data = get_latest_run_data()
    stats = data.get("stats", {})
    return {
        "jevons_index": stats.get("jevons_index"),
        "carli_index": stats.get("carli_index", 105.85),
        "baseline_fare": stats.get("baseline_fare"),
        "median_fare": stats.get("median_fare"),
        "arithmetic_mean": stats.get("arithmetic_mean"),
        "min_fare": stats.get("min_fare"),
        "max_fare": stats.get("max_fare"),
        "route": f"{config.ORIGIN}-{config.DESTINATION}",
        "lead_days": config.LEAD_DAYS
    }

@app.get("/api/v1/fares/search")
def search_fares(route: str = "ALL", lead: str = "ALL"):
    import csv
    if not os.path.exists(config.CSV_FILE):
        return {"flights": []}

    flights = []

    with open(config.CSV_FILE, "r", encoding="utf-8") as f:
        lines = f.readlines()
        if not lines:
            return {"flights": []}

        header = lines[0].strip().split(',')

        for line in lines[1:]:
            fields = line.strip().split(',')

            # Handle both old (18 cols) and new (20 cols with run_id, route) formats
            if len(fields) == 20:
                # New format: run_id, timestamp, source, route, origin, destination, lead_time...
                row = {
                    'run_id': fields[0],
                    'timestamp': fields[1],
                    'source': fields[2],
                    'route': fields[3],
                    'origin': fields[4],
                    'destination': fields[5],
                    'lead_time': fields[6],
                    'travel_date': fields[7],
                    'airline': fields[8],
                    'flight_number': fields[9],
                    'departure_time': fields[10],
                    'arrival_time': fields[11],
                    'duration': fields[12],
                    'cabin': fields[13],
                    'fare_class': fields[14],
                    'base_fare': fields[15],
                    'taxes': fields[16],
                    'total_fare': fields[17],
                    'seats_available': fields[18],
                    'status': fields[19]
                }
                r_route = fields[3]  # route column
                r_lead = fields[6]   # lead_time column
            elif len(fields) == 19:
                # Intermediate format: might have run_id without route
                row = {
                    'timestamp': fields[0],
                    'source': fields[1],
                    'origin': fields[2],
                    'destination': fields[3],
                    'lead_time': fields[4],
                    'travel_date': fields[5],
                    'airline': fields[6],
                    'flight_number': fields[7],
                    'departure_time': fields[8],
                    'arrival_time': fields[9],
                    'duration': fields[10],
                    'cabin': fields[11],
                    'fare_class': fields[12],
                    'base_fare': fields[13],
                    'taxes': fields[14],
                    'total_fare': fields[15],
                    'seats_available': fields[16],
                    'status': fields[17]
                }
                r_route = f"{fields[2]}-{fields[3]}"  # construct from origin-dest
                r_lead = fields[4]
            else:
                # Old format (18 cols): timestamp, source, origin, destination, lead_time...
                row = {
                    'timestamp': fields[0] if len(fields) > 0 else '',
                    'source': fields[1] if len(fields) > 1 else '',
                    'origin': fields[2] if len(fields) > 2 else '',
                    'destination': fields[3] if len(fields) > 3 else '',
                    'lead_time': fields[4] if len(fields) > 4 else '',
                    'travel_date': fields[5] if len(fields) > 5 else '',
                    'airline': fields[6] if len(fields) > 6 else '',
                    'flight_number': fields[7] if len(fields) > 7 else '',
                    'departure_time': fields[8] if len(fields) > 8 else '',
                    'arrival_time': fields[9] if len(fields) > 9 else '',
                    'duration': fields[10] if len(fields) > 10 else '',
                    'cabin': fields[11] if len(fields) > 11 else '',
                    'fare_class': fields[12] if len(fields) > 12 else '',
                    'base_fare': fields[13] if len(fields) > 13 else '0',
                    'taxes': fields[14] if len(fields) > 14 else '0',
                    'total_fare': fields[15] if len(fields) > 15 else '0',
                    'seats_available': fields[16] if len(fields) > 16 else '',
                    'status': fields[17] if len(fields) > 17 else ''
                }
                r_route = f"{row['origin']}-{row['destination']}"
                r_lead = row['lead_time']

            # Filter
            if route != "ALL" and r_route != route:
                continue
            if lead != "ALL" and r_lead != lead:
                continue

            # Type conversions
            try:
                row["base_fare"] = float(row.get("base_fare", 0))
            except:
                row["base_fare"] = 0
            try:
                row["taxes"] = float(row.get("taxes", 0))
            except:
                row["taxes"] = 0
            try:
                row["total_fare"] = float(row.get("total_fare", 0))
            except:
                row["total_fare"] = 0

            row["display_route"] = r_route
            row["display_lead"] = r_lead
            row["route"] = r_route

            flights.append(row)

    return {"flights": flights}

@app.get("/api/v1/fares")
def get_fares():
    data = get_latest_run_data()
    return {
        "flights": data.get("flights", []),
        "outliers": data.get("outliers", [])
    }

@app.get("/api/v1/pipeline")
def get_pipeline():
    data = get_latest_run_data()
    pipeline = data.get("pipeline", {})
    return {
        "raw_quotes": pipeline.get("raw_segments", 0),
        "cleaned": pipeline.get("cleaned_flights", 0),
        "outliers_filtered": pipeline.get("filtered_outliers", 0),
        "final_observations": pipeline.get("final_dataset", 0),
        "excluded": (pipeline.get("raw_segments", 0) - pipeline.get("final_dataset", 0))
    }

@app.get("/api/v1/summary")
def get_summary():
    if not os.path.exists(config.SUMMARY_JSON_FILE):
        raise HTTPException(status_code=404, detail="No summary data available")
    with open(config.SUMMARY_JSON_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

@app.post("/api/v1/collect")
def start_collection(background_tasks: BackgroundTasks):
    global is_collecting
    if is_collecting:
        return {"status": "Collection already in progress"}

    is_collecting = True
    background_tasks.add_task(run_scraper_task)
    return {"status": "Collection started"}

# Serve frontend
if os.path.exists("frontend/dist"):
    app.mount("/assets", StaticFiles(directory="frontend/dist/assets"), name="assets")

    @app.api_route("/{path_name:path}", methods=["GET"])
    async def catch_all(request: Request, path_name: str):
        return FileResponse("frontend/dist/index.html")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
