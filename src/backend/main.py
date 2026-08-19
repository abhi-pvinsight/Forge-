import sys
import asyncio
import re
import os as _os
import os
import io
import json
import tempfile
import traceback
import uuid
from typing import Optional, Union, Any
from datetime import datetime
from contextlib import asynccontextmanager

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

from dotenv import load_dotenv
_root = _os.path.abspath(_os.path.join(_os.path.dirname(__file__), "..", ".."))
load_dotenv(_os.path.join(_root, ".env.local"))
load_dotenv(_os.path.join(_root, ".env"))

from fastapi import FastAPI, UploadFile, File, Request, Depends, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel
from sqlalchemy import or_, func, false as sql_false
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from app.auth import (
    get_db, get_current_user, get_default_organization_id,
    create_access_token, get_password_hash, verify_password
)
from app.database import (
    init_db, Profile, Organization, Report, ReportComment, Client, Project,
    Department, Vertical, MasterReportTemplate, PVReport, BatteryReport,
    PCSReport, InverterReport, TransformerReport, SwitchgearReport, CableReport,
    RelayProtectionReport, ElectricalDesignReport, StructuralReport, GroundingReport
)

from calculationRepo.generateSolarReport import build_solar_report_data, build_solar_report_pdf 
from Ashrae.ashrae_service import process_and_populate_report
from parsers.pvsyst_parser import extract_pvsyst_data
from pdf_utils import (
    generate_pdf_from_html,
    generate_pdf_with_toc,
    log_memory,
    merge_pdf_documents,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Schema is fully managed by init_db() — Alembic is NOT used at runtime.
    # init_db() auto-detects corrupt schemas (VARCHAR IDs), rebuilds, seeds, and patches.
    try:
        init_db()
    except Exception as e:
        print(f"init_db error: {e}")
        raise  # Surface fatal DB errors so the server doesn't start silently broken
    yield


app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def health_check():
    """Simple root health check endpoint returning 200 OK."""
    return {"status": "healthy", "service": "Forge-Backend"}


@app.get("/api/diag-db")
def diag_db(db: Session = Depends(get_db)):
    try:
        orgs = db.query(Organization).all()
        profiles = db.query(Profile).all()
        org_id = get_default_organization_id(db)
        
        return {
            "organizations": [o.__dict__ for o in orgs],
            "profiles": [p.__dict__ for p in profiles],
            "default_org_id": org_id,
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


class AshraeRequest(BaseModel):
    latitude: float
    longitude: float

class SolarReportRequest(BaseModel):
    values: dict

class PySAMRequest(BaseModel):
    values: dict


@app.post("/extract/pvsyst")
async def extract_pvsyst(file: UploadFile = File(...)):
    with tempfile.NamedTemporaryFile(
        delete=False,
        suffix=".pdf"
    ) as temp_file:
        contents = await file.read()
        temp_file.write(contents)
        temp_path = temp_file.name

    try:
        result = extract_pvsyst_data(temp_path)
        return {
            "success": True,
            "data": result
        }
    except Exception as e:
        traceback.print_exc()
        return {
            "success": False,
            "error": str(e)
        }
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


@app.post("/ashrae")
def generate_ashrae(data: AshraeRequest):
    try:
        data_map = process_and_populate_report(
            data.latitude,
            data.longitude
        )
        return {
            "success": True,
            "message": "ASHRAE data generated",
            "data": data_map
        }
    except Exception as e:
        traceback.print_exc()
        return {
            "success": False,
            "error": str(e)
        }


def safe_float(val, default):
    if val is None:
        return float(default)
    try:
        s = str(val).strip()
        if not s:
            return float(default)
        match = re.search(r'[-+]?\d*\.?\d+', s)
        if match:
            return float(match.group(0))
        return float(default)
    except Exception:
        return float(default)


def safe_int(val, default):
    if val is None:
        return int(default)
    try:
        s = str(val).strip()
        if not s:
            return int(default)
        match = re.search(r'\d+', s)
        if match:
            return int(match.group(0))
        return int(default)
    except Exception:
        return int(default)


def build_pysam_config(values: dict, weather_folder: str) -> dict:
    # 1. Module / Physics Params (from parseModuleExcel.js or direct keys)
    nser = safe_int(values.get("nser") or values.get("cell_count"), 72)
    voc = safe_float(values.get("moduleVoc") or values.get("voc"), 52.0)
    vmp = safe_float(values.get("moduleVmp") or values.get("vmp"), 43.4)
    isc = safe_float(values.get("moduleIsc") or values.get("isc"), 14.0)
    imp = safe_float(values.get("moduleImp") or values.get("imp"), 13.3)
    bvoc = safe_float(values.get("tempCoeffVoc") or values.get("temp_coeff_voc"), -0.25)
    aisc = safe_float(values.get("temp_coeff_isc") or values.get("tempCoeffIsc"), 0.05)
    gpmp = safe_float(values.get("temp_coeff_pm") or values.get("tempCoeffPm"), -0.4)
    tnoct = safe_float(values.get("noct") or values.get("tnoct"), 45.0)

    # Enforce physical sanity for CEC 6-parameter model solver
    if vmp >= voc or vmp <= 0:
        vmp = round(voc * 0.83, 2)
    if imp >= isc or imp <= 0:
        imp = round(isc * 0.95, 2)
    bvoc = -abs(bvoc) if bvoc != 0 else -0.25
    if gpmp > 0:
        gpmp = -abs(gpmp)

    # Dimensions
    length_m = safe_float(values.get("module_length"), 2.0)
    if length_m > 50:
        length_m = length_m / 1000.0
    width_m = safe_float(values.get("module_width"), 1.0)
    if width_m > 50:
        width_m = width_m / 1000.0
    area_m2 = safe_float(values.get("module_area"), length_m * width_m)
    mass_kg = safe_float(values.get("module_weight") or values.get("mass"), 25.0)

    # Bifacial Specs
    is_bifacial_val = values.get("is_bifacial", 0)
    if isinstance(is_bifacial_val, str):
        is_bifacial_num = 1 if "yes" in is_bifacial_val.lower() or "bifacial" in is_bifacial_val.lower() else 0
    else:
        is_bifacial_num = 1 if is_bifacial_val else 0

    bifaciality = safe_float(values.get("bifaciality"), 0.7)
    transmission_factor = safe_float(values.get("transmission_factor"), 0.0)
    ground_clearance = safe_float(values.get("ground_clearance"), 1.0)

    # Inverter / PCS Technical Specs
    max_dc_v = safe_float(values.get("PCS_Max_DC_Input_Voltage"), 1500.0)
    max_dc_i = safe_float(values.get("PCS_Max_PV_Input_Current") or values.get("PCS_Max_PV_Short_Circuit_Current"), 200.0)
    mppt_min_v = safe_float(values.get("PCS_MPP_Tracker_Min_Voltage_Range") or values.get("PCS_Min_PV_Input_Voltage"), 500.0)
    mppt_max_v = safe_float(values.get("PCS_MPP_Tracker_Max_Voltage_Range"), 1300.0)
    mppt_inputs = safe_int(values.get("PCS_No_of_Independent_MPPT"), 1)
    nom_ac_v = safe_float(values.get("PCS_Transformer_LV_MV_Voltage") or values.get("lv_voltage"), 400.0)
    nom_dc_v = safe_float(values.get("PCS_Full_Power_MPP_Voltage_Range_40C"), 800.0)

    # Array Layout & Geometry
    modules_per_string = safe_int(values.get("modules_series") or values.get("string_size"), 28)
    nstrings = safe_int(values.get("nstrings"), 100)

    gcr_val = safe_float(values.get("gcr"), 33.2)
    if gcr_val > 1.0:
        gcr_val = gcr_val / 100.0
    tilt_val = safe_float(values.get("tilt"), 20.0)
    azimuth_val = safe_float(values.get("azimuth"), 180.0)

    # Sky Model & Irradiance Mode & Albedo
    sky_model = str(values.get("sky_model", "Isotropic")).strip()
    irrad_mode = str(values.get("irrad_mode", "DNI and DHI")).strip()

    months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]
    albedo_list = []
    for m in months:
        alb = safe_float(values.get(f"albedo_{m}"), 0.20)
        albedo_list.append(str(alb))
    monthly_albedo_str = ",".join(albedo_list)

    return {
        "WeatherFolder": weather_folder,
        "BaselineJson": "",
        "CellType": values.get("cell_type") or values.get("module_type") or "monoSi",
        "Vmp": vmp,
        "Imp": imp,
        "Voc": voc,
        "Isc": isc,
        "BvocPct": bvoc,
        "AiscPct": aisc,
        "GpmpPct": gpmp,
        "Nser": nser,
        "Tnoct": tnoct,
        "Length": length_m,
        "Width": width_m,
        "Area": area_m2,
        "IsBifacial": is_bifacial_num,
        "Bifaciality": bifaciality,
        "TransmissionFactor": transmission_factor,
        "GroundClearance": ground_clearance,
        "Mass": mass_kg,
        "Standoff": values.get("standoff", "Ground or rack mounted"),
        "Mounting": values.get("mounting", "One story building height or lower"),
        "ModulesPerString": modules_per_string,
        "NStrings": nstrings,
        "TrackingMode": values.get("track_mode", "Fixed"),
        "Backtracking": safe_int(values.get("backtracking"), 0),
        "TiltEqualsLatitude": safe_int(values.get("tilt_eq_lat"), 0),
        "Tilt": tilt_val,
        "Azimuth": azimuth_val,
        "Gcr": gcr_val,
        "RotationLimit": safe_float(values.get("rotlim"), 60.0),
        "SelfShading": values.get("self_shading", "None"),
        "RackShading": safe_int(values.get("rack_shading"), 0),
        "ModuleOrientation": values.get("module_orientation", "Portrait"),
        "ModulesAlongSide": 2,
        "ModulesAlongBottom": 20,
        "SkyModel": sky_model,
        "IrradianceMode": irrad_mode,
        "UseWeatherAlbedo": safe_int(values.get("use_weather_albedo"), 0),
        "UseSpatialAlbedo": safe_int(values.get("use_spatial_albedo"), 0),
        "MonthlyAlbedo": monthly_albedo_str,
        "NominalAcVoltage": nom_ac_v,
        "MaximumDcVoltage": max_dc_v,
        "MaximumDcCurrent": max_dc_i,
        "MinimumMpptVoltage": mppt_min_v,
        "NominalDcVoltage": nom_dc_v,
        "MaximumMpptVoltage": mppt_max_v,
        "MpptInputs": mppt_inputs,
        "Latitude": safe_float(values.get("latitude"), 35.0),
        "Longitude": safe_float(values.get("longitude"), -106.0)
    }


@app.post("/api/run-pysam")
async def run_pysam_endpoint(payload: PySAMRequest):
    try:
        from PySAMRunner import process_all_weather_files
        weather_folder = os.path.join(os.path.dirname(__file__), "weather_cache")
        config = build_pysam_config(payload.values, weather_folder)

        results = process_all_weather_files(config)

        return {
            "success": True,
            "data": results
        }
    except Exception as e:
        traceback.print_exc()
        return {
            "success": False,
            "error": str(e)
        }


@app.post("/api/run-pysam-stream")
async def run_pysam_stream_endpoint(payload: PySAMRequest):
    try:
        from PySAMRunner import process_all_weather_files_stream
        weather_folder = os.path.join(tempfile.gettempdir(), "weather_cache")
        config = build_pysam_config(payload.values, weather_folder)

        async def event_generator():
            for event in process_all_weather_files_stream(config):
                yield f"data: {json.dumps(event)}\n\n"
                await asyncio.sleep(0.01)

        return StreamingResponse(event_generator(), media_type="text/event-stream")

    except Exception as e:
        traceback.print_exc()
        async def error_generator():
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
        return StreamingResponse(error_generator(), media_type="text/event-stream")


@app.post("/generate-solar-report-data")
async def generate_solar_report_data_endpoint(payload: SolarReportRequest):
    report_data = build_solar_report_data(payload.values)
    return {
        "success": True,
        "calc_table": report_data["calc_table"],
        "calc_values": report_data["calc_values"]
    }


@app.post("/generate-solar-report-pdf")
async def generate_solar_report_pdf_endpoint(payload: SolarReportRequest):
    report_data = build_solar_report_data(payload.values)
    pdf_buffer = io.BytesIO()
    build_solar_report_pdf(report_data, pdf_buffer)
    
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=Solar_String_Sizing_Report.pdf"}
    )


@app.post("/api/generate-pdf")
async def generate_pdf_endpoint(payload: dict, request: Request):
    """Receive the full HTML string from the front‑end and return a PDF."""
    html = payload.get("html")
    if not html:
        return JSONResponse(
            status_code=400,
            content={"status": "error", "message": "Missing html content"},
        )
    pdf_bytes = await generate_pdf_from_html(html, browser=None, format="Letter")
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=report.pdf"},
    )


@app.post("/api/generate-pdf-with-toc")
async def generate_pdf_with_toc_endpoint(payload: dict, request: Request):
    """Render once, patch TOC numbers, then merge an optional native appendix."""
    html = payload.get("html")
    if not html:
        return JSONResponse(
            status_code=400,
            content={"status": "error", "message": "Missing html content"},
        )
    pdf_bytes = await generate_pdf_with_toc(html, browser=None, format="Letter")

    solar_appendix_values = payload.get("solar_appendix_values")
    if isinstance(solar_appendix_values, dict) and solar_appendix_values:
        log_memory("Before native appendix generation")
        report_data = build_solar_report_data(solar_appendix_values)
        appendix_buffer = io.BytesIO()
        build_solar_report_pdf(report_data, appendix_buffer)
        pdf_bytes = merge_pdf_documents(pdf_bytes, appendix_buffer.getvalue())
        appendix_buffer.close()
        log_memory("After native appendix merge")

    pvsyst_pdf_base64 = payload.get("pvsyst_pdf_base64")
    if pvsyst_pdf_base64 and isinstance(pvsyst_pdf_base64, str):
        try:
            import base64
            raw_b64 = pvsyst_pdf_base64.split(",")[-1]
            pvsyst_bytes = base64.b64decode(raw_b64)
            pdf_bytes = merge_pdf_documents(pdf_bytes, pvsyst_bytes)
            print(f"[PROFILE] Successfully merged uploaded PVsyst PDF ({len(pvsyst_bytes)} bytes)")
        except Exception as e:
            print(f"[ERROR] Failed to merge uploaded PVsyst PDF: {e}")

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=report.pdf"},
    )


# ─── LOCAL DB AUTHENTICATION ENDPOINTS ──────────────────────────────────

class AuthSignInRequest(BaseModel):
    email: str
    password: str


class AuthSignUpRequest(BaseModel):
    full_name: str
    email: str
    department: str
    vertical: Optional[str] = None
    password: str


class AuthRefreshRequest(BaseModel):
    refresh_token: str


class AuthForgotPasswordRequest(BaseModel):
    email: str


@app.post("/api/auth/sign-in")
def auth_sign_in(payload: AuthSignInRequest, db: Session = Depends(get_db)):
    try:
        normalized_email = payload.email.strip().lower()
        user = db.query(Profile).filter(Profile.email == normalized_email).first()
        if not user:
            return JSONResponse(status_code=401, content={"success": False, "error": "No account found with that email."})
        if not verify_password(payload.password, user.hashed_password):
            return JSONResponse(status_code=401, content={"success": False, "error": "Incorrect password."})

        user_id_str  = str(user.id)
        access_token = create_access_token(data={"sub": user_id_str})

        return {
            "success": True,
            "session": {"access_token": access_token},
            "user": {
                "id":         user_id_str,
                "email":      user.email,
                "full_name":  user.full_name,
                "role":       user.role,
                "department": user.department,
                "vertical":   user.vertical,
                "user_metadata": {"full_name": user.full_name},
            },
        }
    except Exception as e:
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})


@app.post("/api/auth/sign-up")
def auth_sign_up(payload: AuthSignUpRequest, db: Session = Depends(get_db)):
    try:
        normalized_email      = payload.email.strip().lower()
        normalized_full_name  = payload.full_name.strip()
        normalized_department = payload.department.strip()
        normalized_vertical   = payload.vertical.strip() if payload.vertical else None

        existing = db.query(Profile).filter(Profile.email == normalized_email).first()
        if existing:
            return JSONResponse(status_code=409, content={"success": False, "error": "Email already registered."})

        org = db.query(Organization).first()
        if not org:
            org = Organization(name=os.getenv("DEFAULT_ORGANIZATION_NAME", "PV-Insight"))
            db.add(org)
            db.commit()
            db.refresh(org)

        org_id_str = str(org.id)

        user_count  = db.query(Profile).count()
        role        = "admin" if user_count == 0 else "member"

        new_uuid    = uuid.uuid4()
        user_id_str = str(new_uuid)

        new_profile = Profile(
            id              = new_uuid,
            email           = normalized_email,
            hashed_password = get_password_hash(payload.password),
            organization_id = org.id,
            role            = role,
            full_name       = normalized_full_name,
            department      = normalized_department,
            vertical        = normalized_vertical,
        )
        db.add(new_profile)
        db.commit()

        access_token = create_access_token(data={"sub": user_id_str})

        return {
            "success": True,
            "session": {"access_token": access_token},
            "user": {
                "id":         user_id_str,
                "email":      normalized_email,
                "full_name":  normalized_full_name,
                "role":       role,
                "department": normalized_department,
                "vertical":   normalized_vertical,
                "user_metadata": {"full_name": normalized_full_name},
            },
            "profile": {
                "id":              user_id_str,
                "organization_id": org_id_str,
                "role":            role,
                "full_name":       normalized_full_name,
                "department":      normalized_department,
                "vertical":        normalized_vertical,
            },
            "organization": {
                "id":   org_id_str,
                "name": org.name,
            },
        }
    except Exception as e:
        db.rollback()
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})


@app.get("/api/auth/me")
async def auth_me(current_user: dict = Depends(get_current_user)):
    """Validate the bearer token and return the current local user."""
    return {"success": True, "user": current_user}


@app.post("/api/auth/refresh")
def auth_refresh(payload: AuthRefreshRequest):
    return JSONResponse(status_code=400, content={"success": False, "error": "Not implemented"})


@app.post("/api/auth/forgot-password")
def auth_forgot_password(payload: AuthForgotPasswordRequest):
    """Password reset stub endpoint."""
    return {"success": True, "message": "If an account exists, a reset link will be sent."}


# ─── LOCAL DB API ENDPOINTS ───────────────────────────────────────────────

@app.get("/api/users")
def get_users_list(
    department: Optional[str] = None,
    vertical: Optional[str] = None,
    role: Optional[str] = None,
    db: Session = Depends(get_db)
):
    try:
        query = db.query(Profile)
        if department:
            query = query.filter(Profile.department.ilike(f"%{department.strip()}%"))
        if vertical:
            query = query.filter(Profile.vertical.ilike(f"%{vertical.strip()}%"))
        if role:
            query = query.filter(Profile.role.ilike(f"%{role.strip()}%"))
        profiles = query.all()
        
        return {
            "success": True,
            "users": [
                {
                    "id": str(p.id),
                    "full_name": p.full_name,
                    "name": p.full_name,
                    "email": p.email,
                    "role": p.role,
                    "department": p.department,
                    "vertical": p.vertical,
                    "organization_id": str(p.organization_id) if p.organization_id else None,
                }
                for p in profiles
            ]
        }
    except Exception as e:
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})


class ReportSaveRequest(BaseModel):
    client_name: Optional[str] = None
    clientName: Optional[str] = None
    client_address: Optional[str] = None
    client_contact: Optional[str] = None
    client_email: Optional[str] = None
    logo: Optional[str] = None
    project_name: Optional[str] = None
    projectName: Optional[str] = None
    organization_id: Optional[Union[str, int]] = None
    report_id: Optional[Union[str, int]] = None
    parent_report_id: Optional[Union[str, int]] = None
    report_type: Optional[str] = "pv"
    document_no: Optional[str] = None
    revision: Optional[str] = None
    prepared_date: Optional[str] = None
    report_title: Optional[str] = None
    status: Optional[str] = None
    stage_id: Optional[str] = "10"
    sid: Optional[str] = None
    department_id: Optional[Union[str, int]] = None
    vertical_id: Optional[Union[str, int]] = None
    template_id: Optional[Union[str, int]] = None
    values: Optional[dict] = {}
    create_new_version: Optional[bool] = False
    version_notes: Optional[str] = None
    created_by_role: Optional[str] = "creator"
    created_by_name: Optional[str] = "Creator"
    assigned_reviewer: Optional[str] = "Reviewer"
    assigned_reviewer_id: Optional[str] = None
    assigned_creator: Optional[str] = None
    assigned_creator_id: Optional[str] = None
    provider_company: Optional[str] = None
    department: Optional[str] = None
    vertical: Optional[str] = None

class ProjectSaveRequest(BaseModel):
    id: Optional[Union[str, int]] = None
    clientId: Optional[Union[str, int]] = None
    clientName: Optional[str] = "Client"
    name: str
    county: Optional[str] = ""
    state: Optional[str] = ""
    country: Optional[str] = "USA"
    department: Optional[str] = "Electrical"
    vertical: Optional[str] = "PV"
    assignedReviewer: Optional[str] = None
    assignedReviewerId: Optional[str] = None
    assignedCreator: Optional[str] = None
    assignedCreatorId: Optional[str] = None
    status: Optional[str] = "active"
    desc: Optional[str] = None
    site_name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    consultant_epc: Optional[str] = None
    ac_capacity_mw: Optional[float] = None
    dc_capacity_mw: Optional[float] = None
    poi_voltage_kv: Optional[float] = None
    mv_collection_voltage_kv: Optional[float] = None
    lv_collection_voltage_v: Optional[float] = None
    dc_voltage_v: Optional[float] = None
    total_area_acres: Optional[float] = None

class AddCommentRequest(BaseModel):
    section_key: Optional[str] = "general"
    field_key: Optional[str] = None
    comment_text: str
    author_role: Optional[str] = "reviewer"
    author_name: Optional[str] = "Reviewer"

class WorkflowStatusRequest(BaseModel):
    status: str
    notes: Optional[str] = None
    reviewer_name: Optional[str] = None
    assigned_creator: Optional[str] = None


def _normalize_report_identity(value: Any) -> str:
    return str(value or "").strip().lower()


def _logical_report_key(report: Report):
    root_id = str(report.parent_report_id or report.id)
    proj_id = str(report.project_id or "")
    dept = _normalize_report_identity(report.department_id or report.department)
    vert = _normalize_report_identity(report.vertical_id or report.vertical)
    rep_type = _normalize_report_identity(report.report_type)
    return ("logical-version", root_id, proj_id, vert, dept, rep_type)


def _get_logical_report_versions(db: Session, report: Report):
    target_key = _logical_report_key(report)
    return [candidate for candidate in db.query(Report).all() if _logical_report_key(candidate) == target_key]


def _latest_logical_report(db: Session, report: Report):
    versions = _get_logical_report_versions(db, report)
    current_versions = [version for version in versions if version.is_current_version is True]
    candidates = current_versions or versions
    return max(candidates, key=lambda version: (version.version_number or 1, str(version.id)), default=report)

def structure_pv_inputs(values: dict) -> dict:
    module_manufacturer = values.get("module_make") or values.get("module_manufacturer")
    module_model = values.get("module_model")
    
    electrical_characteristics = {
        "moduleVoc": values.get("moduleVoc"),
        "moduleVmp": values.get("moduleVmp"),
        "moduleIsc": values.get("moduleIsc"),
        "moduleImp": values.get("moduleImp"),
        "modulePmax": values.get("modulePmax"),
        "module_type": values.get("module_type"),
        "module_wp1": values.get("module_wp1"),
        "module_wp2": values.get("module_wp2"),
        "max_module_power": values.get("max_module_power"),
        "module_qty_615": values.get("module_qty_615"),
        "module_qty_620": values.get("module_qty_620"),
        "string_size": values.get("string_size"),
        "modules_series": values.get("modules_series"),
    }
    
    mechanical_characteristics = {
        "module_dimensions": values.get("module_dimensions"),
        "module_length": values.get("module_length"),
        "module_width": values.get("module_width"),
        "module_height": values.get("module_height"),
        "wind_load": values.get("wind_load"),
        "snow_load": values.get("snow_load"),
    }
    
    temperature_coefficients = {
        "tempCoeffVoc": values.get("tempCoeffVoc"),
        "temp_coeff_voc": values.get("temp_coeff_voc"),
        "temp_coeff_pm": values.get("temp_coeff_pm"),
        "temp_coeff_isc": values.get("temp_coeff_isc"),
    }
    
    site_conditions = {
        "tempMin": values.get("tempMin"),
        "tempCellMax": values.get("tempCellMax"),
        "designStd": values.get("designStd"),
        "ghi": values.get("ghi"),
        "dsi": values.get("dsi"),
        "altitude": values.get("altitude"),
        "wind_speed": values.get("wind_speed"),
        "snow_load": values.get("snow_load"),
        "risk_category": values.get("risk_category"),
        "met_source": values.get("met_source"),
        "data_format": values.get("data_format"),
    }
    
    pvsyst_results = {
        "pvsystData": values.get("pvsystData"),
        "pvsystReport": values.get("pvsystReport"),
    }
    
    irradiation_data = {
        "ghi": values.get("ghi"),
        "dsi": values.get("dsi"),
        "ghiCsv": values.get("ghiCsv"),
        "dhiCsv": values.get("dhiCsv"),
    }
    
    energy_yield = {
        "annual_energy": values.get("annual_energy"),
        "specific_yield": values.get("specific_yield"),
        "performance_ratio": values.get("performance_ratio"),
        "dc_cuf": values.get("dc_cuf"),
        "ac_cuf": values.get("ac_cuf"),
    }
    
    voc_calculations = {
        "yearlyVocSummary": values.get("yearlyVocSummary"),
        "allTimeMaxVoc": values.get("allTimeMaxVoc"),
        "vocCsv": values.get("vocCsv"),
    }
    
    isc_calculations = {
        "yearlyIscSummary": values.get("yearlyIscSummary"),
        "max_3hr_isc": values.get("max_3hr_isc"),
        "max_isc_year": values.get("max_isc_year"),
        "IscCsv": values.get("IscCsv"),
    }
    
    degradation_tables = {
        "moduleDegradation": values.get("moduleDegradation"),
        "deg_year1": values.get("deg_year1"),
        "deg_year30": values.get("deg_year30"),
        "deg_yearly": values.get("deg_yearly"),
        "minVoltageDegradationTable": values.get("minVoltageDegradationTable"),
        "warranty_product": values.get("warranty_product"),
        "warranty_performance": values.get("warranty_performance"),
    }
    
    return {
        "module_manufacturer": module_manufacturer,
        "module_model": module_model,
        "electrical_characteristics": electrical_characteristics,
        "mechanical_characteristics": mechanical_characteristics,
        "temperature_coefficients": temperature_coefficients,
        "site_conditions": site_conditions,
        "pvsyst_results": pvsyst_results,
        "irradiation_data": irradiation_data,
        "energy_yield": energy_yield,
        "voc_calculations": voc_calculations,
        "isc_calculations": isc_calculations,
        "degradation_tables": degradation_tables,
    }

def first_present(d: dict, *keys, default=None):
    """Return the first key present in dictionary, honoring empty strings ("")."""
    if not isinstance(d, dict):
        return default
    for key in keys:
        if key in d and d[key] is not None:
            return d[key]
    return default

def upsert_child_report(db: Session, report_id, report_type: str, values: dict):
    if not values:
        return
    
    pv_inputs = structure_pv_inputs(values) if report_type == "pv" else {}

    if report_type == "pv":
        pv = db.query(PVReport).filter_by(report_id=report_id).first()
        if not pv:
            pv = PVReport(report_id=report_id)
            db.add(pv)
        pv.module_manufacturer = first_present(values, "module_manufacturer", "module_make")
        pv.module_model = first_present(values, "module_model", "model")
        pv.module_type = first_present(values, "module_type")
        pv.module_pmax = first_present(values, "module_pmax", "modulePmax")
        pv.module_voc = first_present(values, "module_voc", "moduleVoc")
        pv.module_vmp = first_present(values, "module_vmp", "moduleVmp")
        pv.module_isc = first_present(values, "module_isc", "moduleIsc")
        pv.module_imp = first_present(values, "module_imp", "moduleImp")
        pv.module_length_mm = first_present(values, "module_length_mm")
        pv.module_width_mm = first_present(values, "module_width_mm")
        pv.module_height_mm = first_present(values, "module_height_mm")
        pv.temp_coeff_voc_percent = first_present(values, "temp_coeff_voc_percent", "temp_voc")
        pv.temp_coeff_pm_percent = first_present(values, "temp_coeff_pm_percent", "temp_pmax")
        pv.temp_coeff_isc_percent = first_present(values, "temp_coeff_isc_percent", "temp_isc")
        pv.dc_ac_ratio_poi = first_present(values, "dc_ac_ratio_poi")
        pv.dc_ac_ratio_inv = first_present(values, "dc_ac_ratio_inv")
        
        pv.electrical_characteristics = first_present(values, "electrical_characteristics", "electrical", default=pv_inputs.get("electrical_characteristics"))
        pv.mechanical_characteristics = first_present(values, "mechanical_characteristics", "mechanical", default=pv_inputs.get("mechanical_characteristics"))
        pv.temperature_coefficients = first_present(values, "temperature_coefficients", default=pv_inputs.get("temperature_coefficients"))
        pv.string_sizing = first_present(values, "string_sizing")
        pv.pvsyst_results = first_present(values, "pvsyst_results", default=pv_inputs.get("pvsyst_results"))
        pv.irradiation_data = first_present(values, "irradiation_data", default=pv_inputs.get("irradiation_data"))
        pv.energy_yield = first_present(values, "energy_yield", default=pv_inputs.get("energy_yield"))
        pv.loss_analysis = first_present(values, "loss_analysis")
        pv.voc_calculations = first_present(values, "voc_calculations", default=pv_inputs.get("voc_calculations"))
        pv.isc_calculations = first_present(values, "isc_calculations", default=pv_inputs.get("isc_calculations"))
        pv.degradation_tables = first_present(values, "degradation_tables", default=pv_inputs.get("degradation_tables"))
        pv.site_conditions = first_present(values, "site_conditions", default=pv_inputs.get("site_conditions"))

    elif report_type == "battery":
        bat = db.query(BatteryReport).filter_by(report_id=report_id).first()
        if not bat:
            bat = BatteryReport(report_id=report_id)
            db.add(bat)
        bat.battery_manufacturer = first_present(values, "battery_manufacturer", "manufacturer")
        bat.battery_model = first_present(values, "battery_model", "model")
        bat.cell_chemistry = first_present(values, "cell_chemistry", "chemistry")
        bat.battery_min_voltage = first_present(values, "battery_min_voltage")
        bat.battery_max_voltage = first_present(values, "battery_max_voltage")
        bat.battery_rated_voltage = first_present(values, "battery_rated_voltage")
        bat.battery_rated_current = first_present(values, "battery_rated_current")
        bat.bess_dimension = first_present(values, "bess_dimension")
        bat.bess_energy_per_enclosure_kwh = first_present(values, "bess_energy_per_enclosure_kwh")
        bat.no_of_enclosures = first_present(values, "no_of_enclosures")
        bat.cooling_method = first_present(values, "cooling_method")
        bat.bess_design_life_years = first_present(values, "bess_design_life_years")
        bat.battery_charge_rate = first_present(values, "battery_charge_rate")
        bat.battery_discharge_rate = first_present(values, "battery_discharge_rate")
        bat.battery_max_power_mw = first_present(values, "battery_max_power_mw")
        
        bat.charge_characteristics = first_present(values, "charge_characteristics")
        bat.discharge_characteristics = first_present(values, "discharge_characteristics")
        bat.thermal_limits = first_present(values, "thermal_limits")
        bat.protection_settings = first_present(values, "protection_settings")
        bat.cycle_life = first_present(values, "cycle_life")
        bat.operating_conditions = first_present(values, "operating_conditions")

    elif report_type == "pcs":
        pcs = db.query(PCSReport).filter_by(report_id=report_id).first()
        if not pcs:
            pcs = PCSReport(report_id=report_id)
            db.add(pcs)
        pcs.pcs_manufacturer = first_present(values, "pcs_manufacturer", "manufacturer")
        pcs.pcs_model = first_present(values, "pcs_model", "model")
        pcs.voltage_limits = first_present(values, "voltage_limits")
        pcs.current_limits = first_present(values, "current_limits")
        pcs.mppt_details = first_present(values, "mppt_details")
        pcs.ac_specifications = first_present(values, "ac_specifications")
        pcs.dc_specifications = first_present(values, "dc_specifications")
        pcs.efficiency_curves = first_present(values, "efficiency_curves")
        pcs.communication_interfaces = first_present(values, "communication_interfaces")
        pcs.protection_features = first_present(values, "protection_features")

    elif report_type == "inverter":
        inv = db.query(InverterReport).filter_by(report_id=report_id).first()
        if not inv:
            inv = InverterReport(report_id=report_id)
            db.add(inv)
        inv.inverter_manufacturer = first_present(values, "inverter_manufacturer", "manufacturer")
        inv.inverter_model = first_present(values, "inverter_model", "model")
        inv.voltage_limits = first_present(values, "voltage_limits")
        inv.current_limits = first_present(values, "current_limits")
        inv.mppt_details = first_present(values, "mppt_details")
        inv.ac_specifications = first_present(values, "ac_specifications")
        inv.dc_specifications = first_present(values, "dc_specifications")
        inv.efficiency_curves = first_present(values, "efficiency_curves")

    elif report_type == "transformer":
        tr = db.query(TransformerReport).filter_by(report_id=report_id).first()
        if not tr:
            tr = TransformerReport(report_id=report_id)
            db.add(tr)
        tr.transformer_manufacturer = first_present(values, "transformer_manufacturer", "manufacturer")
        tr.transformer_model = first_present(values, "transformer_model", "model")
        tr.capacity_kva = first_present(values, "capacity_kva")
        tr.voltage_ratio = first_present(values, "voltage_ratio")
        tr.impedance_percent = first_present(values, "impedance_percent")
        tr.cooling_class = first_present(values, "cooling_class")
        tr.losses_no_load_w = first_present(values, "losses_no_load_w")
        tr.losses_load_w = first_present(values, "losses_load_w")

    elif report_type == "switchgear":
        sw = db.query(SwitchgearReport).filter_by(report_id=report_id).first()
        if not sw:
            sw = SwitchgearReport(report_id=report_id)
            db.add(sw)
        sw.switchgear_manufacturer = first_present(values, "switchgear_manufacturer", "manufacturer")
        sw.switchgear_model = first_present(values, "switchgear_model", "model")
        sw.rated_voltage_kv = first_present(values, "rated_voltage_kv")
        sw.rated_current_a = first_present(values, "rated_current_a")
        sw.short_circuit_withstand_ka = first_present(values, "short_circuit_withstand_ka")
        sw.busbar_material = first_present(values, "busbar_material")
        sw.ip_rating = first_present(values, "ip_rating")

    elif report_type == "cable":
        cab = db.query(CableReport).filter_by(report_id=report_id).first()
        if not cab:
            cab = CableReport(report_id=report_id)
            db.add(cab)
        cab.conductor_material = first_present(values, "conductor_material")
        cab.insulation_type = first_present(values, "insulation_type")
        cab.voltage_rating = first_present(values, "voltage_rating")
        cab.cable_size = first_present(values, "cable_size")
        cab.no_of_runs = first_present(values, "no_of_runs")
        cab.installation_method = first_present(values, "installation_method")
        cab.soil_thermal_resistivity = first_present(values, "soil_thermal_resistivity")
        cab.soil_temperature = first_present(values, "soil_temperature")
        cab.load_factor = first_present(values, "load_factor")
        cab.derated_ampacity = first_present(values, "derated_ampacity")

    elif report_type == "relay_protection":
        rp = db.query(RelayProtectionReport).filter_by(report_id=report_id).first()
        if not rp:
            rp = RelayProtectionReport(report_id=report_id)
            db.add(rp)
        rp.relay_manufacturer = first_present(values, "relay_manufacturer", "manufacturer")
        rp.relay_model = first_present(values, "relay_model", "model")
        rp.ansi_codes = first_present(values, "ansi_codes")
        rp.ct_ratio = first_present(values, "ct_ratio")
        rp.pt_ratio = first_present(values, "pt_ratio")
        rp.pickup_settings = first_present(values, "pickup_settings")
        rp.delay_settings = first_present(values, "delay_settings")

    elif report_type == "electrical_design":
        ed = db.query(ElectricalDesignReport).filter_by(report_id=report_id).first()
        if not ed:
            ed = ElectricalDesignReport(report_id=report_id)
            db.add(ed)
        ed.system_frequency_hz = first_present(values, "system_frequency_hz")
        ed.short_circuit_level_ka = first_present(values, "short_circuit_level_ka")
        ed.max_voltage_drop_percent = first_present(values, "max_voltage_drop_percent")
        ed.grounding_system_type = first_present(values, "grounding_system_type")
        ed.design_standards = first_present(values, "design_standards")
        ed.key_design_parameters = first_present(values, "key_design_parameters")

    elif report_type == "structural":
        st = db.query(StructuralReport).filter_by(report_id=report_id).first()
        if not st:
            st = StructuralReport(report_id=report_id)
            db.add(st)
        st.wind_load_mph = first_present(values, "wind_load_mph")
        st.snow_load_psf = first_present(values, "snow_load_psf")
        st.seismic_design_category = first_present(values, "seismic_design_category")
        st.foundation_type = first_present(values, "foundation_type")
        st.soil_bearing_capacity = first_present(values, "soil_bearing_capacity")
        st.structural_steel_grade = first_present(values, "structural_steel_grade")
        st.concrete_strength_psi = first_present(values, "concrete_strength_psi")

    elif report_type == "grounding":
        gr = db.query(GroundingReport).filter_by(report_id=report_id).first()
        if not gr:
            gr = GroundingReport(report_id=report_id)
            db.add(gr)
        gr.grounding_software = first_present(values, "grounding_software")
        gr.ground_conductor_bess = first_present(values, "ground_conductor_bess")
        gr.ground_conductor_pcs = first_present(values, "ground_conductor_pcs")
        gr.ground_conductor_aux = first_present(values, "ground_conductor_aux")
        gr.ground_conductor_misc = first_present(values, "ground_conductor_misc")
        gr.grounding_layout_drawing_no = first_present(values, "grounding_layout_drawing_no")
        gr.grounding_analysis_report_no = first_present(values, "grounding_analysis_report_no")
        gr.safety_body_weight_kg = first_present(values, "safety_body_weight_kg")
        gr.safety_shock_duration_sec = first_present(values, "safety_shock_duration_sec")
        gr.soil_resistivity_model = first_present(values, "soil_resistivity_model")


def _ensure_master_entities(db: Session, payload: ReportSaveRequest, project: Project):
    # 1. Organization ID
    org_id = None
    if payload.organization_id:
        try:
            org_id = uuid.UUID(str(payload.organization_id))
        except ValueError:
            pass

    if not org_id and project and getattr(project, "organization_id", None):
        org_id = project.organization_id

    if not org_id:
        org = db.query(Organization).first()
        if not org:
            org = Organization(name="PV Insight Inc.")
            db.add(org)
            db.commit()
            db.refresh(org)
        org_id = org.id
        if project and not getattr(project, "organization_id", None):
            project.organization_id = org_id

    # 2. Department ID
    dept_id = None
    if payload.department_id:
        try:
            dept_id = uuid.UUID(str(payload.department_id))
        except ValueError:
            pass

    raw_dept_name = (payload.department or "Electrical").strip()
    dept_lower = raw_dept_name.lower()
    if "elec" in dept_lower:
        dept_name = "Electrical"
    elif "civil" in dept_lower:
        dept_name = "Civil"
    elif "struct" in dept_lower:
        dept_name = "Structure"
    else:
        dept_name = raw_dept_name

    if not dept_id:
        dept = db.query(Department).filter(
            (func.lower(Department.name) == dept_name.lower()) |
            (func.lower(Department.name) == raw_dept_name.lower())
        ).first()
        if not dept:
            dept = Department(name=dept_name)
            db.add(dept)
            db.commit()
            db.refresh(dept)
        dept_id = dept.id
        dept_name = dept.name

    # 3. Vertical ID
    vert_id = None
    if payload.vertical_id:
        try:
            vert_id = uuid.UUID(str(payload.vertical_id))
        except ValueError:
            pass

    vert_name = payload.vertical or "PV"
    if not vert_id:
        vert = db.query(Vertical).filter(func.lower(Vertical.name) == vert_name.lower()).first()
        if not vert:
            vert = Vertical(name=vert_name, department_id=dept_id)
            db.add(vert)
            db.commit()
            db.refresh(vert)
        vert_id = vert.id

    # 4. Master Report Template ID
    temp_id = None
    if payload.template_id:
        try:
            temp_id = uuid.UUID(str(payload.template_id))
        except ValueError:
            pass

    if not temp_id:
        template_name = payload.report_title or payload.report_type or "Master Report Template"
        template = db.query(MasterReportTemplate).filter(
            func.lower(MasterReportTemplate.report_name) == template_name.lower()
        ).first()
        if not template:
            template = MasterReportTemplate(
                report_name=template_name,
                department_id=dept_id,
                vertical_id=vert_id
            )
            db.add(template)
            db.commit()
            db.refresh(template)
        temp_id = template.id

    return {
        "organization_id": org_id,
        "department_id": dept_id,
        "vertical_id": vert_id,
        "template_id": temp_id,
        "department_name": dept_name,
        "vertical_name": vert_name,
    }

@app.post("/api/reports/save")
def save_report(payload: ReportSaveRequest, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        values_dict = payload.values if isinstance(payload.values, dict) else {}
        client_name = (
            payload.client_name or
            payload.clientName or
            values_dict.get("clientName") or
            values_dict.get("CLIENT_NAME") or
            values_dict.get("submittedTo") or
            "Signal Energy"
        ).strip()

        client_address = (
            payload.client_address or
            values_dict.get("clientAddress") or
            values_dict.get("submittedToAddress")
        )
        primary_contact = payload.client_contact or values_dict.get("clientContact")

        contact_email = payload.client_email or values_dict.get("clientEmail") or values_dict.get("contactEmail") or values_dict.get("client_email")
        creator_name = payload.created_by_name or payload.assigned_creator or (current_user.get("full_name") if isinstance(current_user, dict) else "Creator")
        client_logo = payload.logo or values_dict.get("clientLogo") or values_dict.get("logo")

        client = db.query(Client).filter(func.lower(Client.name) == client_name.lower()).first()
        if not client:
            client = Client(
                name=client_name,
                address=client_address,
                client_address=client_address,
                primary_contact=primary_contact,
                contact_email=contact_email,
                created_by=creator_name,
                logo=client_logo,
                created_at=datetime.utcnow().isoformat(),
                modified_by=creator_name,
                modified_at=datetime.utcnow().isoformat()
            )
            db.add(client)
            db.commit()
            db.refresh(client)

        project_name = (
            payload.project_name or
            payload.projectName or
            values_dict.get("projectName") or
            values_dict.get("PROJECT_NAME") or
            values_dict.get("plant_name") or
            "Engineering Project"
        ).strip()

        project = db.query(Project).filter(
            func.lower(Project.name) == project_name.lower(),
            Project.client_id == client.id
        ).first()

        # Smart extraction of technical site & engineering specs from report values dictionary
        site_name = values_dict.get("site_name") or values_dict.get("siteName") or values_dict.get("plant_name")
        lat_raw = values_dict.get("latitude") or values_dict.get("lat")
        lng_raw = values_dict.get("longitude") or values_dict.get("lng") or values_dict.get("lon")
        consultant = values_dict.get("consultant_epc") or values_dict.get("consultant") or values_dict.get("epc")
        ac_mw_raw = values_dict.get("ac_capacity_mw") or values_dict.get("ac_capacity")
        dc_mw_raw = values_dict.get("dc_capacity_mw") or values_dict.get("dc_capacity")
        poi_kv_raw = values_dict.get("poi_voltage_kv") or values_dict.get("poi_voltage")
        mv_kv_raw = values_dict.get("mv_collection_voltage_kv") or values_dict.get("mv_voltage_kv")
        lv_v_raw = values_dict.get("lv_collection_voltage_v") or values_dict.get("lv_voltage")
        dc_v_raw = values_dict.get("dc_voltage_v") or values_dict.get("dc_voltage")
        area_raw = values_dict.get("total_area_acres") or values_dict.get("area_acres")

        lat_val = safe_float(lat_raw, None) if lat_raw is not None else None
        lng_val = safe_float(lng_raw, None) if lng_raw is not None else None
        ac_mw = safe_float(ac_mw_raw, None) if ac_mw_raw is not None else None
        dc_mw = safe_float(dc_mw_raw, None) if dc_mw_raw is not None else None
        poi_kv = safe_float(poi_kv_raw, None) if poi_kv_raw is not None else None
        mv_kv = safe_float(mv_kv_raw, None) if mv_kv_raw is not None else None
        lv_v = safe_float(lv_v_raw, None) if lv_v_raw is not None else None
        dc_v = safe_float(dc_v_raw, None) if dc_v_raw is not None else None
        area_acres = safe_float(area_raw, None) if area_raw is not None else None

        if not project:
            project = Project(
                client_id=client.id,
                name=project_name,
                department=payload.department or "Electrical",
                vertical=payload.vertical or "PV",
                assigned_creator=payload.assigned_creator,
                assigned_creator_id=payload.assigned_creator_id,
                assigned_reviewer=payload.assigned_reviewer,
                assigned_reviewer_id=payload.assigned_reviewer_id,
                created_at=datetime.utcnow().isoformat(),
                site_name=site_name,
                latitude=lat_val,
                longitude=lng_val,
                consultant_epc=consultant,
                ac_capacity_mw=ac_mw,
                dc_capacity_mw=dc_mw,
                poi_voltage_kv=poi_kv,
                mv_collection_voltage_kv=mv_kv,
                lv_collection_voltage_v=lv_v,
                dc_voltage_v=dc_v,
                total_area_acres=area_acres
            )
            db.add(project)
            db.commit()
            db.refresh(project)
        else:
            if site_name and not project.site_name: project.site_name = site_name
            if lat_val is not None and project.latitude is None: project.latitude = lat_val
            if lng_val is not None and project.longitude is None: project.longitude = lng_val
            if consultant and not project.consultant_epc: project.consultant_epc = consultant
            if ac_mw is not None and project.ac_capacity_mw is None: project.ac_capacity_mw = ac_mw
            if dc_mw is not None and project.dc_capacity_mw is None: project.dc_capacity_mw = dc_mw
            if poi_kv is not None and project.poi_voltage_kv is None: project.poi_voltage_kv = poi_kv
            if mv_kv is not None and project.mv_collection_voltage_kv is None: project.mv_collection_voltage_kv = mv_kv
            if lv_v is not None and project.lv_collection_voltage_v is None: project.lv_collection_voltage_v = lv_v
            if dc_v is not None and project.dc_voltage_v is None: project.dc_voltage_v = dc_v
            if area_acres is not None and project.total_area_acres is None: project.total_area_acres = area_acres
            db.commit()

        master = _ensure_master_entities(db, payload, project)
        if not client.organization_id:
            client.organization_id = master["organization_id"]
            db.commit()
        if not project.organization_id:
            project.organization_id = master["organization_id"]
            db.commit()
            
        if payload.report_id:
            try:
                rep_uuid = uuid.UUID(str(payload.report_id))
            except ValueError:
                rep_uuid = None
                
            existing = db.query(Report).filter_by(id=rep_uuid).first() if rep_uuid else None
            
            is_locked = (existing.status or "").lower() in ["approved", "completed"] if existing else False
            should_create_version = bool(payload.create_new_version) and is_locked

            if existing and should_create_version:
                lineage = _get_logical_report_versions(db, existing)
                parent_id = min(
                    (version.parent_report_id or version.id for version in lineage),
                    default=existing.parent_report_id or existing.id,
                )
                next_version_num = max(
                    (version.version_number or 1 for version in lineage),
                    default=0,
                ) + 1
                
                lineage_ids = [version.id for version in lineage]
                db.query(Report).filter(Report.id.in_(lineage_ids)).update(
                    {"is_current_version": False}, synchronize_session=False
                )

                # Smart dictionary merge: preserve pre-existing report text/metrics and merge new payload values
                version_values = dict(existing.metadata_json or {})
                if payload.values:
                    version_values.update(payload.values)
                
                new_report = Report(
                    project_id=existing.project_id,
                    organization_id=master["organization_id"],
                    department_id=master["department_id"],
                    vertical_id=master["vertical_id"],
                    template_id=master["template_id"],
                    stage_id=payload.stage_id or payload.sid or getattr(existing, "stage_id", "10"),
                    report_type=payload.report_type,
                    document_no=payload.document_no or existing.document_no or "PVI-BESS-GEN-001",
                    revision=payload.revision or existing.revision or "R0",
                    prepared_date=payload.prepared_date or existing.prepared_date or "2026-07-03",
                    report_title=payload.report_title or existing.report_title or "Engineering Report",
                    status=payload.status or getattr(existing, "status", None) or "draft",
                    metadata_json=version_values,
                    parent_report_id=parent_id,
                    version_number=next_version_num,
                    is_current_version=True,
                    created_by_role=payload.created_by_role or "creator",
                    created_by_name=payload.created_by_name or "Creator",
                    assigned_reviewer=payload.assigned_reviewer or "Reviewer",
                    assigned_reviewer_id=payload.assigned_reviewer_id or getattr(existing, "assigned_reviewer_id", None),
                    assigned_creator=payload.assigned_creator or getattr(existing, "assigned_creator", None),
                    assigned_creator_id=payload.assigned_creator_id or getattr(existing, "assigned_creator_id", None),
                    provider_company=payload.provider_company or getattr(existing, "provider_company", None),
                    department=master["department_name"],
                    vertical=master["vertical_name"],
                    version_notes=payload.version_notes or f"Revision copy v{next_version_num} updated as per reviewer comments."
                )
                db.add(new_report)
                db.commit()
                db.refresh(new_report)
                upsert_child_report(db, new_report.id, payload.report_type, version_values)
                db.commit()
                return {"success": True, "report_id": str(new_report.id), "version_number": new_report.version_number, "is_new_version": True}
            elif existing:
                target_report = _latest_logical_report(db, existing) if getattr(existing, "is_current_version", True) is False else existing
                target_report.organization_id = master["organization_id"]
                target_report.department_id = master["department_id"]
                target_report.vertical_id = master["vertical_id"]
                target_report.template_id = master["template_id"]
                target_report.department = master["department_name"]
                target_report.vertical = master["vertical_name"]

                target_report.document_no = payload.document_no or target_report.document_no or "PVI-BESS-GEN-001"
                target_report.revision = payload.revision or target_report.revision or "v1"
                target_report.prepared_date = payload.prepared_date or target_report.prepared_date or "2026-07-03"
                target_report.report_title = payload.report_title or target_report.report_title or "Engineering Report"

                # Smart dictionary merge: preserve pre-existing text/metrics and merge new payload values
                updated_values = dict(target_report.metadata_json or {})
                if payload.values:
                    updated_values.update(payload.values)
                target_report.metadata_json = updated_values
                flag_modified(target_report, "metadata_json")

                if payload.stage_id or payload.sid:
                    existing.stage_id = payload.stage_id or payload.sid
                if payload.assigned_creator:
                    existing.assigned_creator = payload.assigned_creator
                if payload.assigned_creator_id:
                    existing.assigned_creator_id = payload.assigned_creator_id
                if payload.assigned_reviewer_id:
                    existing.assigned_reviewer_id = payload.assigned_reviewer_id
                if payload.provider_company:
                    existing.provider_company = payload.provider_company
                if payload.status:
                    existing.status = payload.status
                if payload.version_notes:
                    existing.version_notes = payload.version_notes
                db.commit()
                db.refresh(existing)
                upsert_child_report(db, existing.id, payload.report_type, updated_values)
                db.commit()
                return {"success": True, "report_id": str(existing.id), "version_number": existing.version_number, "is_new_version": False}
        
        new_report = Report(
            project_id=project.id,
            organization_id=master["organization_id"],
            department_id=master["department_id"],
            vertical_id=master["vertical_id"],
            template_id=master["template_id"],
            stage_id=payload.stage_id or payload.sid or "10",
            report_type=payload.report_type,
            document_no=payload.document_no or "PVI-BESS-GEN-001",
            revision=payload.revision or "v1",
            prepared_date=payload.prepared_date or "2026-07-03",
            report_title=payload.report_title or "Engineering Report",
            status=payload.status or "draft",
            metadata_json=payload.values,
            version_number=1,
            is_current_version=True,
            created_by_role=payload.created_by_role or "creator",
            created_by_name=payload.created_by_name or "Creator",
            assigned_reviewer=payload.assigned_reviewer or "Reviewer",
            assigned_reviewer_id=payload.assigned_reviewer_id,
            assigned_creator=payload.assigned_creator,
            assigned_creator_id=payload.assigned_creator_id,
            provider_company=payload.provider_company,
            department=master["department_name"],
            vertical=master["vertical_name"],
            version_notes=payload.version_notes or "Initial version creation"
        )
        db.add(new_report)
        db.commit()
        db.refresh(new_report)
        upsert_child_report(db, new_report.id, payload.report_type, payload.values or {})
        db.commit()
        return {"success": True, "report_id": str(new_report.id), "version_number": 1, "is_new_version": True}
    except Exception as e:
        db.rollback()
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})


@app.get("/api/reports")
def get_reports_list(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        all_reports = db.query(Report).filter(
            or_(
                Report.is_current_version == True,
                Report.status.in_(["approved", "completed"])
            )
        ).order_by(Report.id.desc()).all()

        latest_by_report = {}
        for report in all_reports:
            key = _logical_report_key(report)
            current = latest_by_report.get(key)
            if current is None or (report.version_number or 1, str(report.id)) > (current.version_number or 1, str(current.id)):
                latest_by_report[key] = report
        reports = sorted(latest_by_report.values(), key=lambda report: report.id, reverse=True)
        
        res = []
        for r in reports:
            res.append({
                "id": str(r.id),
                "project_id": str(r.project_id),
                "department_id": str(r.department_id),
                "vertical_id": str(r.vertical_id),
                "stage_id": r.stage_id or "10",
                "sid": r.stage_id or "10",
                "parent_report_id": str(r.parent_report_id) if r.parent_report_id else None,
                "lineage_id": str(r.parent_report_id or r.id),
                "version_number": r.version_number or 1,
                "is_current_version": r.is_current_version if r.is_current_version is not None else True,
                "report_title": r.report_title,
                "document_no": r.document_no,
                "revision": r.revision,
                "report_type": r.report_type,
                "status": r.status,
                "created_by_role": r.created_by_role or "creator",
                "created_by_name": r.created_by_name or "Creator",
                "assigned_reviewer": r.assigned_reviewer or "Reviewer",
                "assigned_reviewer_id": r.assigned_reviewer_id,
                "assigned_creator": r.assigned_creator,
                "assigned_creator_id": r.assigned_creator_id,
                "provider_company": r.provider_company,
                "department": r.department,
                "vertical": r.vertical,
                "version_notes": r.version_notes,
                "values": r.metadata_json or {},
                "template_id": str(r.template_id) if r.template_id else None,
                "created_at": r.created_at
            })
        return {"success": True, "reports": res}
    except Exception as e:
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})


@app.get("/api/reports/{report_id}/versions")
def get_report_versions(report_id: str, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        try:
            r_id = uuid.UUID(str(report_id))
        except ValueError:
            return JSONResponse(status_code=400, content={"success": False, "error": "Invalid report ID"})
            
        target = db.query(Report).filter_by(id=r_id).first()
        if not target:
            return JSONResponse(status_code=404, content={"success": False, "error": "Report not found"})
            
        versions = sorted(
            _get_logical_report_versions(db, target),
            key=lambda report: (report.version_number or 1, report.id),
            reverse=True,
        )
        root_id = min(
            (version.parent_report_id or version.id for version in versions),
            default=target.parent_report_id or target.id,
        )
        latest_version = _latest_logical_report(db, target)
        chronological = sorted(versions, key=lambda report: (report.version_number or 1, report.id))
        display_numbers = {version.id: index + 1 for index, version in enumerate(chronological)}
        
        res = []
        for v in versions:
            res.append({
                "id": str(v.id),
                "parent_report_id": str(v.parent_report_id) if v.parent_report_id else None,
                "version_number": v.version_number or 1,
                "display_version_number": display_numbers[v.id],
                "is_current_version": v.id == latest_version.id,
                "revision": v.revision,
                "document_no": v.document_no,
                "report_title": v.report_title,
                "report_type": v.report_type,
                "metadata_json": v.metadata_json or {},
                "status": v.status,
                "version_notes": v.version_notes,
                "created_by_role": v.created_by_role,
                "created_by_name": v.created_by_name,
                "prepared_date": v.prepared_date
            })
            
        return {"success": True, "root_id": str(root_id), "versions": res}
    except Exception as e:
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})


@app.post("/api/reports/{report_id}/status")
def update_report_status(report_id: str, payload: WorkflowStatusRequest, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        r_id = uuid.UUID(str(report_id))
        report = db.query(Report).filter_by(id=r_id).first()
        if not report:
            return JSONResponse(status_code=404, content={"success": False, "error": "Report not found"})

        latest_report = _latest_logical_report(db, report)
        if report.is_current_version is not True or latest_report.id != report.id:
            return JSONResponse(
                status_code=409,
                content={
                    "success": False,
                    "error": "Historical report versions are read-only. Open the current version to change its workflow status.",
                },
            )
            
        report.status = payload.status
        if payload.notes:
            report.version_notes = payload.notes
        if payload.reviewer_name:
            report.assigned_reviewer = payload.reviewer_name
        if payload.assigned_creator:
            report.assigned_creator = payload.assigned_creator
            
        db.commit()
        db.refresh(report)
        return {"success": True, "report_id": str(report.id), "status": report.status, "assigned_creator": report.assigned_creator}
    except Exception as e:
        db.rollback()
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})


@app.post("/api/reports/{report_id}/comments")
def add_report_comment(report_id: str, payload: AddCommentRequest, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        try:
            r_id = uuid.UUID(str(report_id))
        except ValueError:
            return JSONResponse(status_code=400, content={"success": False, "error": "Invalid report ID format"})
        report = db.query(Report).filter_by(id=r_id).first()
        if not report:
            return JSONResponse(status_code=404, content={"success": False, "error": "Report not found"})
            
        comment = ReportComment(
            report_id=r_id,
            version_number=report.version_number or 1,
            author_id=current_user.get("id"),
            author_name=payload.author_name or "Reviewer",
            author_role=payload.author_role or "reviewer",
            section_key=payload.section_key or "general",
            field_key=payload.field_key,
            comment_text=payload.comment_text,
            status="open"
        )
        db.add(comment)
        db.commit()
        db.refresh(comment)
        return {"success": True, "comment": {
            "id": str(comment.id),
            "report_id": str(comment.report_id),
            "version_number": comment.version_number,
            "author_name": comment.author_name,
            "author_role": comment.author_role,
            "section_key": comment.section_key,
            "field_key": comment.field_key,
            "comment_text": comment.comment_text,
            "status": comment.status
        }}
    except Exception as e:
        db.rollback()
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})


@app.get("/api/reports/{report_id}/comments")
def get_report_comments(report_id: str, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        try:
            r_id = uuid.UUID(str(report_id))
        except ValueError:
            return JSONResponse(status_code=400, content={"success": False, "error": "Invalid report ID format"})
        target = db.query(Report).filter_by(id=r_id).first()
        if not target:
            return JSONResponse(status_code=404, content={"success": False, "error": "Report not found"})
            
        related_reports = _get_logical_report_versions(db, target)
        rep_ids = [r.id for r in related_reports]
        
        comments = db.query(ReportComment).filter(ReportComment.report_id.in_(rep_ids)).order_by(ReportComment.created_at.asc()).all()
        
        res = []
        for c in comments:
            res.append({
                "id": str(c.id),
                "report_id": str(c.report_id),
                "version_number": c.version_number,
                "author_name": c.author_name,
                "author_role": c.author_role,
                "section_key": c.section_key,
                "field_key": c.field_key,
                "comment_text": c.comment_text,
                "status": c.status
            })
            
        return {"success": True, "comments": res}
    except Exception as e:
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})


@app.post("/api/reports/comments/{comment_id}/resolve")
def resolve_comment(comment_id: str, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        try:
            c_uuid = uuid.UUID(str(comment_id))
        except ValueError:
            return JSONResponse(status_code=400, content={"success": False, "error": "Invalid comment ID format"})
        comment = db.query(ReportComment).filter_by(id=c_uuid).first()
        if not comment:
            return JSONResponse(status_code=404, content={"success": False, "error": "Comment not found"})
            
        comment.status = "resolved"
        db.commit()
        db.refresh(comment)
        return {"success": True, "comment_id": str(comment.id), "status": comment.status}
    except Exception as e:
        db.rollback()
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})


@app.get("/api/reports/last-pv")
def get_last_pv_report(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        report = db.query(Report).filter(Report.report_type == "pv").order_by(Report.created_at.desc()).first()
        if not report:
            return {"success": True, "data": None}
        return {"success": True, "data": [{"id": str(report.id), "report_type": report.report_type, "metadata_json": report.metadata_json}]}
    except Exception as e:
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})


@app.get("/api/reports/last/{report_type}")
def get_last_report(report_type: str, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        report = db.query(Report).filter(Report.report_type == report_type).order_by(Report.created_at.desc()).first()
        if not report:
            return {"success": True, "data": None}
        return {"success": True, "data": [{"id": str(report.id), "report_type": report.report_type, "metadata_json": report.metadata_json}]}
    except Exception as e:
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})


@app.get("/api/reports/{report_id}")
def get_report_detail(report_id: str, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        try:
            r_id = uuid.UUID(str(report_id))
            report = db.query(Report).filter_by(id=r_id).first()
        except ValueError:
            report = db.query(Report).order_by(Report.created_at.desc()).first()
            
        if not report:
            return JSONResponse(status_code=404, content={"success": False, "error": "Report not found"})
        return {"success": True, "data": [{
            "id": str(report.id),
            "project_id": str(report.project_id),
            "parent_report_id": str(report.parent_report_id) if report.parent_report_id else None,
            "lineage_id": str(report.parent_report_id or report.id),
            "report_type": report.report_type,
            "document_no": report.document_no,
            "report_title": report.report_title,
            "prepared_date": report.prepared_date,
            "metadata_json": report.metadata_json,
            "version_number": report.version_number,
            "is_current_version": report.is_current_version is True,
            "version_notes": report.version_notes,
            "status": report.status,
            "revision": report.revision,
            "template_id": str(report.template_id) if report.template_id else None,
        }]}
    except Exception as e:
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})


@app.delete("/api/reports/{report_id}")
def delete_report(report_id: str, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        try:
            r_id = uuid.UUID(str(report_id))
        except ValueError:
            return JSONResponse(status_code=400, content={"success": False, "error": "Invalid report ID format"})
            
        report = db.query(Report).filter_by(id=r_id).first()
        if not report:
            return JSONResponse(status_code=404, content={"success": False, "error": "Report not found."})

        db.query(ReportComment).filter_by(report_id=r_id).delete()

        db.query(PVReport).filter_by(report_id=r_id).delete()
        db.query(BatteryReport).filter_by(report_id=r_id).delete()
        db.query(PCSReport).filter_by(report_id=r_id).delete()
        db.query(InverterReport).filter_by(report_id=r_id).delete()
        db.query(TransformerReport).filter_by(report_id=r_id).delete()
        db.query(SwitchgearReport).filter_by(report_id=r_id).delete()
        db.query(CableReport).filter_by(report_id=r_id).delete()
        db.query(RelayProtectionReport).filter_by(report_id=r_id).delete()
        db.query(ElectricalDesignReport).filter_by(report_id=r_id).delete()
        db.query(StructuralReport).filter_by(report_id=r_id).delete()
        db.query(GroundingReport).filter_by(report_id=r_id).delete()

        child_versions = db.query(Report).filter_by(parent_report_id=r_id).all()
        for cv in child_versions:
            db.query(ReportComment).filter_by(report_id=cv.id).delete()
            db.query(PVReport).filter_by(report_id=cv.id).delete()
            db.query(BatteryReport).filter_by(report_id=cv.id).delete()
            db.query(PCSReport).filter_by(report_id=cv.id).delete()
            db.query(InverterReport).filter_by(report_id=cv.id).delete()
            db.query(TransformerReport).filter_by(report_id=cv.id).delete()
            db.query(SwitchgearReport).filter_by(report_id=cv.id).delete()
            db.query(CableReport).filter_by(report_id=cv.id).delete()
            db.query(RelayProtectionReport).filter_by(report_id=cv.id).delete()
            db.query(ElectricalDesignReport).filter_by(report_id=cv.id).delete()
            db.query(StructuralReport).filter_by(report_id=cv.id).delete()
            db.query(GroundingReport).filter_by(report_id=cv.id).delete()
            db.delete(cv)

        project_id = report.project_id
        db.delete(report)
        db.commit()

        if project_id:
            remaining_reports = db.query(Report).filter_by(project_id=project_id).count()
            if remaining_reports == 0:
                proj = db.query(Project).filter_by(id=project_id).first()
                if proj and (proj.name or "").lower().strip() != "default project":
                    db.delete(proj)
                    db.commit()

        return {"success": True, "message": "Report and its version history deleted successfully."}
    except Exception as e:
        db.rollback()
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})


@app.get("/api/projects")
def get_projects(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        user_id = current_user.get("id")
        user_role = current_user.get("role", "member")
        
        if user_role == "admin":
            projects = db.query(Project).all()
        else:
            user_full_name = current_user.get("full_name", "")
            projects = db.query(Project).filter(
                or_(
                    Project.assigned_creator_id == user_id,
                    Project.assigned_creator.ilike(f"%{user_full_name}%") if user_full_name else sql_false()
                )
            ).all()
        
        res = []
        for p in projects:
            c = p.client
            res.append({
                "id": str(p.id),
                "clientId": str(p.client_id) if p.client_id else None,
                "clientName": c.name if c else "Client",
                "name": p.name,
                "county": p.county or "",
                "state": p.state or "",
                "country": p.country or "USA",
                "department": p.department or "Electrical",
                "vertical": p.vertical or "PV",
                "assignedReviewer": p.assigned_reviewer or "Senior Reviewer",
                "assignedReviewerId": p.assigned_reviewer_id or None,
                "assignedCreator": p.assigned_creator or "",
                "assignedCreatorId": p.assigned_creator_id or None,
                "status": p.status or "active",
                "desc": p.description or "",
                "createdAt": p.created_at or "",
                "site_name": p.site_name or "",
                "latitude": p.latitude,
                "longitude": p.longitude,
                "consultant_epc": p.consultant_epc or "",
                "ac_capacity_mw": p.ac_capacity_mw,
                "dc_capacity_mw": p.dc_capacity_mw,
                "poi_voltage_kv": p.poi_voltage_kv,
                "mv_collection_voltage_kv": p.mv_collection_voltage_kv,
                "lv_collection_voltage_v": p.lv_collection_voltage_v,
                "dc_voltage_v": p.dc_voltage_v,
                "total_area_acres": p.total_area_acres,
            })
        return {"success": True, "projects": res}
    except Exception as e:
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})


@app.post("/api/projects")
def save_project(payload: ProjectSaveRequest, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        client_name = payload.clientName or "Client"
        client = db.query(Client).filter(Client.name.ilike(f"%{client_name.strip()}%")).first()
        if not client:
            client = db.query(Client).first()
        if not client:
            client = Client(name=client_name)
            db.add(client)
            db.commit()
            db.refresh(client)

        existing = None
        if payload.id:
            try:
                p_uuid = uuid.UUID(str(payload.id))
                existing = db.query(Project).filter_by(id=p_uuid).first()
            except ValueError:
                existing = db.query(Project).filter(Project.name.ilike(f"%{payload.name.strip()}%")).first()
        else:
            existing = db.query(Project).filter(Project.name.ilike(f"%{payload.name.strip()}%")).first()

        if existing:
            existing.name = payload.name
            existing.county = payload.county or existing.county
            existing.state = payload.state or existing.state
            existing.country = payload.country or existing.country
            existing.assigned_reviewer = payload.assignedReviewer or existing.assigned_reviewer
            existing.assigned_reviewer_id = payload.assignedReviewerId or existing.assigned_reviewer_id
            existing.assigned_creator = payload.assignedCreator or existing.assigned_creator
            existing.assigned_creator_id = payload.assignedCreatorId or existing.assigned_creator_id
            existing.department = payload.department or existing.department
            existing.vertical = payload.vertical or existing.vertical
            existing.status = payload.status or existing.status
            existing.description = payload.desc or existing.description
            if payload.site_name is not None: existing.site_name = payload.site_name
            if payload.latitude is not None: existing.latitude = payload.latitude
            if payload.longitude is not None: existing.longitude = payload.longitude
            if payload.consultant_epc is not None: existing.consultant_epc = payload.consultant_epc
            if payload.ac_capacity_mw is not None: existing.ac_capacity_mw = payload.ac_capacity_mw
            if payload.dc_capacity_mw is not None: existing.dc_capacity_mw = payload.dc_capacity_mw
            if payload.poi_voltage_kv is not None: existing.poi_voltage_kv = payload.poi_voltage_kv
            if payload.mv_collection_voltage_kv is not None: existing.mv_collection_voltage_kv = payload.mv_collection_voltage_kv
            if payload.lv_collection_voltage_v is not None: existing.lv_collection_voltage_v = payload.lv_collection_voltage_v
            if payload.dc_voltage_v is not None: existing.dc_voltage_v = payload.dc_voltage_v
            if payload.total_area_acres is not None: existing.total_area_acres = payload.total_area_acres
            db.commit()
            db.refresh(existing)
            return {"success": True, "project_id": str(existing.id)}
        else:
            new_p = Project(
                client_id=client.id,
                name=payload.name,
                county=payload.county or "",
                state=payload.state or "",
                country=payload.country or "USA",
                assigned_reviewer=payload.assignedReviewer,
                assigned_reviewer_id=payload.assignedReviewerId,
                assigned_creator=payload.assignedCreator,
                assigned_creator_id=payload.assignedCreatorId,
                department=payload.department or "Electrical",
                vertical=payload.vertical or "PV",
                status=payload.status or "active",
                description=payload.desc or "",
                created_at=datetime.utcnow().isoformat(),
                site_name=payload.site_name,
                latitude=payload.latitude,
                longitude=payload.longitude,
                consultant_epc=payload.consultant_epc,
                ac_capacity_mw=payload.ac_capacity_mw,
                dc_capacity_mw=payload.dc_capacity_mw,
                poi_voltage_kv=payload.poi_voltage_kv,
                mv_collection_voltage_kv=payload.mv_collection_voltage_kv,
                lv_collection_voltage_v=payload.lv_collection_voltage_v,
                dc_voltage_v=payload.dc_voltage_v,
                total_area_acres=payload.total_area_acres,
            )
            db.add(new_p)
            db.commit()
            db.refresh(new_p)
            return {"success": True, "project_id": str(new_p.id)}
    except Exception as e:
        db.rollback()
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})


@app.delete("/api/projects/{project_id}")
def delete_project(project_id: str, db: Session = Depends(get_db)):
    try:
        raw_id = str(project_id).replace("proj-", "")
        proj = None
        try:
            p_uuid = uuid.UUID(raw_id)
            proj = db.query(Project).filter_by(id=p_uuid).first()
        except ValueError:
            pass

        if not proj:
            proj = db.query(Project).filter(func.lower(Project.name) == str(project_id).lower()).first()

        if proj:
            db.delete(proj)
            db.commit()
        return {"success": True}
    except Exception as e:
        db.rollback()
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})


# ─── MASTER TABLES SCHEMAS & ENDPOINTS ──────────────────────────────────────

class DepartmentMasterRequest(BaseModel):
    name: str

class VerticalMasterRequest(BaseModel):
    name: str
    department_id: str

class ReportMasterRequest(BaseModel):
    report_name: str
    department_id: str
    vertical_id: str

class ClientMasterRequest(BaseModel):
    name: Optional[str] = None
    client_name: Optional[str] = None
    address: Optional[str] = None
    client_address: Optional[str] = None
    primary_contact: Optional[str] = None
    contact_email: Optional[str] = None
    logo: Optional[str] = None
    created_by_role: Optional[str] = "reviewer"


@app.get("/api/masters/clients")
@app.get("/api/clients")
def get_master_clients(db: Session = Depends(get_db)):
    try:
        clients = db.query(Client).all()
        return {"success": True, "clients": [
            {
                "id": str(c.id),
                "name": c.name,
                "clientName": c.name,
                "address": c.address or c.client_address,
                "clientAddress": c.client_address or c.address,
                "primary_contact": c.primary_contact,
                "contact": c.primary_contact,
                "contact_email": c.contact_email,
                "email": c.contact_email,
                "logo": c.logo,
                "created_by": c.created_by,
                "created_at": c.created_at,
                "modified_by": c.modified_by,
                "modified_at": c.modified_at
            } for c in clients
        ]}
    except Exception as e:
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})


@app.post("/api/masters/clients")
@app.post("/api/clients")
def create_master_client(payload: ClientMasterRequest, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        client_name = (payload.name or payload.client_name or "New Client").strip()
        client_addr = payload.address or payload.client_address
        creator_id = current_user.get("full_name") or current_user.get("email") or "Creator"

        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        client = Client(
            name=client_name,
            address=client_addr,
            client_address=client_addr,
            primary_contact=payload.primary_contact,
            contact_email=payload.contact_email,
            logo=payload.logo,
            created_by=creator_id,
            created_at=now_str,
            modified_by=creator_id,
            modified_at=now_str
        )
        db.add(client)
        db.commit()
        db.refresh(client)
        return {"success": True, "client": {
            "id": str(client.id),
            "name": client.name,
            "clientName": client.name,
            "address": client.address,
            "clientAddress": client.client_address,
            "primary_contact": client.primary_contact,
            "contact_email": client.contact_email,
            "logo": client.logo,
            "created_by": client.created_by,
            "created_at": client.created_at,
            "modified_by": client.modified_by,
            "modified_at": client.modified_at
        }}
    except Exception as e:
        db.rollback()
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})


@app.delete("/api/masters/clients/{client_id}")
@app.delete("/api/clients/{client_id}")
def delete_client(client_id: str, db: Session = Depends(get_db)):
    try:
        raw_id = str(client_id).replace("client-", "")
        client = None
        try:
            c_uuid = uuid.UUID(raw_id)
            client = db.query(Client).filter_by(id=c_uuid).first()
        except ValueError:
            pass

        if not client:
            client = db.query(Client).filter(func.lower(Client.name) == str(client_id).lower()).first()

        if client:
            db.delete(client)
            db.commit()
        return {"success": True}
    except Exception as e:
        db.rollback()
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})
