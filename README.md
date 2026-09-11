# MoSPI / NSO Airfare Price Intelligence Console (Prototype)

This is a **Smart India Hackathon 2026** prototype for a real-time Airfare Price Index tracking system. Designed as a government statistical intelligence platform, it tracks and calculates the airfare inflation on specific routes using automated live data collection.

## Features

- **Automated Collection Engine**: Headless browser automation (Playwright) that intercepts live OTA API responses securely without scraping raw DOM.
- **Data Validation & Cleaning**: Automatic detection and filtering of non-direct flights, zero-fare segments, and sold-out buckets.
- **Statistical Pipeline**: Uses an Interquartile Range (IQR) fence to filter statistical outliers before feeding into the core logic.
- **Index Calculation**: Computes the **Jevons Price Index** (using the geometric mean of relative prices) against a calibrated baseline.
- **Professional Dashboard**: A React-based Single Page Application providing deep route intelligence, historical analytics, pipeline monitoring, and data quality inspection arrays.
- **RESTful API**: Fast and robust Python FastAPI integration allowing modular programmatic extraction of insights.

## Architecture

The system consists of two primary components bundled into a single runtime environment:
1. **Analytics Backend (`api.py` & `scraper.py`)**: A Python data-processing layer exposed via FastAPI.
2. **Frontend Console (`frontend/`)**: A React/Vite web application built with Tailwind CSS and Recharts to visualize the statistical pipeline results.

### Core Stack
- **Backend Analytics**: Python 3.10+, Playwright, Math, Pandas (Optional), FastAPI, Uvicorn
- **Frontend Dashboard**: React (TypeScript), Vite, Tailwind CSS, Lucide Icons, Recharts

## Getting Started

### 1. Prerequisites
- Python 3.10 or higher
- Node.js (v18 or higher) & NPM

### 2. Setup the Environment

```bash
# Initialize and activate the virtual environment (Windows)
python -m venv .venv
.venv\Scripts\activate

# Install the core processing and API dependencies
pip install -r requirements.txt

# Install headless browser binaries
playwright install chromium
```

### 3. Running the Integrated System

You can run the entire platform using the unified API server. This serves both the REST endpoints and the React frontend.

1. Install frontend dependencies and build the UI:
```bash
cd frontend
npm install
npm run build
cd ..
```

2. Start the API/Frontend Platform:
```bash
.venv\Scripts\python api.py
```

3. Open your browser to the Dashboard:
👉 **[http://localhost:8000](http://localhost:8000)**

*(Make sure you run the server from the project root so it can locate the frontend/dist directory correctly).*

---

## Technical Details

### Price Index Methodology (Jevons)
The pipeline specifically implements the unweighted geometric mean of price relatives:
`J = exp( (1/n) * Σ ln( p_i / p_0 ) ) * 100`

This complies with ILO consumer price index manual standards, eliminating substitution biases mathematically inherent in Carli (arithmetic mean) evaluations.

### The Pipeline Process
1. Configured to collect T+7 observation windows for DEL-BOM. 
2. Playwright initiates network interception for specific endpoint signatures.
3. Raw JSON schemas are standardized onto a flat internal schema.
4. Bad data filtered, IQR removes edge prices.
5. Median and Index computed against a reference baseline and logged.

*Note: The frontend UI leverages mocked historical time-series data for demonstration, pending time-series database implementation. All other observations, numbers, charts, and API intercepts are 100% live and data-backed.*
