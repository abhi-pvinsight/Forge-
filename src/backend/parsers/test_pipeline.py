# test_pipeline.py
import asyncio
import os
from extractor import execute_extraction_pipeline

async def run_isolated_extraction_test():
    # Make sure you have your target datasheet renamed as "sample.pdf" inside this exact folder!
    CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
    target_pdf = os.path.join(CURRENT_DIR, "sample.pdf")
    
    if not os.path.exists(target_pdf):
        print(f"❌ Could not run check. Please copy a real PDF datasheet into this directory and name it '{target_pdf}'")
        return

    print("🚀 Starting Complete Unified Extraction Execution Pipeline Test...")
    result = await execute_extraction_pipeline(target_pdf, page_no=1)
    
    print("\n📬 FINAL PIPELINE OUTPUT RESULT:")
    print("-" * 60)
    print(json.dumps(result, indent=2))
    print("-" * 60)

if __name__ == "__main__":
    asyncio.run(run_isolated_extraction_test())