@echo off
set ROOT=C:\Users\DEWA\Documents\kiroproject\test

wt -d "%ROOT%\backend" --title Backend cmd /k "call .venv\Scripts\activate.bat && uvicorn app.main:app --reload" ; new-tab -d "%ROOT%\frontend" --title Frontend cmd /k "npm run dev"