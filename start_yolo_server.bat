@echo off
REM Quick Start Script for YOLO AI Proctoring System
REM Run this script to start all required services

echo ============================================
echo   YOLO AI Proctoring - Quick Start
echo ============================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in PATH!
    echo Please install Python 3.8+ from https://www.python.org/
    pause
    exit /b 1
)

echo [1/4] Checking Python installation...
python --version
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo [2/4] Checking Node.js installation...
node --version
echo.

REM Navigate to AI proctoring directory
cd /d "%~dp0backend\ai_proctoring"

REM Check if virtual environment exists
if not exist "venv" (
    echo [3/4] Creating Python virtual environment...
    python -m venv venv
    echo Virtual environment created!
) else (
    echo [3/4] Virtual environment already exists.
)
echo.

REM Activate virtual environment and install dependencies
echo [4/4] Installing Python dependencies...
call venv\Scripts\activate.bat

REM Check if requirements are already installed
pip show ultralytics >nul 2>&1
if %errorlevel% neq 0 (
    echo Installing packages: ultralytics, opencv-python, mediapipe, flask...
    pip install -r requirements.txt
    echo Dependencies installed successfully!
) else (
    echo Dependencies already installed.
)
echo.

echo ============================================
echo   Starting YOLO Proctoring Server
echo ============================================
echo.
echo YOLO server will start on: http://localhost:5001
echo.
echo [INFO] First run will download YOLOv8 model (~6MB)
echo [INFO] Press Ctrl+C to stop the server
echo.
echo Starting in 3 seconds...
timeout /t 3 /nobreak >nul

python yolo_detector.py

REM If server exits, show message
echo.
echo ============================================
echo   YOLO Server Stopped
echo ============================================
echo.
pause
