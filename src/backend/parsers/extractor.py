import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "app")))
from database import SessionLocal, PVModule, PVVariant
import re
import json
import time
import shutil
import requests
from google import genai
from unstract.llmwhisperer import LLMWhispererClientV2
from database import SessionLocal, PVModule, PVVariant

# Initialize Clients
LLM_WHISPERER = LLMWhispererClientV2(
    base_url="https://llmwhisperer-api.us-central.unstract.com/api/v2", 
    api_key='api key need to uplaod ')
# Update with your Gemini API key or set via env variable
GEMINI_CLIENT = genai.Client(api_key="pi key need to uplaod")

PROMPT_TEMPLATE = """
You are an expert solar PV engineer and datasheet parser. Analyze this raw text data extracted from a PV datasheet.
Return a valid JSON object matching the requested schema.

CRITICAL RULES:
1. Return ONLY a valid JSON object. No markdown blocks like ```json ... ```, just pure string.
2. The "variants" key must contain an array representing each wattage column available (extract pmax, pstc, voc, vmp, isc, imp, efficiency).
3. If a property is missing or not mentioned, return null.

Target Schema JSON Structure to follow:
{{
  "manufacturer": "Extract make name",
  "module_model": "Extract model series name",
  "bifacial_coefficient": null,
  "noct": null,
  "series_fuse_rating": null,
  "operating_temperature_range": null,
  "dimensions_mm": null,
  "weight_kg": null,
  "cells_count": null,
  "cell_type": null,
  "front_glass": null,
  "back_glass": null,
  "output_cable": null,
  "connector": null,
  "junction_box": null,
  "temperature_coefficients": {{ "isc_alpha": null, "voc_beta": null, "pm_gamma": null }},
  "load_rating": {{ "wind": null, "snow": null }},
  "degradation": {{ "first_year": null, "yearly": null, "year_30": null }},
  "warranty": {{ "product": null, "performance": null }},
  "variants": [
     {{ "pmax": null, "pstc": null, "voc": null, "vmp": null, "isc": null, "imp": null, "efficiency": null }}
  ]
}}

Text Data:
{extracted_text}
"""

def clean_and_parse_json(raw_text: str) -> dict:
    clean = raw_text.strip()
    if clean.startswith("```"):
        clean = re.sub(r"^```json\s*|```$", "", clean, flags=re.MULTILINE)
    return json.loads(clean.strip())

# extractor.py

async def get_pdf_text_via_whisperer(file_path: str, page_no: int = 1) -> str:
    print(f"⏳ Extracting raw structural text from page {page_no} (Sync Mode)...")
    try:
        # Request synchronous extraction from LLM Whisperer V2
        result = LLM_WHISPERER.whisper(
            file_path=file_path, 
            pages_to_extract=str(page_no), # V2 client expects pages as a string
            wait_for_completion=True,
            wait_timeout=200
        )
        
        # 1. Official V2 Synchronous Return Format check
        if "extracted_text" in result and result["extracted_text"]:
            return result["extracted_text"]
            
        # 2. Asynchronous Polling Fallback Return Format check
        elif "extraction" in result and "result_text" in result["extraction"]:
            return result["extraction"]["result_text"]
            
        else:
            print("⚠️ Unexpected JSON response structure from LLM Whisperer:")
            import json
            print(json.dumps(result, indent=2))
            raise KeyError("Could not locate extracted text keys in API response.")
            
    except Exception as e:
        print(f"❌ LLM Whisperer execution failure: {e}")
        raise e

def validate_extraction(data: dict) -> bool:
    """Verifies critical parameters are caught to ensure calculation integrity."""
    if not data or not data.get("module_model") or not data.get("variants"):
        return False
    first_variant = data["variants"][0]
    for key in ["pmax", "voc", "efficiency"]:
        if not first_variant.get(key):
            return False
    return True

def commit_extracted_data_to_db(data: dict):
    """Saves the fully parsed data structure into your PostgreSQL connection."""
    db = SessionLocal()
    try:
        # Avoid duplicate model insertion
        existing = db.query(PVModule).filter(PVModule.module_model == data["module_model"]).first()
        if existing:
            print(f"🔄 Module series {data['module_model']} found in cache. Updating...")
            db.delete(existing)
            db.commit()

        db_module = PVModule(
            manufacturer=data.get("manufacturer"), module_model=data.get("module_model"),
            bifacial_coefficient=data.get("bifacial_coefficient"), noct=data.get("noct"),
            series_fuse_rating=data.get("series_fuse_rating"), operating_temperature_range=data.get("operating_temperature_range"),
            dimensions_mm=data.get("dimensions_mm"), weight_kg=data.get("weight_kg"), cells_count=data.get("cells_count"),
            cell_type=data.get("cell_type"), front_glass=data.get("front_glass"), back_glass=data.get("back_glass"),
            output_cable=data.get("output_cable"), connector=data.get("connector"), junction_box=data.get("junction_box"),
            temperature_coefficients=data.get("temperature_coefficients"), load_rating=data.get("load_rating"),
            degradation=data.get("degradation"), warranty=data.get("warranty")
        )
        db.add(db_module)
        db.commit()
        db.refresh(db_module)

        for v in data.get("variants", []):
            db.add(PVVariant(
                module_id=db_module.id, pmax=str(v.get("pmax")), pstc=str(v.get("pstc")),
                voc=str(v.get("voc")), vmp=str(v.get("vmp")), isc=str(v.get("isc")),
                imp=str(v.get("imp")), efficiency=str(v.get("efficiency"))
            ))
        db.commit()
        print(f"💾 Cleanly cached model '{db_module.module_model}' with {len(data['variants'])} power column variants!")
        return db_module.id
    except Exception as e:
        db.rollback()
        print(f"❌ Failed saving data to PostgreSQL: {e}")
        raise e
    finally:
        db.close()

async def execute_extraction_pipeline(file_path: str, page_no: int = 2) -> dict:
    # 1. Parse layout via Whisperer
    raw_text = await get_pdf_text_via_whisperer(file_path, page_no)
    formatted_prompt = PROMPT_TEMPLATE.format(extracted_text=raw_text)
    
    print(clean_and_parse_json(response.text))
    

    # 2. Strategy A: Try primary Gemini parsing engine
    try:
        print("🤖 Running primary extraction via Gemini 2.5 Flash...")
        response = GEMINI_CLIENT.models.generate_content(model='gemini-2.5-flash', contents=formatted_prompt)
        parsed = clean_and_parse_json(response.text)
        if validate_extraction(parsed):
            commit_extracted_data_to_db(parsed)
            return {"status": "success", "source": "gemini", "data": parsed}
    except Exception as e:
        print(f"⚠️ Gemini processing fell through: {e}")

    # 3. Strategy B: Fallback to local Ollama Qwen
    try:
        print("🤖 Gemini fell short. Attempting fallback via Local Ollama Qwen...")
        qwen_res = requests.post(
            "http://localhost:11434/api/generate",
            json={"model": "qwen2.5:3b", "prompt": formatted_prompt, "stream": False},
            timeout=90
        )
        parsed = clean_and_parse_json(qwen_res.json()["response"])
        if validate_extraction(parsed):
            commit_extracted_data_to_db(parsed)
            return {"status": "success", "source": "qwen", "data": parsed}
    except Exception as e:
        print(f"⚠️ Local Qwen fallback fell through: {e}")

    # 4. Strategy C: Full system exception (Signals UI to demand Excel layout template)
    return {"status": "failed", "detail": "PDF incomplete or missing validation metrics. Manual configuration override required."}
