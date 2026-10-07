@echo off
title DualSchedule Generator Web
echo ========================================================
echo   Pornire Generator Orar Dual (ACS & FSA)
echo ========================================================
cd /d "%~dp0"

where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [EROARE] Python nu a fost gasit in sistem!
    echo Te rog sa instalezi Python de pe https://www.python.org
    echo Asigura-te ca bifezi "Add python.exe to PATH" in timpul instalarii.
    echo.
    pause
    exit /b 1
)

echo Se verifica si instaleaza dependintele (Flask)...
pip install -r requirements.txt --quiet

echo.
echo Se porneste aplicatia si se deschide browserul la: http://127.0.0.1:5000
python app.py
pause
