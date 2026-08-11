set LLMWHISPERER_API_KEY=9FNwn6xdd6TCJfIh8U4MUKBlvkufKGETEGKisfcHU_Q
python -m venv venv
venv\Scripts\python.exe -m pip install -r requirements.txt
venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000