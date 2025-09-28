@echo off
echo.
echo ========================================
echo         Splitsy Backend Launcher
echo ========================================
echo.
echo Choose your backend mode:
echo.
echo [1] Test Server (No MongoDB required)
echo [2] Full Server (Requires MongoDB)
echo [3] Exit
echo.
set /p choice="Enter your choice (1-3): "

if "%choice%"=="1" (
    echo.
    echo Starting Test Server on port 3001...
    echo This works without MongoDB and has mock data.
    echo Press Ctrl+C to stop the server.
    echo.
    node test-server.js
) else if "%choice%"=="2" (
    echo.
    echo Starting Full MongoDB Server on port 3000...
    echo Make sure MongoDB is running first!
    echo Press Ctrl+C to stop the server.
    echo.
    node server.js
) else if "%choice%"=="3" (
    echo Goodbye!
    exit /b 0
) else (
    echo Invalid choice. Please try again.
    pause
    goto :start
)

pause