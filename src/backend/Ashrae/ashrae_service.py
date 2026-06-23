import os
import json
import requests
import numpy as np
import pandas as pd
from bs4 import BeautifulSoup
from sklearn.neighbors import BallTree

def fast_nearest_wmo(csv_file, user_lat, user_lon):
    """Finds the nearest weather station ID using BallTree spatial search."""
    if not os.path.exists(csv_file):
        raise FileNotFoundError(f"Missing database file at: {csv_file}")
        
    df = pd.read_csv(csv_file)
    coords = np.radians(df[["latitude", "longitude"]].values)
    tree = BallTree(coords, metric='haversine')

    user_point = np.radians([[user_lat, user_lon]])
    _, indices = tree.query(user_point, k=1)

    selected_row = df.iloc[indices[0][0]]
    return str(int(selected_row['id']))

def process_and_populate_report(user_lat, user_lon):
    """Fetches comprehensive weather metrics and updates ashrae_table.html in-place."""
    base_dir = os.path.dirname(os.path.abspath(__file__))
    csv_path = os.path.join(base_dir, "clean_weather_stations.csv")
    template_path = os.path.join(base_dir, "ASHARE.html")

    if not os.path.exists(template_path):
        raise FileNotFoundError(f"Could not find target file to update at: {template_path}")

    # 1. Spatial Resolution
    wmo_id = fast_nearest_wmo(csv_path, user_lat, user_lon)
    print(f"🎯 Resolved Nearest WMO Station ID: {wmo_id}")

    # 2. ASHRAE Server Core Call
    URL = "https://ashrae-meteo.info/v3.0/request_meteo_parametres.php"
    payload = {"wmo": wmo_id, "ashrae_version": "2025", "si_ip": "SI"}
    headers = {"User-Agent": "Mozilla/5.0", "Referer": "https://ashrae-meteo.info/"}

    with requests.Session() as session:
        session.get("https://ashrae-meteo.info/", headers=headers)
        response = session.post(URL, data=payload, headers=headers)
        json_data = json.loads(response.content.decode("utf-8-sig"))
        
    stations = json_data.get("meteo_stations", [])
    if not stations:
        raise ValueError("No data mapping returned from ASHRAE endpoints.")
    station = stations[0]
    print(station)
    # 3. Comprehensive Mapping for All 61 Added Fields
    # data_map = {
    #     "station_name": station.get("place", "N/A"),
    #     "wmo_id": station.get("wmo", "N/A"),
        
        # 3. DIRECT EXACT-MATCH KEY MAP ASSIGNMENT
    # This grabs your explicit API keys to line up identically with your HTML data-key targets.
    data_map = {
        "station_name": station.get("place", "N/A"),
        "wmo_id": station.get("wmo", "N/A"),
        
        "coldest_month": station.get("coldest_month", "N/A"),
        "heating_DB_99.6": station.get("heating_DB_99.6", "N/A"),
        "heating_DB_99": station.get("heating_DB_99", "N/A"),
        "humidification_DP/MCDB_and_HR_99.6_DP": station.get("humidification_DP/MCDB_and_HR_99.6_DP", "N/A"),
        "humidification_DP/MCDB_and_HR_99.6_HR": station.get("humidification_DP/MCDB_and_HR_99.6_HR", "N/A"),
        "humidification_DP/MCDB_and_HR_99.6_MCDB": station.get("humidification_DP/MCDB_and_HR_99.6_MCDB", "N/A"),
        "humidification_DP/MCDB_and_HR_99_DP": station.get("humidification_DP/MCDB_and_HR_99_DP", "N/A"),
        "humidification_DP/MCDB_and_HR_99_HR": station.get("humidification_DP/MCDB_and_HR_99_HR", "N/A"),
        "humidification_DP/MCDB_and_HR_99_MCDB": station.get("humidification_DP/MCDB_and_HR_99_MCDB", "N/A"),
        "coldest_month_WS/MSDB_0.4_WS": station.get("coldest_month_WS/MSDB_0.4_WS", "N/A"),
        "coldest_month_WS/MSDB_0.4_MCDB": station.get("coldest_month_WS/MSDB_0.4_MCDB", "N/A"),
        "coldest_month_WS/MSDB_1_WS": station.get("coldest_month_WS/MSDB_1_WS", "N/A"),
        "coldest_month_WS/MSDB_1_MCDB": station.get("coldest_month_WS/MSDB_1_MCDB", "N/A"),
        "MCWS/PCWD_to_99.6_DB_MCWS": station.get("MCWS/PCWD_to_99.6_DB_MCWS", "N/A"),
        "MCWS/PCWD_to_99.6_DB_PCWD": station.get("MCWS/PCWD_to_99.6_DB_PCWD", "N/A"),
        "WSF": station.get("WSF", "N/A"),

        "hottest_month": station.get("hottest_month", "N/A"),
        "hottest_month_DB_range": station.get("hottest_month_DB_range", "N/A"),
        "cooling_DB_MCWB_0.4_DB": station.get("cooling_DB_MCWB_0.4_DB", "N/A"),
        "cooling_DB_MCWB_0.4_MCWB": station.get("cooling_DB_MCWB_0.4_MCWB", "N/A"),
        "cooling_DB_MCWB_1_DB": station.get("cooling_DB_1_DB", "N/A") or station.get("cooling_DB_MCWB_1_DB", "N/A"),
        "cooling_DB_MCWB_1_MCWB": station.get("cooling_MCWB_1_MCWB", "N/A") or station.get("cooling_DB_MCWB_1_MCWB", "N/A"),
        "cooling_DB_MCWB_2_DB": station.get("cooling_DB_MCWB_2_DB", "N/A"),
        "cooling_DB_MCWB_2_MCWB": station.get("cooling_DB_MCWB_2_MCWB", "N/A"),
        "evaporation_WB_MCDB_0.4_WB": station.get("evaporation_WB_MCDB_0.4_WB", "N/A"),
        "evaporation_WB_MCDB_0.4_MCDB": station.get("evaporation_WB_MCDB_0.4_MCDB", "N/A"),
        "evaporation_WB_MCDB_1_WB": station.get("evaporation_WB_MCDB_1_WB", "N/A"),
        "evaporation_WB_MCDB_1_MCDB": station.get("evaporation_WB_MCDB_1_MCDB", "N/A"),
        "evaporation_WB_MCDB_2_WB": station.get("evaporation_WB_MCDB_2_WB", "N/A"),
        "evaporation_WB_MCDB_2_MCDB": station.get("evaporation_WB_MCDB_2_MCDB", "N/A"),
        "MCWS_PCWD_to_0.4_DB_MCWS": station.get("MCWS_PCWD_to_0.4_DB_MCWS", "N/A"),
        "MCWS_PCWD_to_0.4_DB_PCWD": station.get("MCWS_PCWD_to_0.4_DB_PCWD", "N/A"),

        "dehumidification_DP/MCDB_and_HR_0.4_DP": station.get("dehumidification_DP/MCDB_and_HR_0.4_DP", "N/A"),
        "dehumidification_DP/MCDB_and_HR_0.4_HR": station.get("dehumidification_DP/MCDB_and_HR_0.4_HR", "N/A"),
        "dehumidification_DP/MCDB_and_HR_0.4_MCDB": station.get("dehumidification_DP/MCDB_and_HR_0.4_MCDB", "N/A"),
        "dehumidification_DP/MCDB_and_HR_1_DP": station.get("dehumidification_DP/MCDB_and_HR_1_DP", "N/A"),
        "dehumidification_DP/MCDB_and_HR_1_HR": station.get("dehumidification_DP/MCDB_and_HR_1_HR", "N/A"),
        "dehumidification_DP/MCDB_and_HR_1_MCDB": station.get("dehumidification_DP/MCDB_and_HR_1_MCDB", "N/A"),
        "dehumidification_DP/MCDB_and_HR_2_DP": station.get("dehumidification_DP/MCDB_and_HR_2_DP", "N/A"),
        "dehumidification_DP/MCDB_and_HR_2_HR": station.get("dehumidification_DP/MCDB_and_HR_2_HR", "N/A"),
        "dehumidification_DP/MCDB_and_HR_2_MCDB": station.get("dehumidification_DP/MCDB_and_HR_2_MCDB", "N/A"),
        "enthalpy_MCDB_0.4_enth": station.get("enthalpy_MCDB_0.4_enth", "N/A"),
        "enthalpy_MCDB_0.4_MCDB": station.get("enthalpy_MCDB_0.4_MCDB", "N/A"),
        "enthalpy_MCDB_1_enth": station.get("enthalpy_MCDB_1_enth", "N/A"),
        "enthalpy_MCDB_1_MCDB": station.get("enthalpy_MCDB_1_MCDB", "N/A"),
        "enthalpy_MCDB_2_enth": station.get("enthalpy_MCDB_2_enth", "N/A"),
        "enthalpy_MCDB_2_MCDB": station.get("enthalpy_MCDB_2_MCDB", "N/A"),
        "extreme_max_WB": station.get("extreme_max_wb", "N/A") or station.get("extreme_max_WB", "N/A"),

        "extreme_annual_WS_1": station.get("extreme_annual_WS_1", "N/A"),
        "extreme_annual_WS_2.5": station.get("extreme_annual_WS_2.5", "N/A"),
        "extreme_annual_WS_5": station.get("extreme_annual_WS_5", "N/A"),
        "extreme_annual_DB_mean_min": station.get("extreme_annual_DB_mean_min", "N/A"),
        "extreme_annual_DB_mean_max": station.get("extreme_annual_DB_mean_max", "N/A"),
        "extreme_annual_DB_standard_deviation_min": station.get("extreme_annual_DB_standard_deviation_min", "N/A"),
        "extreme_annual_DB_standard_deviation_max": station.get("extreme_annual_DB_standard_deviation_max", "N/A"),
        "n-year_return_period_values_of_extreme_DB_5_min": station.get("n-year_return_period_values_of_extreme_DB_5_min", "N/A"),
        "n-year_return_period_values_of_extreme_DB_5_max": station.get("n-year_return_period_values_of_extreme_DB_5_max", "N/A"),
        "n-year_return_period_values_of_extreme_DB_10_min": station.get("n-year_return_period_values_of_extreme_DB_10_min", "N/A"),
        "n-year_return_period_values_of_extreme_DB_10_max": station.get("n-year_return_period_values_of_extreme_DB_10_max", "N/A"),
        "n-year_return_period_values_of_extreme_DB_20_min": station.get("n-year_return_period_values_of_extreme_DB_20_min", "N/A"),
        "n-year_return_period_values_of_extreme_DB_20_max": station.get("n-year_return_period_values_of_extreme_DB_20_max", "N/A"),
        "n-year_return_period_values_of_extreme_DB_50_min": station.get("n-year_return_period_values_of_extreme_DB_50_min", "N/A"),
        "n-year_return_period_values_of_extreme_DB_50_max": station.get("n-year_return_period_values_of_extreme_DB_50_max", "N/A"),
        "extreme_annual_WB_mean_min": station.get("extreme_annual_WB_mean_min", "N/A"),
        "extreme_annual_WB_mean_max": station.get("extreme_annual_WB_mean_max", "N/A"),
        "extreme_annual_WB_standard_deviation_min": station.get("extreme_annual_WB_standard_deviation_min", "N/A"),
        "extreme_annual_WB_standard_deviation_max": station.get("extreme_annual_WB_standard_deviation_max", "N/A"),
        "n-year_return_period_values_of_extreme_WB_5_min": station.get("n-year_return_period_values_of_extreme_WB_5_min", "N/A"),
        "n-year_return_period_values_of_extreme_WB_5_max": station.get("n-year_return_period_values_of_extreme_WB_5_max", "N/A"),
        "n-year_return_period_values_of_extreme_WB_10_min": station.get("n-year_return_period_values_of_extreme_WB_10_min", "N/A"),
        "n-year_return_period_values_of_extreme_WB_10_max": station.get("n-year_return_period_values_of_extreme_WB_10_max", "N/A"),
        "n-year_return_period_values_of_extreme_WB_20_min": station.get("n-year_return_period_values_of_extreme_WB_20_min", "N/A"),
        "n-year_return_period_values_of_extreme_WB_20_max": station.get("n-year_return_period_values_of_extreme_WB_20_max", "N/A"),
        "n-year_return_period_values_of_extreme_WB_50_min": station.get("n-year_return_period_values_of_extreme_WB_50_min", "N/A"),
        "n-year_return_period_values_of_extreme_WB_50_max": station.get("n-year_return_period_values_of_extreme_WB_50_max", "N/A")
    }

    # 4. Parse the existing HTML Document Layout
    with open(template_path, "r", encoding="utf-8") as f:
        soup = BeautifulSoup(f.read(), "html.parser")

    # Update Station Header Core Card Element
    header_cell = soup.find(id="station_header_title")
    if header_cell:
        header_cell.string = ""
        icon_div = soup.new_tag("div", attrs={
            "class": "baloon_icon", 
            "style": "display:inline-block;background-position:0px 0px;position: relative;right: 10;"
        })
        header_cell.append(icon_div)
        bold_title = soup.new_tag("b")
        bold_title.string = f"{data_map['station_name']} (WMO: {data_map['wmo_id']})"
        header_cell.append(bold_title)

    # 5. Targeted Re-injection for All Expanded Mapped Fields
    for data_key, val in data_map.items():
        cell_target = soup.find(attrs={"data-key": data_key})
        if cell_target:
            cell_target.string = ""  # Wipes existing hardcoded sample value cleanly
            bold_wrapper = soup.new_tag("b")
            bold_wrapper.string = str(val if val is not None else "N/A")
            cell_target.append(bold_wrapper)

    # 6. Overwrite the file in-place
    with open(template_path, "w", encoding="utf-8") as f:
        f.write(str(soup))
        
    print("🎉 File updated in-place with all extended configurations!")

if __name__ == "__main__":
    # Test trial execution coordinates
    process_and_populate_report(36.778, -119.417)