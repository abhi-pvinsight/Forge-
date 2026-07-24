import os
import re
import csv
import json
import traceback
from datetime import datetime, timedelta
import time
import requests
import shutil

import PySAM.Pvsamv1 as pvsam

def get_supabase_rest_config():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key: return None
    
    # Strip /rest/v1 if present to get the base project url
    base_url = url.split("/rest/v1")[0].rstrip("/")
    return {
        "url": base_url,
        "key": key
    }


APP_TITLE = "PV String Voc & Isc Checker (PySAM / PVsAM)"
SUPPORTED_WEATHER_EXTS = (".csv", ".epw")
MODULE_MODEL_USER_ENTERED = 2

STANDOFF_OPTIONS = [
    ("Building integrated", 0),
    ("Greater than 3.5in", 1),
    ("2.5-3.5in", 2),
    ("1.5-2.5in", 3),
    ("0.5-1.5in", 4),
    ("Less than 0.5in", 5),
    ("Ground or rack mounted", 6),
]

MOUNTING_OPTIONS = [
    ("One story building height or lower", 0),
    ("Two story building height or higher", 1),
]

SKY_MODEL_OPTIONS = [
    ("Isotropic", 0),
    ("HDKR", 1),
    ("Perez", 2),
]

IRRAD_MODE_OPTIONS = [
    ("DNI and DHI", 0),
    ("DNI and GHI", 1),
    ("GHI and DHI", 2),
    ("POA from reference cell", 3),
    ("POA from pyranometer", 4),
]


# -------------------------
# Helpers
# -------------------------
def extract_year_from_filename(path: str) -> str:
    base = os.path.basename(path)
    matches = re.findall(r"(?<!\d)(?:19|20)\d{2}(?!\d)", base)
    if matches:
        return matches[-1]
    matches2 = re.findall(r"(?<!\d)\d{4}(?!\d)", base)
    if matches2:
        return matches2[-1]
    return base


def list_weather_files(folder: str):
    files = [
        os.path.join(folder, fn)
        for fn in os.listdir(folder)
        if fn.lower().endswith(SUPPORTED_WEATHER_EXTS)
    ]
    files.sort()
    return files


def _safe_int(x):
    try:
        return int(float(str(x).strip()))
    except Exception:
        return None


def _safe_float(x):
    try:
        return float(str(x).strip())
    except Exception:
        return None


def compute_aspect_ratio(length_m: float, width_m: float) -> float:
    if width_m == 0:
        return 0.0
    return float(length_m) / float(width_m)


def _open_csv_rows_auto_delim(path: str, max_rows: int = 200):
    rows = []
    try:
        with open(path, "r", encoding="utf-8", errors="ignore", newline="") as f:
            sample = f.read(4096)
            f.seek(0)
            delim = "\t" if sample.count("\t") > sample.count(",") else ","
            reader = csv.reader(f, delimiter=delim)
            for i, r in enumerate(reader):
                if i >= max_rows:
                    break
                if r and any(str(c).strip() for c in r):
                    rows.append([str(c).strip() for c in r])
    except Exception:
        return []
    return rows


def _find_row_index(rows, first_cell_value: str):
    target = first_cell_value.strip().lower()
    for i, r in enumerate(rows):
        if r and str(r[0]).strip().lower() == target:
            return i
    return None


def _compute_time_step_minutes_from_rows(rows) -> str:
    header_idx = _find_row_index(rows, "Year")
    if header_idx is None:
        return ""

    header = rows[header_idx]
    idx = {str(name).strip().lower(): k for k, name in enumerate(header)}
    needed = ["year", "month", "day", "hour"]
    if not all(n in idx for n in needed):
        return ""

    minute_idx = idx.get("minute", None)

    def parse_dt(row):
        y = _safe_int(row[idx["year"]]) if idx["year"] < len(row) else None
        m = _safe_int(row[idx["month"]]) if idx["month"] < len(row) else None
        d = _safe_int(row[idx["day"]]) if idx["day"] < len(row) else None
        h = _safe_int(row[idx["hour"]]) if idx["hour"] < len(row) else None
        mn = _safe_int(row[minute_idx]) if minute_idx is not None and minute_idx < len(row) else 0
        if y is None or m is None or d is None or h is None:
            return None
        try:
            if h == 24:
                return datetime(y, m, d, 0, mn) + timedelta(days=1)
            return datetime(y, m, d, max(0, min(23, h)), mn)
        except Exception:
            return None

    data_rows = []
    for r in rows[header_idx + 1:]:
        dt = parse_dt(r)
        if dt is not None:
            data_rows.append(dt)
        if len(data_rows) >= 2:
            break

    if len(data_rows) < 2:
        return ""

    delta = (data_rows[1] - data_rows[0]).total_seconds() / 60.0
    if delta <= 0:
        delta = abs(delta)
    if delta <= 0:
        return ""
    return f"{int(round(delta))} min"


def parse_sam_csv_metadata(path: str) -> dict:
    meta = {
        "latitude": "",
        "longitude": "",
        "data_source": "",
        "time_zone": "",
        "elevation": "",
        "time_step": "",
    }

    rows = _open_csv_rows_auto_delim(path, max_rows=200)
    if not rows:
        return meta

    r0 = [c.strip().lower() for c in rows[0]] if len(rows) >= 1 else []
    r1 = rows[1] if len(rows) >= 2 else []

    if r0 and ("source" in r0) and (len(r1) == len(r0)):
        table = {r0[i]: str(r1[i]).strip() for i in range(len(r0))}
        meta["data_source"] = table.get("source", "")
        meta["latitude"] = table.get("latitude", "")
        meta["longitude"] = table.get("longitude", "")
        meta["time_zone"] = table.get("time zone", table.get("timezone", ""))
        meta["elevation"] = table.get("elevation", "")

    meta["time_step"] = _compute_time_step_minutes_from_rows(rows)
    return meta


def parse_epw_metadata(path: str) -> dict:
    meta = {
        "latitude": "",
        "longitude": "",
        "data_source": "",
        "time_zone": "",
        "elevation": "",
        "time_step": "60 min",
    }
    try:
        with open(path, "r", encoding="latin-1", errors="ignore") as f:
            line = f.readline().strip()
        parts = [p.strip() for p in line.split(",")]
        if parts and parts[0].upper() == "LOCATION":
            meta["data_source"] = parts[4] if len(parts) > 4 else ""
            meta["latitude"] = parts[6] if len(parts) > 6 else ""
            meta["longitude"] = parts[7] if len(parts) > 7 else ""
            meta["time_zone"] = parts[8] if len(parts) > 8 else ""
            meta["elevation"] = parts[9] if len(parts) > 9 else ""
    except Exception:
        pass
    return meta


def parse_weather_metadata(path: str) -> dict:
    ext = os.path.splitext(path)[1].lower()
    if ext == ".epw":
        return parse_epw_metadata(path)
    return parse_sam_csv_metadata(path)


# -------------------------
# Safe setters
# -------------------------
def get_value_or_none(model, key):
    try:
        return model.value(key)
    except Exception:
        return None


def safe_set(model, key, value) -> bool:
    cur = get_value_or_none(model, key)
    if cur is None:
        return False

    if isinstance(cur, (list, tuple)) and isinstance(value, (list, tuple)):
        if len(cur) != 0 and len(value) != len(cur):
            return False

    try:
        model.value(key, value)
        return True
    except Exception:
        return False


def safe_set_first(model, candidates, value):
    for k in candidates:
        if safe_set(model, k, value):
            return True, k
    return False, None


# -------------------------
# JSON baseline loader
# -------------------------
def load_baseline_model_from_json(json_path: str):
    m = pvsam.default("FlatPlatePVNone")
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    if "inputs" in data and isinstance(data["inputs"], dict):
        data = data["inputs"]

    is_grouped = any(isinstance(v, dict) for v in data.values())

    if is_grouped:
        for group_name, group_dict in data.items():
            if not isinstance(group_dict, dict):
                continue
            if not hasattr(m, group_name):
                continue
            grp = getattr(m, group_name)
            try:
                if hasattr(grp, "assign"):
                    grp.assign(group_dict)
            except Exception:
                pass
        return m

    for k, v in data.items():
        v_use = v
        if isinstance(v, str):
            vf = _safe_float(v)
            if vf is not None:
                v_use = int(vf) if abs(vf - int(vf)) < 1e-12 else float(vf)
        safe_set(m, k, v_use)

    return m


# -------------------------
# Losses (force to zero if no baseline JSON)
# -------------------------
def force_losses_to_zero(model):
    zero_keys = [
        "subarray1_mismatch_loss",
        "subarray1_diodeconn_loss",
        "subarray1_dcwiring_loss",
        "subarray1_tracking_loss",
        "subarray1_nameplate_loss",
        "subarray1_rack_shading",
        "subarray1_electrical_mismatch",
        "acwiring_loss",
        "transformer_no_load_loss",
        "transformer_load_loss",
        "system_availability",
        "en_snow_model",
    ]
    for k in zero_keys:
        safe_set(model, k, 0)

    if not safe_set(model, "subarray1_soiling", 0):
        safe_set(model, "subarray1_soiling", [0.0] * 12)

    if not safe_set(model, "subarray1_rear_soiling_loss", 0):
        safe_set(model, "subarray1_rear_soiling_loss", [0.0] * 12)


# -------------------------
# Export model inputs to JSON
# -------------------------
def export_model_inputs_to_json(model, out_path: str):
    grouped = {}
    for name in dir(model):
        if name.startswith("_"):
            continue
        if name in ("Outputs", "execute", "value", "export"):
            continue
        obj = getattr(model, name, None)
        if obj is None:
            continue
        try:
            if hasattr(obj, "export"):
                d = obj.export()
                if isinstance(d, dict) and d:
                    grouped[name] = d
        except Exception:
            continue

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(grouped, f, indent=2)

    return out_path


# -------------------------
# Apply overrides
# -------------------------
def apply_module_user_entered(model, module_inputs):
    safe_set(model, "module_model", MODULE_MODEL_USER_ENTERED)

    isc = float(module_inputs["isc"])
    voc = float(module_inputs["voc"])
    vmp = float(module_inputs["vmp"])
    imp = float(module_inputs["imp"])

    # Physical bounds checks for CEC 6-parameter model solver
    if vmp >= voc or vmp <= 0:
        vmp = round(voc * 0.83, 2)
    if imp >= isc or imp <= 0:
        imp = round(isc * 0.95, 2)

    aisc_pct = float(module_inputs["aisc_pct"])
    bvoc_pct = float(module_inputs["bvoc_pct"])
    # Ensure bvoc_pct is strictly negative for CEC solver convergence
    bvoc_pct = -abs(bvoc_pct) if bvoc_pct != 0 else -0.25
    gpmp_pct = float(module_inputs["gpmp_pct"])
    if gpmp_pct > 0:
        gpmp_pct = -abs(gpmp_pct)

    aisc_abs = (aisc_pct / 100.0) * isc
    bvoc_abs = (bvoc_pct / 100.0) * voc

    length_m = float(module_inputs["length_m"])
    width_m = float(module_inputs["width_m"])
    aspect_ratio = compute_aspect_ratio(length_m, width_m)

    safe_set_first(
        model,
        ["module_aspect_ratio", "subarray1_aspect_ratio", "sixpar_aspect_ratio", "6par_aspect_ratio"],
        float(aspect_ratio),
    )

    base = {
        "isc": isc,
        "imp": imp,
        "voc": voc,
        "vmp": vmp,
        "aisc": aisc_abs,
        "bvoc": bvoc_abs,
        "gpmp": gpmp_pct,
        "area": float(module_inputs["area"]),
        "aspect_ratio": float(aspect_ratio),
        "celltech": float(module_inputs["celltech"]),
        "nser": float(module_inputs["nser"]),
        "tnoct": float(module_inputs["tnoct"]),
        "mounting": float(module_inputs["mounting_code"]),
        "standoff": float(module_inputs["standoff_code"]),
        "transient_thermal_model_unit_mass": float(module_inputs["mass"]),
        "is_bifacial": 1 if module_inputs["is_bifacial"] else 0,
        "bifaciality": float(module_inputs["bifaciality"]),
        "bifacial_ground_clearance_height": float(module_inputs["ground_clearance"]),
        "bifacial_transmission_factor": float(module_inputs["transmission_factor"]),
    }

    prefixes = ["sixpar_", "6par_"]
    for short_key, val in base.items():
        for pref in prefixes:
            if safe_set(model, pref + short_key, val):
                break


def apply_system_design(model, sys_inputs):
    safe_set(model, "subarray1_modules_per_string", int(sys_inputs["modules_per_string"]))
    safe_set(model, "subarray1_nstrings", int(sys_inputs["nstrings"]))

    mapping = [
        (["subarray1_track_mode"], int(sys_inputs["track_mode"])),
        (["subarray1_tilt_eq_lat"], 1 if sys_inputs["tilt_eq_lat"] else 0),
        (["subarray1_tilt"], float(sys_inputs["tilt"])),
        (["subarray1_azimuth"], float(sys_inputs["azimuth"])),
        (["subarray1_gcr"], float(sys_inputs["gcr"])),
        (["subarray1_rotlim"], float(sys_inputs["rotlim"])),
    ]
    backtrack_candidates = ["subarray1_backtrack", "subarray1_enable_backtrack", "subarray1_backtracking"]

    for keys, val in mapping:
        safe_set_first(model, keys, val)
    safe_set_first(model, backtrack_candidates, 1 if sys_inputs["backtracking"] else 0)


def apply_shading(model, shade_inputs):
    safe_set_first(model, ["subarray1_shading_en_string_option"], 0)
    safe_set_first(model, ["subarray1_shade_mode"], int(shade_inputs["self_shading_mode"]))
    safe_set_first(model, ["calculate_rack_shading"], 1 if shade_inputs["rack_shading"] else 0)

    orient_val = int(shade_inputs["module_orientation"])
    nmod_side = int(shade_inputs["modules_along_side"])
    nmod_bottom = int(shade_inputs["modules_along_bottom"])

    # SAM mapping:
    # nmodx = modules along bottom of row
    # nmody = modules along side of row
    safe_set_first(model, ["subarray1_mod_orient", "subarray1_module_orientation"], orient_val)
    safe_set_first(model, ["subarray1_nmodx"], nmod_bottom)
    safe_set_first(model, ["subarray1_nmody"], nmod_side)


def apply_advanced(model, adv_inputs):
    safe_set_first(model, ["sky_model"], int(adv_inputs["sky_model"]))
    safe_set_first(model, ["irrad_mode"], int(adv_inputs["irrad_mode"]))

    safe_set_first(model, ["use_wf_albedo"], 1 if adv_inputs["use_wf_albedo"] else 0)
    safe_set_first(model, ["use_spatial_albedos"], 1 if adv_inputs["use_spatial_albedos"] else 0)

    if adv_inputs["monthly_uniform_albedo"]:
        safe_set_first(model, ["albedo"], adv_inputs["monthly_uniform_albedo"])


def get_time_series(out_dict, key):
    if key in out_dict:
        return out_dict[key]
    low = key.lower()
    for k, v in out_dict.items():
        try:
            if low in k.lower() and hasattr(v, "__len__") and len(v) >= 1000:
                return v
        except Exception:
            continue
    return None



def build_model_for_run(weather_path, module_inputs, sys_inputs, shade_inputs, adv_inputs, baseline_json=None, config=None):
    if baseline_json:
        m = load_baseline_model_from_json(baseline_json)
    else:
        m = pvsam.default("FlatPlatePVNone")
        force_losses_to_zero(m)

    if config is not None:
        lat = config.get("Latitude")
        lon = config.get("Longitude")
        if lat is not None and lon is not None:
            try:
                m.SolarResource.replace("latitude", float(lat))
                print(f"DEBUG: Successfully overridden latitude = {lat}")
            except Exception:
                pass
            try:
                m.SolarResource.replace("longitude", float(lon))
                print(f"DEBUG: Successfully overridden longitude = {lon}")
            except Exception:
                pass
            try:
                m.SolarResource.replace("lat", float(lat))
                print(f"DEBUG: Successfully overridden lat = {lat}")
            except Exception:
                pass
            try:
                m.SolarResource.replace("lon", float(lon))
                print(f"DEBUG: Successfully overridden lon = {lon}")
            except Exception:
                pass

    apply_advanced(m, adv_inputs)
    apply_system_design(m, sys_inputs)
    apply_shading(m, shade_inputs)
    apply_module_user_entered(m, module_inputs)

    safe_set(m, "solar_resource_file", weather_path)
    try:
        m.SolarResource.solar_resource_file = weather_path
    except Exception:
        pass

    return m


def extract_ghi_dhi_from_nsrdb_csv(path: str):
    """
    Reads GHI and DHI columns from an NSRDB-format CSV weather file by
    header name lookup. Returns (ghi_vals, dhi_vals), each padded/truncated
    to exactly 8760 values.
    """
    rows = _open_csv_rows_auto_delim(path, max_rows=100000)
    header_idx = _find_row_index(rows, "Year")
    if header_idx is None:
        return [], []

    header = rows[header_idx]
    idx = {str(name).strip().lower(): k for k, name in enumerate(header)}
    ghi_idx = idx.get("ghi")
    dhi_idx = idx.get("dhi")
    if ghi_idx is None or dhi_idx is None:
        return [], []

    ghi_vals, dhi_vals = [], []
    for r in rows[header_idx + 1:]:
        ghi_vals.append(_safe_float(r[ghi_idx]) if ghi_idx < len(r) else 0.0)
        dhi_vals.append(_safe_float(r[dhi_idx]) if dhi_idx < len(r) else 0.0)

    ghi_vals = [v if v is not None else 0.0 for v in ghi_vals]
    dhi_vals = [v if v is not None else 0.0 for v in dhi_vals]

    ghi_vals = (ghi_vals + [0.0] * 8760)[:8760]
    dhi_vals = (dhi_vals + [0.0] * 8760)[:8760]
    return ghi_vals, dhi_vals


def extract_ghi_dhi_from_epw(path: str):
    """
    Reads GHI and DHI from an EPW-format weather file by fixed column
    position (confirmed against the EnergyPlus/pvlib EPW spec):
    index 13 = GHI, index 15 = DHI. Data rows start after 8 header lines.
    Returns (ghi_vals, dhi_vals), each padded/truncated to exactly 8760 values.
    """
    ghi_vals, dhi_vals = [], []
    try:
        with open(path, "r", encoding="latin-1", errors="ignore") as f:
            lines = f.readlines()
        data_lines = lines[8:]
        for line in data_lines:
            parts = line.strip().split(",")
            if len(parts) > 15:
                g = _safe_float(parts[13])
                d = _safe_float(parts[15])
                ghi_vals.append(g if g is not None else 0.0)
                dhi_vals.append(d if d is not None else 0.0)
    except Exception:
        return [], []

    ghi_vals = (ghi_vals + [0.0] * 8760)[:8760]
    dhi_vals = (dhi_vals + [0.0] * 8760)[:8760]
    return ghi_vals, dhi_vals


def extract_ghi_dhi(path: str):
    """Dispatch GHI/DHI extraction based on file extension, mirroring parse_weather_metadata."""
    ext = os.path.splitext(path)[1].lower()
    if ext == ".epw":
        return extract_ghi_dhi_from_epw(path)
    return extract_ghi_dhi_from_nsrdb_csv(path)


def run_one_weather_file(weather_path, module_inputs, sys_inputs, shade_inputs, adv_inputs, baseline_json=None, config=None):
    m = build_model_for_run(weather_path, module_inputs, sys_inputs, shade_inputs, adv_inputs, baseline_json=baseline_json, config=config)
    m.execute()
    out = m.Outputs.export()

    voc_series = get_time_series(out, "subarray1_voc")
    isc_series = get_time_series(out, "subarray1_isc")
    if voc_series is None:
        raise RuntimeError("Could not find subarray1_voc output.")
    if isc_series is None:
        raise RuntimeError("Could not find subarray1_isc output.")

    voc_vals = [float(x) for x in voc_series]
    isc_vals = [float(x) for x in isc_series]

    voc_vals = (voc_vals + [0.0] * 8760)[:8760]
    isc_vals = (isc_vals + [0.0] * 8760)[:8760]

    ghi_vals, dhi_vals = extract_ghi_dhi(weather_path)

    return voc_vals, isc_vals, ghi_vals, dhi_vals

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
INPUT_FILE = os.path.join(SCRIPT_DIR, "Input.json")
OUTPUT_FILE = os.path.join(SCRIPT_DIR, "Results.json")


NSRDB_BASE_URL = "https://developer.nlr.gov/api/nsrdb/v2/solar/nsrdb-GOES-aggregated-v4-0-0-download.csv"
NSRDB_MAX_KNOWN_YEAR = 2024

def _nsrdb_file_exists_in_folder(weather_folder: str, lat: float, lon: float, year: int) -> str | None:
    tag = f"{lat:.2f}_{lon:.2f}_{year}"
    for fn in os.listdir(weather_folder):
        if tag in fn and fn.lower().endswith(".csv"):
            return os.path.join(weather_folder, fn)
    return None

def _download_nsrdb_year(weather_folder: str, api_key: str, email: str, lat: float, lon: float, year: int) -> str:
    params = {
        "api_key": api_key,
        "email": email,
        "wkt": f"POINT({lon} {lat})",
        "names": str(year),
        "attributes": "ghi,dhi,dni,air_temperature,wind_speed",
        "interval": "60",
        "utc": "false",
        "leap_day": "false",
    }
    out_path = os.path.join(weather_folder, f"nsrdb_{lat:.2f}_{lon:.2f}_{year}.csv")
    try:
        resp = requests.get(NSRDB_BASE_URL, params=params, timeout=60)
        resp.raise_for_status()
    except requests.exceptions.RequestException as e:
        raise RuntimeError(f"NSRDB download failed for year {year} (lat={lat}, lon={lon}): {e}")
    with open(out_path, "wb") as f:
        f.write(resp.content)
    return out_path

def _find_latest_available_nsrdb_year(api_key: str, email: str, lat: float, lon: float) -> int:
    # NLR's GOES Aggregated v4.0.0 dataset enumerates available years explicitly
    # in its docs (currently 1998-2024). No need to probe per-request.
    return NSRDB_MAX_KNOWN_YEAR

def ensure_weather_files_downloaded(config: dict) -> str:
    weather_folder = config["WeatherFolder"]
    os.makedirs(weather_folder, exist_ok=True)

    api_key = os.getenv("NSRDB_API_KEY")
    email = os.getenv("NSRDB_EMAIL")
    lat = config.get("Latitude")
    lon = config.get("Longitude")

    if not api_key or not email or lat is None or lon is None:
        return weather_folder

    lat = float(lat)
    lon = float(lon)

    latest_year = _find_latest_available_nsrdb_year(api_key, email, lat, lon)
    years_needed = list(range(latest_year - 24, latest_year + 1))

    for year in years_needed:
        existing = _nsrdb_file_exists_in_folder(weather_folder, lat, lon, year)
        if existing:
            continue
        _download_nsrdb_year(weather_folder, api_key, email, lat, lon, year)
        time.sleep(1)

    return weather_folder

def ensure_weather_files_downloaded_stream(config: dict):
    weather_folder = config["WeatherFolder"]
    os.makedirs(weather_folder, exist_ok=True)

    api_key = os.getenv("NSRDB_API_KEY")
    email = os.getenv("NSRDB_EMAIL")
    lat = config.get("Latitude")
    lon = config.get("Longitude")

    if not api_key or not email or lat is None or lon is None:
        yield {"type": "progress", "pct": 100, "message": "Using local cached weather files"}
        return

    lat = float(lat)
    lon = float(lon)

    latest_year = _find_latest_available_nsrdb_year(api_key, email, lat, lon)
    years_needed = list(range(latest_year - 24, latest_year + 1))
    
    total = len(years_needed)
    sb_config = get_supabase_rest_config()
    bucket_name = "weather_cache"
    
    for idx, year in enumerate(years_needed):
        pct = (idx / total) * 50
        yield {"type": "progress", "pct": pct, "message": f"Checking weather data for {year}..."}
        
        existing = _nsrdb_file_exists_in_folder(weather_folder, lat, lon, year)
        if existing:
            continue
            
        filename = f"nsrdb_{lat:.2f}_{lon:.2f}_{year}.csv"
        out_path = os.path.join(weather_folder, filename)
        
        # 1) Try Supabase cache first (Using stable REST API)
        downloaded_from_supabase = False
        if sb_config:
            try:
                storage_url = f"{sb_config['url']}/storage/v1/object/{bucket_name}/{filename}"
                headers = {
                    "apikey": sb_config['key'],
                    "Authorization": f"Bearer {sb_config['key']}"
                }
                res = requests.get(storage_url, headers=headers, timeout=5)
                if res.status_code == 200:
                    with open(out_path, "wb") as f:
                        f.write(res.content)
                    downloaded_from_supabase = True
                    yield {"type": "progress", "pct": pct, "message": f"Loaded weather data for {year} from database cache..."}
            except Exception as e:
                print(f"Supabase cache download failed for {filename}: {e}")
                
        if downloaded_from_supabase:
            continue
            
        yield {"type": "progress", "pct": pct, "message": f"Downloading weather data for {year} (NSRDB)..."}
        _download_nsrdb_year(weather_folder, api_key, email, lat, lon, year)
        
        # 2) Upload to Supabase cache for future use (Using stable REST API)
        if sb_config and os.path.exists(out_path):
            try:
                storage_url = f"{sb_config['url']}/storage/v1/object/{bucket_name}/{filename}"
                headers = {
                    "apikey": sb_config['key'],
                    "Authorization": f"Bearer {sb_config['key']}",
                    "Content-Type": "text/csv"
                }
                with open(out_path, "rb") as f:
                    res = requests.post(storage_url, headers=headers, data=f, timeout=10)
                    if res.status_code >= 400:
                        print(f"Supabase upload returned {res.status_code}: {res.text}")
            except Exception as e:
                print(f"Supabase cache upload failed for {filename}: {e}")
                
        time.sleep(1)

    yield {"type": "progress", "pct": 50, "message": "All weather data ready. Starting PySAM simulation..."}
    return


def process_all_weather_files(config):
    weather_folder = ensure_weather_files_downloaded(config)
    config["WeatherFolder"] = weather_folder

    baseline_json = config.get("BaselineJson", "")

    # Module Inputs
    module_inputs = {
        "celltech": 0 if config["CellType"] == "monoSi" else 1,
        "vmp": config["Vmp"],
        "imp": config["Imp"],
        "voc": config["Voc"],
        "isc": config["Isc"],
        "bvoc_pct": config["BvocPct"],
        "aisc_pct": config["AiscPct"],
        "gpmp_pct": config["GpmpPct"],
        "nser": config["Nser"],
        "tnoct": config["Tnoct"],
        "length_m": config["Length"],
        "width_m": config["Width"],
        "area": config["Area"],
        "is_bifacial": config["IsBifacial"],
        "bifaciality": config["Bifaciality"],
        "transmission_factor": config["TransmissionFactor"],
        "ground_clearance": config["GroundClearance"],
        "mass": config["Mass"],
        "module_model": 2,
    }

    # Standoff Mapping
    standoff_map = {
        "Building integrated": 0,
        "Greater than 3.5in": 1,
        "2.5-3.5in": 2,
        "1.5-2.5in": 3,
        "0.5-1.5in": 4,
        "Less than 0.5in": 5,
        "Ground or rack mounted": 6,
    }

    module_inputs["standoff_code"] = standoff_map.get(
        config["Standoff"], 6
    )

    # Mounting Mapping
    mounting_map = {
        "One story building height or lower": 0,
        "Two story building height or higher": 1,
    }

    module_inputs["mounting_code"] = mounting_map.get(
        config["Mounting"], 1
    )

    # System Design
    track_map = {
        "Fixed": 0,
        "1 Axis": 1,
        "2 Axis": 2,
        "Azimuth Axis": 3,
        "Seasonal Tilt": 4,
    }

    sys_inputs = {
        "modules_per_string": config["ModulesPerString"],
        "nstrings": config["NStrings"],
        "track_mode": track_map.get(
            config["TrackingMode"], 1
        ),
        "backtracking": config["Backtracking"],
        "tilt_eq_lat": config["TiltEqualsLatitude"],
        "tilt": config["Tilt"],
        "azimuth": config["Azimuth"],
        "gcr": config["Gcr"],
        "rotlim": config["RotationLimit"],
    }

    # Shading
    shade_inputs = {
        "self_shading_mode":
            0 if config["SelfShading"] == "None" else 1,

        "rack_shading":
            config["RackShading"],

        "module_orientation":
            0 if config["ModuleOrientation"] == "Portrait" else 1,

        "modules_along_side":
            config["ModulesAlongSide"],

        "modules_along_bottom":
            config["ModulesAlongBottom"],
    }

    # Advanced
    sky_model_map = {
        "Isotropic": 0,
        "HDKR": 1,
        "Perez": 2,
    }

    irrad_mode_map = {
        "DNI and DHI": 0,
        "DNI and GHI": 1,
        "GHI and DHI": 2,
        "POA from reference cell": 3,
        "POA from pyranometer": 4,
    }

    monthly_albedo = []

    if config["MonthlyAlbedo"]:
        monthly_albedo = [
            float(x.strip())
            for x in config["MonthlyAlbedo"].split(",")
        ]

    adv_inputs = {
        "sky_model":
            sky_model_map.get(
                config["SkyModel"], 2
            ),

        "irrad_mode":
            irrad_mode_map.get(
                config["IrradianceMode"], 0
            ),

        "use_wf_albedo":
            config["UseWeatherAlbedo"],

        "use_spatial_albedos":
            config["UseSpatialAlbedo"],

        "monthly_uniform_albedo":
            monthly_albedo,
    }
        
    inverter_inputs = {
        "nominal_ac_voltage": config["NominalAcVoltage"],
        "maximum_dc_voltage": config["MaximumDcVoltage"],
        "maximum_dc_current": config["MaximumDcCurrent"],
        "minimum_mppt_voltage": config["MinimumMpptVoltage"],
        "nominal_dc_voltage": config["NominalDcVoltage"],
        "maximum_mppt_voltage": config["MaximumMpptVoltage"],
        "mppt_inputs": config["MpptInputs"]
    }

    weather_files = list_weather_files(weather_folder)

    voc_summary = []
    isc_summary = []

    voc_by_year = {}
    isc_by_year = {}
    ghi_by_year = {}
    dhi_by_year = {}

    for wf in weather_files:

        year = extract_year_from_filename(wf)

        voc_vals, isc_vals, ghi_vals, dhi_vals = run_one_weather_file(
            wf,
            module_inputs,
            sys_inputs,
            shade_inputs,
            adv_inputs,
            baseline_json=baseline_json,
            config=config
        )

        voc_by_year[year] = voc_vals
        isc_by_year[year] = isc_vals
        ghi_by_year[year] = ghi_vals
        dhi_by_year[year] = dhi_vals

        # Calculate VOC summary
        valid_vocs = [v for v in voc_vals if v > 0]
        max_voltage = round(max(valid_vocs), 2) if valid_vocs else 0.0
        min_voltage = round(min(valid_vocs), 2) if valid_vocs else 0.0
        voc_summary.append({
            "year": str(year),
            "maxVoltage": max_voltage,
            "minVoltage": min_voltage
        })

        # Calculate ISC summary (highest 3hr avg around noon)
        max_daily_avg = -float('inf')
        best_h1, best_h2, best_h3 = 0, 0, 0
        days = len(isc_vals) // 24
        for day in range(days):
            base = day * 24
            if base + 13 < len(isc_vals):
                v1 = isc_vals[base + 11]
                v2 = isc_vals[base + 12]
                v3 = isc_vals[base + 13]
                daily_avg = (v1 + v2 + v3) / 3.0
                if daily_avg > max_daily_avg:
                    max_daily_avg = daily_avg
                    best_h1, best_h2, best_h3 = v1, v2, v3
        
        isc_summary.append({
            "year": str(year),
            "h1": round(best_h1, 2),
            "h2": round(best_h2, 2),
            "h3": round(best_h3, 2),
            "avg": round(max_daily_avg, 2)
        })

    return {
        "voc_summary": voc_summary,
        "isc_summary": isc_summary,
        "voc_by_year": voc_by_year,
        "isc_by_year": isc_by_year,
        "ghi_by_year": ghi_by_year,
        "dhi_by_year": dhi_by_year,
    }

def process_all_weather_files_stream(config):
    weather_stream = ensure_weather_files_downloaded_stream(config)
    for event in weather_stream:
        yield event
        
    weather_folder = config["WeatherFolder"]
    baseline_json = config.get("BaselineJson", "")

    # Module Inputs
    module_inputs = {
        "celltech": 0 if config["CellType"] == "monoSi" else 1,
        "vmp": config["Vmp"],
        "imp": config["Imp"],
        "voc": config["Voc"],
        "isc": config["Isc"],
        "bvoc_pct": config["BvocPct"],
        "aisc_pct": config["AiscPct"],
        "gpmp_pct": config["GpmpPct"],
        "nser": config["Nser"],
        "tnoct": config["Tnoct"],
        "length_m": config["Length"],
        "width_m": config["Width"],
        "area": config["Area"],
        "is_bifacial": config["IsBifacial"],
        "bifaciality": config["Bifaciality"],
        "transmission_factor": config["TransmissionFactor"],
        "ground_clearance": config["GroundClearance"],
        "mass": config["Mass"],
        "module_model": 2,
    }

    # Standoff Mapping
    standoff_map = {
        "Building integrated": 0,
        "Greater than 3.5in": 1,
        "2.5-3.5in": 2,
        "1.5-2.5in": 3,
        "0.5-1.5in": 4,
        "Less than 0.5in": 5,
        "Ground or rack mounted": 6,
    }

    module_inputs["standoff_code"] = standoff_map.get(
        config["Standoff"], 6
    )

    # Mounting Mapping
    mounting_map = {
        "One story building height or lower": 0,
        "Two story building height or higher": 1,
    }

    module_inputs["mounting_code"] = mounting_map.get(
        config["Mounting"], 1
    )

    # System Design
    track_map = {
        "Fixed": 0,
        "1 Axis": 1,
        "2 Axis": 2,
        "Azimuth Axis": 3,
        "Seasonal Tilt": 4,
    }

    sys_inputs = {
        "modules_per_string": config["ModulesPerString"],
        "nstrings": config["NStrings"],
        "track_mode": track_map.get(
            config["TrackingMode"], 1
        ),
        "backtracking": config["Backtracking"],
        "tilt_eq_lat": config["TiltEqualsLatitude"],
        "tilt": config["Tilt"],
        "azimuth": config["Azimuth"],
        "gcr": config["Gcr"],
        "rotlim": config["RotationLimit"],
    }

    # Shading
    shade_inputs = {
        "self_shading_mode":
            0 if config["SelfShading"] == "None" else 1,

        "rack_shading":
            config["RackShading"],

        "module_orientation":
            0 if config["ModuleOrientation"] == "Portrait" else 1,

        "modules_along_side":
            config["ModulesAlongSide"],

        "modules_along_bottom":
            config["ModulesAlongBottom"],
    }

    # Advanced
    sky_model_map = {
        "Isotropic": 0,
        "HDKR": 1,
        "Perez": 2,
    }

    irrad_mode_map = {
        "DNI and DHI": 0,
        "DNI and GHI": 1,
        "GHI and DHI": 2,
        "POA from reference cell": 3,
        "POA from pyranometer": 4,
    }

    monthly_albedo = []

    if config["MonthlyAlbedo"]:
        monthly_albedo = [
            float(x.strip())
            for x in config["MonthlyAlbedo"].split(",")
        ]

    adv_inputs = {
        "sky_model":
            sky_model_map.get(
                config["SkyModel"], 2
            ),

        "irrad_mode":
            irrad_mode_map.get(
                config["IrradianceMode"], 0
            ),

        "use_wf_albedo":
            config["UseWeatherAlbedo"],

        "use_spatial_albedos":
            config["UseSpatialAlbedo"],

        "monthly_uniform_albedo":
            monthly_albedo,
    }
        
    inverter_inputs = {
        "nominal_ac_voltage": config["NominalAcVoltage"],
        "maximum_dc_voltage": config["MaximumDcVoltage"],
        "maximum_dc_current": config["MaximumDcCurrent"],
        "minimum_mppt_voltage": config["MinimumMpptVoltage"],
        "nominal_dc_voltage": config["NominalDcVoltage"],
        "maximum_mppt_voltage": config["MaximumMpptVoltage"],
        "mppt_inputs": config["MpptInputs"]
    }

    weather_files = list_weather_files(weather_folder)

    voc_summary = []
    isc_summary = []

    voc_by_year = {}
    isc_by_year = {}
    ghi_by_year = {}
    dhi_by_year = {}

    total_files = len(weather_files)
    
    for idx, wf in enumerate(weather_files):
        year = extract_year_from_filename(wf)
        
        pct = 50 + ((idx / max(1, total_files)) * 50)
        yield {"type": "progress", "pct": pct, "message": f"Running PySAM simulation for year {year}..."}

        voc_vals, isc_vals, ghi_vals, dhi_vals = run_one_weather_file(
            wf,
            module_inputs,
            sys_inputs,
            shade_inputs,
            adv_inputs,
            baseline_json=baseline_json,
            config=config
        )

        voc_by_year[year] = voc_vals
        isc_by_year[year] = isc_vals
        ghi_by_year[year] = ghi_vals
        dhi_by_year[year] = dhi_vals

        # Calculate VOC summary
        valid_vocs = [v for v in voc_vals if v > 0]
        max_voltage = round(max(valid_vocs), 2) if valid_vocs else 0.0
        min_voltage = round(min(valid_vocs), 2) if valid_vocs else 0.0
        voc_summary.append({
            "year": str(year),
            "maxVoltage": max_voltage,
            "minVoltage": min_voltage
        })

        # Calculate ISC summary (highest 3hr avg around noon)
        max_daily_avg = -float('inf')
        best_h1, best_h2, best_h3 = 0, 0, 0
        best_day = 0
        days = len(isc_vals) // 24
        for day in range(days):
            base = day * 24
            if base + 13 < len(isc_vals):
                v1 = isc_vals[base + 11]
                v2 = isc_vals[base + 12]
                v3 = isc_vals[base + 13]
                daily_avg = (v1 + v2 + v3) / 3.0
                if daily_avg > max_daily_avg:
                    max_daily_avg = daily_avg
                    best_h1, best_h2, best_h3 = v1, v2, v3
                    best_day = day
        
        try:
            best_date = datetime(int(year), 1, 1) + timedelta(days=best_day)
        except Exception:
            best_date = datetime.now()
            
        def format_dt(dt, hr):
            return f"{dt.day:02d}/{dt.month:02d}/{dt.year} {hr:02d}:00"
            
        b_idx = best_day * 24
        g1 = ghi_vals[b_idx + 11] if b_idx + 11 < len(ghi_vals) else 0
        g2 = ghi_vals[b_idx + 12] if b_idx + 12 < len(ghi_vals) else 0
        g3 = ghi_vals[b_idx + 13] if b_idx + 13 < len(ghi_vals) else 0
        
        d1 = dhi_vals[b_idx + 11] if b_idx + 11 < len(dhi_vals) else 0
        d2 = dhi_vals[b_idx + 12] if b_idx + 12 < len(dhi_vals) else 0
        d3 = dhi_vals[b_idx + 13] if b_idx + 13 < len(dhi_vals) else 0

        entry = {
            "year": str(year),
            "h1": round(best_h1, 2),
            "h2": round(best_h2, 2),
            "h3": round(best_h3, 2),
            "avg": round(max_daily_avg, 2),
            "t1_datetime": format_dt(best_date, 11),
            "t2_datetime": format_dt(best_date, 12),
            "t3_datetime": format_dt(best_date, 13),
            "t1_ghi": round(g1, 2),
            "t2_ghi": round(g2, 2),
            "t3_ghi": round(g3, 2),
            "t1_dhi": round(d1, 2),
            "t2_dhi": round(d2, 2),
            "t3_dhi": round(d3, 2),
            "t1_isc": round(best_h1, 2),
            "t2_isc": round(best_h2, 2),
            "t3_isc": round(best_h3, 2)
        }
        print(f"[PySAMRunner] Year {year}: Peak Day={best_day}, t1_dt={entry['t1_datetime']}, g1={entry['t1_ghi']}, d1={entry['t1_dhi']}, h1={entry['h1']}")
        isc_summary.append(entry)

    # Cleanup local weather folder to save space on ephemeral filesystems (like Render)
    if os.path.exists(weather_folder):
        try:
            shutil.rmtree(weather_folder, ignore_errors=True)
        except Exception:
            pass

    yield {
        "type": "result",
        "data": {
            "voc_summary": voc_summary,
            "isc_summary": isc_summary,
            "voc_by_year": voc_by_year,
            "isc_by_year": isc_by_year,
            "ghi_by_year": ghi_by_year,
            "dhi_by_year": dhi_by_year,
        }
    }

def main():

    if not os.path.exists(INPUT_FILE):
        raise FileNotFoundError(
            f"Input file not found: {INPUT_FILE}. Place Input.json next to PySAMRunner.py or update the path."
        )

    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        config = json.load(f)

    results = process_all_weather_files(config)

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=4)


if __name__ == "__main__":

    try:
        main()

    except Exception as ex:

        with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
            json.dump(
                {
                    "error": str(ex),
                    "traceback": traceback.format_exc()
                },
                f,
                indent=4
            )

        raise