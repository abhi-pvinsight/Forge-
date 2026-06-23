# backend/main.py

# from fastapi import FastAPI, UploadFile, File
# from parsers.pvsyst_parser import extract_pvsyst_data
# import tempfile

# app = FastAPI()

# @app.post("/extract/pvsyst")
# async def extract_pvsyst(file: UploadFile = File(...)):

#     with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
#         tmp.write(await file.read())
#         pdf_path = tmp.name

#     result = extract_pvsyst_data(pdf_path)

#     return result

from fastapi import FastAPI, UploadFile, File
import tempfile
import os
import traceback

from parsers.pvsyst_parser import extract_pvsyst_data

app = FastAPI()


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
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# @app.post("/extract/pvsyst")
# async def extract_pvsyst(file: UploadFile = File(...)):

#     contents = await file.read()

#     with tempfile.NamedTemporaryFile(
#         delete=False,
#         suffix=".pdf"
#     ) as temp_file:

#         temp_file.write(contents)

#         temp_path = temp_file.name

#     result = extract_pvsyst_data(temp_path)

#     return {
#         "success": True,
#         "result": result
#     }