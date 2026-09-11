import os
import json
import config
from scraper import clean_flight_data, filter_outliers_iqr, calculate_airfare_index

def test_config_matrix_loaded():
    assert isinstance(config.ROUTES, list)
    assert len(config.ROUTES) == 3
    assert len(config.LEAD_TIMES) == 3

    assert "DEL-BOM" in config.BASELINES
    assert "DEL-BLR" in config.BASELINES
    assert "BOM-BLR" in config.BASELINES
    print("[OK] test_config_matrix_loaded")

def test_clean_flight_data():
    raw_data = {
        "dctFltDtl": {
            "123": {"AC": "6E", "FN": "100", "OG": "DEL", "DT": "BOM", "CB": "ECONOMY", "FCLS": "Standard", "DTM": "10:00", "ATM": "12:00", "DUR": "2h"},
            "456": {"AC": "AI", "FN": "200", "OG": "DEL", "DT": "BLR", "CB": "ECONOMY", "FCLS": "Standard", "DTM": "14:00", "ATM": "16:00", "DUR": "2h"}
        },
        "j": [
            {
                "s": [
                    {"TF": 6500, "TT": 500, "b": [{"FL": ["123"]}]},
                    {"TF": 8000, "TT": 500, "b": [{"FL": ["456"]}]},
                    {"TF": 6500, "TT": 500, "SeatAv": "Sold Out", "b": [{"FL": ["123"]}]},
                    {"TF": 6500, "TT": 500, "b": [{"FL": ["123"]}]}
                ]
            }
        ]
    }

    route_cfg = {"origin": "DEL", "destination": "BOM", "city_origin": "Delhi-India", "city_dest": "Mumbai-India"}
    clean_data, raw_segments = clean_flight_data(raw_data, route_cfg, 7)

    assert raw_segments == 4
    assert len(clean_data) in [1, 2]
    print("[OK] test_clean_flight_data")

def test_iqr_outlier_filtering():
    flights = [
        {"total_fare": 6000, "status": "Available", "airline": "MockAir", "flight_number": "MK-100"},
        {"total_fare": 6500, "status": "Available", "airline": "MockAir", "flight_number": "MK-101"},
        {"total_fare": 6600, "status": "Available", "airline": "MockAir", "flight_number": "MK-102"},
        {"total_fare": 7000, "status": "Available", "airline": "MockAir", "flight_number": "MK-103"},
        {"total_fare": 16000, "status": "Available", "airline": "MockAir", "flight_number": "MK-999"}
    ]

    kept, removed = filter_outliers_iqr(flights)

    assert len(kept) == 4
    assert len(removed) == 1
    assert removed[0]["total_fare"] == 16000
    print("[OK] test_iqr_outlier_filtering")

def test_jevons_index_calculation():
    flights = [
        {"total_fare": 1000, "status": "Available", "departure_time": "10:00"},
        {"total_fare": 2000, "status": "Available", "departure_time": "14:00"}
    ]

    old_baseline = config.BASELINES.get("DEL-BOM", 6500)
    config.BASELINES["DEL-BOM"] = 1000.0

    stats = calculate_airfare_index(flights, {"origin": "DEL", "destination": "BOM"})

    assert stats["jevons_index"] > 141.0 and stats["jevons_index"] < 142.0
    assert stats["median_fare"] == 1500.0

    config.BASELINES["DEL-BOM"] = old_baseline
    print("[OK] test_jevons_index_calculation")

if __name__ == "__main__":
    import sys
    sys.stdout.reconfigure(encoding='utf-8')
    test_config_matrix_loaded()
    # Mocking prints in test output
    import io
    sys.stdout = io.StringIO()
    test_clean_flight_data()
    test_iqr_outlier_filtering()
    test_jevons_index_calculation()
    sys.stdout = sys.__stdout__
    print("All tests passed successfully.")
