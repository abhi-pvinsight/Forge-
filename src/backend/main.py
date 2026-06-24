
from fastapi import FastAPI, UploadFile, File
import tempfile
import os
import traceback
from pydantic import BaseModel
from fastapi.responses import StreamingResponse, JSONResponse
import io
import traceback

from calculationRepo.generateSolarReport import generate_solar_report

from Ashrae.ashrae_service import process_and_populate_report

from parsers.pvsyst_parser import extract_pvsyst_data

app = FastAPI()

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

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://YOUR-VERCEL-APP.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/ashrae")
def generate_ashrae(data: AshraeRequest):

    try:
        process_and_populate_report(
            data.latitude,
            data.longitude
        )

        return {
            "success": True,
            "message": "ASHRAE data generated"
        }

    except Exception as e:
        traceback.print_exc()

        return {
            "success": False,
            "error": str(e)
        }
        
@app.post("/generate-solar-report")
def generate_solar_report_api(payload: SolarReportRequest):
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