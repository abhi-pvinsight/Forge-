import sys
import os

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from main import build_pysam_config
from PySAMRunner import process_all_weather_files_stream

test_values = {
    "module_manufacturer": "First Solar",
    "module_model": "Series 7",
    "moduleVoc": "220.5",
    "moduleVmp": "185.2",
    "moduleIsc": "2.58",
    "moduleImp": "2.42",
    "temp_coeff_voc": "-0.28",
    "temp_coeff_isc": "0.04",
    "temp_coeff_pm": "-0.32",
    "noct": "45.0",
    "module_length": "2.25",
    "module_width": "1.20",
    "module_mass": "35.0",
    "PCS_Max_DC_Input_Voltage": "1500",
    "PCS_MPP_Tracker_Min_Voltage_Range": "800",
    "PCS_Max_PV_Input_Current": "30",
    "modules_series": "6",
    "nstrings": "20",
    "gcr": "40.0",
    "tilt": "20.0",
    "azimuth": "180.0",
    "latitude": "33.4484",
    "longitude": "-112.0740",
    "sky_model": "Isotropic",
    "irrad_mode": "DNI and DHI",
    "albedo_jan": "0.20",
    "albedo_feb": "0.20",
    "albedo_mar": "0.20",
    "albedo_apr": "0.20",
    "albedo_may": "0.20",
    "albedo_jun": "0.20",
    "albedo_jul": "0.20",
    "albedo_aug": "0.20",
    "albedo_sep": "0.20",
    "albedo_oct": "0.20",
    "albedo_nov": "0.20",
    "albedo_dec": "0.20"
}

weather_folder = os.path.join(os.path.dirname(__file__), "test_weather")
config = build_pysam_config(test_values, weather_folder)

log_file = os.path.join(os.path.dirname(__file__), "pysam_test_output.txt")
with open(log_file, "w") as out_f:
    out_f.write("Starting PySAM test execution stream...\n")
    for event in process_all_weather_files_stream(config):
        if event["type"] == "progress":
            out_f.write(f"[{event['pct']:.1f}%] {event['message']}\n")
        elif event["type"] == "result":
            res = event["data"]
            voc_summary = res.get("voc_summary", [])
            isc_summary = res.get("isc_summary", [])
            out_f.write("\n=== PySAM Execution Successful! ===\n")
            out_f.write(f"Total Years Simulated: {len(voc_summary)}\n")
            if voc_summary:
                max_vocs = [s["maxVoltage"] for s in voc_summary]
                out_f.write(f"All-Time Max String Voc: {max(max_vocs)} V\n")
                out_f.write(f"Sample Voc Summary: {voc_summary[:3]}\n")
            if isc_summary:
                max_iscs = [s["avg"] for s in isc_summary]
                out_f.write(f"Max 3-Hour Avg Isc: {max(max_iscs)} A\n")
                out_f.write(f"Sample Isc Summary: {isc_summary[:3]}\n")

