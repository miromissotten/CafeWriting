@echo off
cd /d "%~dp0"
echo Starting Café Writing Sharing...
call npm install --no-fund --no-audit --loglevel=error
start "Café Writing Sharing" cmd /k "npm start"
timeout /t 6 /nobreak >nul
start "" http://localhost:3000
echo Opened the app at http://localhost:3000
exit
