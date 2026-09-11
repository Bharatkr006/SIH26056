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
        python_exe = os.path.join(base_dir, ".venv", "Scripts", "python.exe")
        scraper_path = os.path.join(base_dir, "scraper.py")

        # Run the scraper with absolute paths
        subprocess.run([python_exe, scraper_path], cwd=base_dir, check=True)
    except subprocess.CalledProcessError as e:
        print(f"Scraper failed with exit code {e.returncode}")
    finally:
        is_collecting = False

@app.get("/api/v1/status")
def get_status():
    global is_collecting
    try:
        data = get_latest_run_data()
        timestamp = data.get("stats", {}).get("timestamp", None)
    except HTTPException:
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
