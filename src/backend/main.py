import sys
import asyncio

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

import os as _os
from dotenv import load_dotenv
_root = _os.path.abspath(_os.path.join(_os.path.dirname(__file__), "..", ".."))
load_dotenv(_os.path.join(_root, ".env.local"))
load_dotenv(_os.path.join(_root, ".env"))

from fastapi import FastAPI, UploadFile, File, Request, Depends, HTTPException, Header
import tempfile
import os
import traceback
from pydantic import BaseModel
from fastapi.responses import StreamingResponse, JSONResponse
import io
import json
import traceback
from contextlib import asynccontextmanager
from sqlalchemy.orm import Session

from app.auth import get_db, get_current_user, get_default_organization_id, create_access_token, get_password_hash, verify_password
from app.database import Profile, Organization, Report, Client, Project, PVReport, BatteryReport, PCSReport, InverterReport, TransformerReport, SwitchgearReport, CableReport, RelayProtectionReport, ElectricalDesignReport, StructuralReport, GroundingReport

from calculationRepo.generateSolarReport import build_solar_report_data, build_solar_report_pdf 
from Ashrae.ashrae_service import process_and_populate_report

from parsers.pvsyst_parser import extract_pvsyst_data

from pdf_utils import (
    generate_pdf_from_html,
    generate_pdf_with_toc,
    log_memory,
    merge_pdf_documents,
)


import subprocess
import sys

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Run alembic migrations
    print("Running database migrations...")
    subprocess.run([sys.executable, "-m", "alembic", "upgrade", "head"], cwd=os.path.dirname(__file__), check=True)
    yield
    
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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

from pydantic import BaseModel

class AshraeRequest(BaseModel):
    latitude: float
    longitude: float
    
class SolarReportRequest(BaseModel):
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
        
class SolarReportRequest(BaseModel):
    values: dict

class PySAMRequest(BaseModel):
    values: dict

@app.post("/api/run-pysam")
async def run_pysam_endpoint(payload: PySAMRequest):
    try:
        from PySAMRunner import process_all_weather_files
        
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

        values = payload.values
        
        # Ensure Nser is a valid cell count (not the UI's 'modules_series' which means modules in series)
        nser = safe_int(values.get("nser"), 72)
        
        voc = safe_float(values.get("moduleVoc"), 52.0)
        vmp = safe_float(values.get("moduleVmp"), 43.4)
        isc = safe_float(values.get("moduleIsc"), 14.0)
        imp = safe_float(values.get("moduleImp"), 13.3)
        bvoc = safe_float(values.get("tempCoeffVoc"), -0.25)

        # Enforce physical sanity for CEC 6-parameter model solver
        if vmp >= voc or vmp <= 0:
            vmp = round(voc * 0.83, 2)
        if imp >= isc or imp <= 0:
            imp = round(isc * 0.95, 2)
        bvoc = -abs(bvoc) if bvoc != 0 else -0.25

        config = {
            "WeatherFolder": os.path.join(os.path.dirname(__file__), "weather_cache"),
            "BaselineJson": "",
            "CellType": values.get("module_type", "monoSi"),
            "Vmp": vmp,
            "Imp": imp,
            "Voc": voc,
            "Isc": isc,
            "BvocPct": bvoc,
            "AiscPct": 0.05,
            "GpmpPct": -0.4,
            "Nser": nser,
            "Tnoct": 45,
            "Length": 2.0,
            "Width": 1.0,
            "Area": 2.0,
            "IsBifacial": 0,
            "Bifaciality": 0.7,
            "TransmissionFactor": 0.0,
            "GroundClearance": 1.0,
            "Mass": 25,
            "Standoff": "Ground or rack mounted",
            "Mounting": "One story building height or lower",
            "ModulesPerString": safe_int(values.get("string_size"), 20),
            "NStrings": 100,
            "TrackingMode": "Fixed",
            "Backtracking": 0,
            "TiltEqualsLatitude": 0,
            "Tilt": 20,
            "Azimuth": 180,
            "Gcr": 0.4,
            "RotationLimit": 60,
            "SelfShading": "None",
            "RackShading": 0,
            "ModuleOrientation": "Portrait",
            "ModulesAlongSide": 2,
            "ModulesAlongBottom": 20,
            "SkyModel": "Isotropic",
            "IrradianceMode": "DNI and DHI",
            "UseWeatherAlbedo": 0,
            "UseSpatialAlbedo": 0,
            "MonthlyAlbedo": "",
            "NominalAcVoltage": safe_float(values.get("lv_voltage"), 400),
            "MaximumDcVoltage": 1500,
            "MaximumDcCurrent": 200,
            "MinimumMpptVoltage": 500,
            "NominalDcVoltage": 800,
            "MaximumMpptVoltage": 1300,
            "MpptInputs": 1,
            "Latitude": safe_float(values.get("latitude"), 35.0),
            "Longitude": safe_float(values.get("longitude"), -106.0)
        }

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

        values = payload.values
        nser = safe_int(values.get("nser"), 72)
        
        voc = safe_float(values.get("moduleVoc"), 52.0)
        vmp = safe_float(values.get("moduleVmp"), 43.4)
        isc = safe_float(values.get("moduleIsc"), 14.0)
        imp = safe_float(values.get("moduleImp"), 13.3)
        bvoc = safe_float(values.get("tempCoeffVoc"), -0.25)

        # Enforce physical sanity for CEC 6-parameter model solver
        if vmp >= voc or vmp <= 0:
            vmp = round(voc * 0.83, 2)
        if imp >= isc or imp <= 0:
            imp = round(isc * 0.95, 2)
        bvoc = -abs(bvoc) if bvoc != 0 else -0.25

        config = {
            "WeatherFolder": os.path.join(tempfile.gettempdir(), "weather_cache"),
            "BaselineJson": "",
            "CellType": values.get("module_type", "monoSi"),
            "Vmp": vmp,
            "Imp": imp,
            "Voc": voc,
            "Isc": isc,
            "BvocPct": bvoc,
            "AiscPct": 0.05,
            "GpmpPct": -0.4,
            "Nser": nser,
            "Tnoct": 45,
            "Length": 2.0,
            "Width": 1.0,
            "Area": 2.0,
            "IsBifacial": 0,
            "Bifaciality": 0.7,
            "TransmissionFactor": 0.0,
            "GroundClearance": 1.0,
            "Mass": 25,
            "Standoff": "Ground or rack mounted",
            "Mounting": "One story building height or lower",
            "ModulesPerString": safe_int(values.get("string_size"), 20),
            "NStrings": 100,
            "TrackingMode": "Fixed",
            "Backtracking": 0,
            "TiltEqualsLatitude": 0,
            "Tilt": 20,
            "Azimuth": 180,
            "Gcr": 0.4,
            "RotationLimit": 60,
            "SelfShading": "None",
            "RackShading": 0,
            "ModuleOrientation": "Portrait",
            "ModulesAlongSide": 2,
            "ModulesAlongBottom": 20,
            "SkyModel": "Isotropic",
            "IrradianceMode": "DNI and DHI",
            "UseWeatherAlbedo": 0,
            "UseSpatialAlbedo": 0,
            "MonthlyAlbedo": "",
            "NominalAcVoltage": float(values.get("lv_voltage", 400)),
            "MaximumDcVoltage": 1500,
            "MaximumDcCurrent": 200,
            "MinimumMpptVoltage": 500,
            "NominalDcVoltage": 800,
            "MaximumMpptVoltage": 1300,
            "MpptInputs": 1,
            "Latitude": float(values.get("latitude", 35.0)),
            "Longitude": float(values.get("longitude", -106.0))
        }

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
    # 1. Compute pure numbers logic
    report_data = build_solar_report_data(payload.values)
    
    # 2. Build PDF completely decoupled into a dynamic buffer stream
    pdf_buffer = io.BytesIO()
    build_solar_report_pdf(report_data, pdf_buffer)
    
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=Solar_String_Sizing_Report.pdf"}
    )        
        
# @app.post("/generate-solar-report")
# def generate_solar_report_api(payload: SolarReportRequest):
    try:
        react_data = payload.values

        print("RECEIVED VALUES FROM REACT:", react_data)

        if not react_data:
            return JSONResponse(
                status_code=400,
                content={
                    "status": "error",
                    "message": "Missing form metrics values parameter object"
                }
            )

        pdf_buffer = io.BytesIO()
        generate_solar_report(data=react_data, filename=pdf_buffer)
        pdf_buffer.seek(0)

        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={
                "Content-Disposition": "inline; filename=Solar_String_Sizing_Report.pdf"
            }
        )

    except Exception:
        error_trace = traceback.format_exc()
        print("Exception encountered during production compilation:")
        print(error_trace)

        return JSONResponse(
            status_code=500,
            content={
                "status": "error",
                "message": "Server error during report generation.",
                "details": error_trace
            }
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


# ─── SUPABASE SAVING & RETRIEVAL ENDPOINTS ──────────────────────────────────

# ─── LOCAL DB AUTHENTICATION ENDPOINTS ──────────────────────────────────

from typing import Optional
from fastapi import Header, HTTPException, Depends
import uuid

# TODO: replace with get_current_user once real Auth is wired up on the frontend
def get_stub_user_id(x_user_id: str = Header(...)) -> str:
    return x_user_id


class AuthSignInRequest(BaseModel):
    email: str
    password: str


class AuthSignUpRequest(BaseModel):
    full_name: str
    email: str
    department: str
    password: str


class AuthRefreshRequest(BaseModel):
    refresh_token: str


class AuthForgotPasswordRequest(BaseModel):
    email: str


@app.post("/api/auth/sign-in")
def auth_sign_in(payload: AuthSignInRequest, db: Session = Depends(get_db)):
    try:
        user = db.query(Profile).filter(Profile.email == payload.email).first()
        if not user or not verify_password(payload.password, user.hashed_password):
            return JSONResponse(status_code=401, content={"success": False, "error": "Invalid email or password"})
        
        access_token = create_access_token(data={"sub": user.id})
        
        return {
            "success": True,
            "session": {"access_token": access_token},
            "user": {"id": user.id, "email": user.email, "user_metadata": {"full_name": user.full_name}},
        }
    except Exception as e:
        traceback.print_exc()
        return JSONResponse(status_code=400, content={"success": False, "error": str(e)})


@app.post("/api/auth/sign-up")
def auth_sign_up(payload: AuthSignUpRequest, db: Session = Depends(get_db)):
    try:
        normalized_full_name = payload.full_name.strip()
        normalized_email = payload.email.strip()
        normalized_department = payload.department.strip()

        existing = db.query(Profile).filter(Profile.email == normalized_email).first()
        if existing:
            return JSONResponse(status_code=409, content={"success": False, "error": "Email already registered."})

        org_id = get_default_organization_id(db)
        
        user_id = str(uuid.uuid4())
        hashed_password = get_password_hash(payload.password)
        
        new_profile = Profile(
            id=user_id,
            email=normalized_email,
            hashed_password=hashed_password,
            organization_id=org_id,
            role="member",
            full_name=normalized_full_name,
            department=normalized_department
        )
        db.add(new_profile)
        db.commit()
        
        access_token = create_access_token(data={"sub": user_id})
        
        return {
            "success": True,
            "session": {"access_token": access_token},
            "user": {"id": user_id, "email": normalized_email, "user_metadata": {"full_name": normalized_full_name}},
            "profile": {
                "id": user_id,
                "organization_id": org_id,
                "role": "member",
                "full_name": normalized_full_name,
                "department": normalized_department,
            },
            "organization": {
                "id": org_id,
                "name": os.getenv("DEFAULT_ORGANIZATION_NAME", "PV-Insight"),
            },
        }
    except Exception as e:
        db.rollback()
        traceback.print_exc()
        return JSONResponse(status_code=400, content={"success": False, "error": str(e)})


@app.post("/api/auth/refresh")
def auth_refresh(payload: AuthRefreshRequest):
    return JSONResponse(status_code=400, content={"success": False, "error": "Not implemented"})


@app.post("/api/auth/forgot-password")
def auth_forgot_password(payload: AuthForgotPasswordRequest):
    return {"success": True}


@app.get("/api/auth/me")
def auth_me(current_user: dict = Depends(get_current_user)):
    return {"success": True, "user": current_user}


class ReportSaveRequest(BaseModel):
    report_id: Optional[str] = None
    report_type: str
    document_no: Optional[str] = None
    revision: Optional[str] = None
    prepared_date: Optional[str] = None
    report_title: Optional[str] = None
    status: Optional[str] = None
    values: dict

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
        "pvsyst_results": pvsyst_results,
        "irradiation_data": irradiation_data,
        "energy_yield": energy_yield,
        "voc_calculations": voc_calculations,
        "isc_calculations": isc_calculations,
        "degradation_tables": degradation_tables,
        "site_conditions": site_conditions
    }

@app.post("/api/reports/save")
def save_report(payload: ReportSaveRequest, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        user_id = current_user["id"]
        
        # simplified mock of saving using SQLAlchemy - due to the complex dynamic tables
        # just for preserving functionality without supabase
        
        # 1. Create client / project
        client = db.query(Client).first()
        if not client:
            client = Client(name="Default Client")
            db.add(client)
            db.commit()
            db.refresh(client)
            
        project = db.query(Project).filter_by(client_id=client.id).first()
        if not project:
            project = Project(client_id=client.id, name="Default Project")
            db.add(project)
            db.commit()
            db.refresh(project)
            
        # 2. Insert or update parent Report row
        if payload.report_id:
            report = db.query(Report).filter_by(id=payload.report_id).first()
            if not report:
                raise HTTPException(status_code=404, detail="Report not found")
        else:
            report = Report(project_id=project.id, report_type=payload.report_type)
            db.add(report)
            
        report.document_no = payload.document_no or "PVI-BESS-GEN-001"
        report.revision = payload.revision or "A"
        report.prepared_date = payload.prepared_date or "2026-07-03"
        report.report_title = payload.report_title or "Engineering Report"
        report.metadata_json = payload.values
        if payload.status:
            report.status = payload.status
            
        db.commit()
        db.refresh(report)
        saved_id = report.id

        return {"success": True, "report_id": saved_id, "report_type": payload.report_type}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        import traceback
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})

@app.get("/api/reports")
def get_reports_list(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        reports = db.query(Report).order_by(Report.id.desc()).all()
        return {"success": True, "reports": [{"id": r.id, "report_title": r.report_title, "document_no": r.document_no, "revision": r.revision, "report_type": r.report_type, "status": r.status} for r in reports]}
    except Exception as e:
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})

@app.get("/api/reports/last-pv")
def get_last_pv_report(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        report = db.query(Report).filter(Report.report_type == "pv").order_by(Report.id.desc()).first()
        if not report:
            return {"success": True, "data": None}
        return {"success": True, "data": [{"id": report.id, "report_type": report.report_type, "metadata_json": report.metadata_json}]}
    except Exception as e:
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})

@app.get("/api/reports/last/{report_type}")
def get_last_report(report_type: str, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        report = db.query(Report).filter(Report.report_type == report_type).order_by(Report.id.desc()).first()
        if not report:
            return {"success": True, "data": None}
        return {"success": True, "data": [{"id": report.id, "report_type": report.report_type, "metadata_json": report.metadata_json}]}
    except Exception as e:
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})

@app.get("/api/reports/{report_id}")
def get_report_detail(report_id: str, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        report = db.query(Report).filter(Report.id == report_id).first()
        if not report:
            return JSONResponse(status_code=404, content={"success": False, "error": "Report not found"})
        return {"success": True, "data": [{"id": report.id, "report_type": report.report_type, "metadata_json": report.metadata_json}]}
    except Exception as e:
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})

@app.delete("/api/reports/{report_id}")
def delete_report(report_id: str, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        report = db.query(Report).filter(Report.id == report_id).first()
        if not report:
            return JSONResponse(status_code=404, content={"success": False, "error": "Report not found."})

        db.delete(report)
        db.commit()
        return {"success": True, "message": "Report deleted successfully."}
    except Exception as e:
        db.rollback()
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})
