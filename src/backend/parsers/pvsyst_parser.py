import os
import re
import time

from unstract.llmwhisperer import LLMWhispererClientV2

# ============================================================
# CONFIG
# ============================================================
API_KEY = os.getenv("LLMWHISPERER_API_KEY")

if not API_KEY:
    raise ValueError(
        "Missing LLMWHISPERER_API_KEY environment variable"
    )
BASE_URL = (
    "https://llmwhisperer-api.us-central.unstract.com/api/v2"
)

# ============================================================
# HELPERS
# ============================================================

def extract_value(pattern, text, default=0):

    

    match = re.search(pattern, text, re.IGNORECASE)

    if not match:
        return default

    try:
        return float(match.group(1))
    except:
        return default


# ============================================================
# MAIN FUNCTION
# ============================================================

def extract_pvsyst_data(pdf_path, page_no=1):
    
    print("=" * 50)
    print("PDF PATH:", pdf_path)
    print("FILE EXISTS:", os.path.exists(pdf_path))
    print("API KEY:", API_KEY)
    print("API KEY TYPE:", type(API_KEY))
    print("=" * 50)

    if not os.path.exists(pdf_path):
        raise FileNotFoundError(
            f"PDF not found: {pdf_path}"
        )

    client = LLMWhispererClientV2(
        base_url=BASE_URL,
        api_key="9FNwn6xdd6TCJfIh8U4MUKBlvkufKGETEGKisfcHU_Q",
    )

    result = client.whisper(
        file_path=pdf_path,
        pages_to_extract=[1],
        mark_horizontal_lines=True,
        mark_vertical_lines=True,
    )

    while True:

        status = client.whisper_status(
            whisper_hash=result["whisper_hash"]
        )

        if status["status"] == "processed":

            extracted = client.whisper_retrieve(
                whisper_hash=result["whisper_hash"]
            )

            break

        time.sleep(8)

    text = extracted["extraction"]["result_text"]
    # print("Using API Key:", API_KEY[:10] + "...")

    return {

        "irradiation": {

            "ghi": extract_value(
                r'(\d+\.?\d*)\s*[\|\s]*kWh/m2\s*[\|\s]*Global horizontal irradiation',
                text
            ),

            "globalIncidentInCollectorPlane": extract_value(
                r'\+?(-?\d+\.?\d*)\s*[\|\s]*%\s*[\|\s]*Global incident',
                text
            ),

            "nearShadingLoss": extract_value(
                r'(-?\d+\.?\d*)\s*[\|\s]*%\s*[\|\s]*Near Shadings',
                text
            ),

            "soilingLossFactor": extract_value(
                r'(-?\d+\.?\d*)\s*[\|\s]*%\s*[\|\s]*Soiling',
                text
            ),

            "iamFactorOnGlobal": extract_value(
                r'(-?\d+\.?\d*)\s*[\|\s]*%\s*[\|\s]*IAM',
                text
            ),

            "groundReflectionFrontSide": extract_value(
                r'(\+?\-?\d+\.?\d*)\s*[\|\s]*%\s*[\|\s]*Ground reflection on front side',
                text
            ),

            "bifacialGhiOnGround": extract_value(
                r'(\d+\.?\d*)\s*[\|\s]*kWh/m2\s*[\|\s]*on',
                text
            ),

            "groundReflectionLoss": extract_value(
                r'(-?\d+\.?\d*)\s*[\|\s]*%.*Ground reflection loss',
                text
            ),

            "viewFactorRearSide": extract_value(
                r'(-?\d+\.?\d*)\s*[\|\s]*%\s*[\|\s]*View Factor',
                text
            ),

            "skyDiffuseRearSide": extract_value(
                r'(\+?\-?\d+\.?\d*)\s*[\|\s]*%\s*[\|\s]*Sky diffuse',
                text
            ),

            "beamEffectiveRearSide": extract_value(
                r'(\+?\-?\d+\.?\d*)\s*[\|\s]*%\s*[\|\s]*Beam effective',
                text
            ),

            "shadingLossRearSide": extract_value(
                r'(-?\d+\.?\d*)\s*[\|\s]*%\s*[\|\s]*Shadings loss on rear side',
                text
            ),

            "globalIrradianceRearSide": extract_value(
                r'(\d+\.?\d*)\s*[\|\s]*%\s*[\|\s]*Global Irradiance',
                text
            )
        },

        "energy": {

            "arrayNominalEnergyAtSTC": extract_value(
                r'(\d+\.?\d*)\s*[\|\s]*MWh\s*[\|\s]*Array nominal',
                text
            ),

            "pvLossDueToIrradianceLevel": extract_value(
                r'(-?\d+\.?\d*)\s*[\|\s]*%\s*[\|\s]*PV loss due to irradiance',
                text
            ),

            "pvLossDueToTemperature": extract_value(
                r'(-?\d+\.?\d*)\s*[\|\s]*%\s*[\|\s]*PV loss due to temperature',
                text
            ),

            "shadingElectricalLoss": extract_value(
                r'(-?\d+\.?\d*)\s*[\|\s]*%\s*[\|\s]*Shadings:\s*Electrical Loss',
                text
            ),

            "moduleQualityLoss": extract_value(
                r'(\+?\-?\d+\.?\d*)\s*[\|\s]*%\s*[\|\s]*Module quality',
                text
            ),

            "lidLoss": extract_value(
                r'(-?\d+\.?\d*)\s*[\|\s]*%\s*[\|\s]*LID',
                text
            ),

            "mismatchLossModuleString": extract_value(
                r'(-?\d+\.?\d*)\s*[\|\s]*%\s*[\|\s]*Mismatch loss',
                text
            ),

            "mismatchLossBackIrradiance": extract_value(
                r'(-?\d+\.?\d*)\s*[\|\s]*%\s*[\|\s]*Mismatch for back',
                text
            ),

            "ohmicWiringLoss": extract_value(
                r'(-?\d+\.?\d*)\s*[\|\s]*%\s*[\|\s]*Ohmic wiring',
                text
            ),

            "arrayVirtualEnergyAtMPP": extract_value(
                r'(\d+\.?\d*)\s*[\|\s]*MWh\s*[\|\s]*Array virtual',
                text
            ),

            "inverterEfficiencyLoss": extract_value(
                r'(-?\d+\.?\d*)\s*[\|\s]*%\s*[\|\s]*Inverter Loss during operation',
                text
            ),

            "inverterLossOverNominalPower": extract_value(
                r'(-?\d+\.?\d*)\s*[\|\s]*%\s*[\|\s]*Inverter Loss over nominal inv\. power',
                text
            ),

            "energyAtInverterOutput": extract_value(
                r'(\d+\.?\d*)\s*[\|\s]*MWh\s*[\|\s]*Available Energy',
                text
            ),

            "auxiliaryLoss": extract_value(
                r'(-?\d+\.?\d*)\s*[\|\s]*%\s*[\|\s]*Auxiliaries',
                text
            ),

            "acOhmicLoss": extract_value(
                r'(-?\d+\.?\d*)\s*[\|\s]*%\s*[\|\s]*AC ohmic',
                text
            ),

            "mvTransformerLoss": extract_value(
                r'(-?\d+\.?\d*)\s*[\|\s]*%\s*[\|\s]*Medium voltage transfo',
                text
            ),

            "mvLineOhmicLoss": extract_value(
                r'(-?\d+\.?\d*)\s*[\|\s]*%\s*[\|\s]*MV line',
                text
            ),

            "hvTransformerLoss": extract_value(
                r'(-?\d+\.?\d*)\s*[\|\s]*%\s*[\|\s]*High voltage transfo',
                text
            ),

            "hvLineOhmicLoss": extract_value(
                r'(-?\d+\.?\d*)\s*[\|\s]*%\s*[\|\s]*HV line',
                text
            ),

            "activeEnergyInjectedToGrid": extract_value(
                r'(\d+\.?\d*)\s*[\|\s]*MWh\s*[\|\s]*Active Energy',
                text
            ),

            "specificYield": 0,

            "dcCUF": 0
        }
        
        #  return {
        # "fileExists": os.path.exists(pdf_path),
        # "pdfPath": pdf_path,
        # "message": "Parser reached successfully"
    }
    # }