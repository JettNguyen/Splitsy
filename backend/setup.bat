@echo off
REM Splitsy Backend Setup Script for Windows

echo 🚀 Setting up Splitsy Backend...

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed. Please install Node.js 16+ and try again.
    pause
    exit /b 1
)

echo [SUCCESS] Node.js detected
node -v

REM Navigate to backend directory
cd /d "%~dp0"
echo [INFO] Working directory: %CD%

REM Install dependencies
echo [INFO] Installing backend dependencies...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install dependencies
    pause
    exit /b 1
)
echo [SUCCESS] Dependencies installed successfully

REM Check if .env file exists
if not exist ".env" (
    echo [WARNING] .env file not found. Creating from template...
    if exist ".env.example" (
        copy ".env.example" ".env"
        echo [SUCCESS] .env file created from template
    ) else (
        echo [ERROR] .env.example template not found
        pause
        exit /b 1
    )
)

REM Generate JWT secret if not set (Windows doesn't have openssl by default)
findstr /C:"your-super-secret-jwt-key-here" .env >nul
if %ERRORLEVEL% EQU 0 (
    echo [INFO] Please manually update the JWT_SECRET in .env file with a secure random string
    echo [INFO] You can generate one online at: https://www.allkeysgenerator.com/Random/Security-Encryption-Key-Generator.aspx
)

echo [SUCCESS] ✅ Backend setup completed successfully!
echo.
echo [INFO] Next steps:
echo [INFO] 1. Review and update the .env file with your configuration
echo [INFO] 2. Install and start MongoDB if using local database
echo [INFO] 3. Start the development server: npm run dev
echo [INFO] 4. The API will be available at http://localhost:3000
echo [INFO] 5. Health check: http://localhost:3000/health
echo.
echo [INFO] Available scripts:
echo [INFO]   npm run dev    - Start development server with auto-reload
echo [INFO]   npm start      - Start production server
echo.
echo [WARNING] Don't forget to update the MongoDB connection string in .env if using MongoDB Atlas!

pause