import json, sys, os

sys.path.append(os.path.join(os.path.dirname(__file__), "..", "src", "backend"))
from PySAMRunner import process_all_weather_files

input_path = os.path.join(os.path.dirname(__file__), "..", "src", "backend", "Input.json")
with open(input_path, "r") as f:
    config = json.load(f)

# Override WeatherFolder to scratch directory for clean test
config["WeatherFolder"] = os.path.join(os.path.dirname(__file__), "test_weather")

print("Running PySAMRunner test with live console logging...")
try:
    results = process_all_weather_files(config)
    print("Process finished successfully!")
except Exception as e:
    print("Execution output error (expected if PySAM C libraries missing):", e)
