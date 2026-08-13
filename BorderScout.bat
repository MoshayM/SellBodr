@echo off
setlocal enabledelayedexpansion
title BorderScout AI - Starting...
color 0A

echo.
echo  ================================================
echo   BorderScout AI  -  Starting up...
echo  ================================================
echo.

set "ROOT=D:\project\BorderScout AI"
set "API_DIR=%ROOT%\apps\api"
set "WEB_DIR=%ROOT%\apps\web"
set "CORE_DIR=%ROOT%\packages\core"

REM ── Ensure node/pnpm are on PATH ──────────────────────────
set "PATH=C:\Program Files\nodejs;C:\Users\Win\AppData\Roaming\npm;%PATH%"

REM ── [1] Kill existing processes on 3000 / 4000 ────────
echo  Stopping any running servers...
for %%P in (3000 4000) do (
    for /f "tokens=5" %%I in ('netstat -ano 2^>nul ^| findstr ":%%P " ^| findstr "LISTENING"') do (
        taskkill /F /PID %%I >nul 2>&1
    )
)
timeout /t 1 /nobreak >nul

REM ── [2] Ensure .env exists ─────────────────────────────
if not exist "%API_DIR%\.env" (
    echo  Creating .env...
    (
        echo NODE_ENV=development
        echo API_PORT=4000
        echo WEB_URL=http://localhost:3000
        echo DATABASE_URL=file:./dev.db
        echo JWT_ACCESS_SECRET=borderscout-access-secret-2024
        echo JWT_REFRESH_SECRET=borderscout-refresh-secret-2024
        echo JWT_ACCESS_EXPIRY=3600
        echo JWT_REFRESH_EXPIRY=604800
        echo GOOGLE_CLIENT_ID=
        echo GOOGLE_CLIENT_SECRET=
        echo ANTHROPIC_API_KEY=
        echo OPENAI_API_KEY=
        echo MODEL_PROVIDER=anthropic
        echo MODEL_BUDGET_USD_PER_PIPELINE=0.50
        echo STRIPE_SECRET_KEY=
        echo STRIPE_WEBHOOK_SECRET=
        echo CORS_ORIGIN=http://localhost:3000
    ) > "%API_DIR%\.env"
)

REM Inject API keys from text files
set "_akey="
if exist "%ROOT%\Antropic API Key.txt" (
    for /f "usebackq delims=" %%K in ("%ROOT%\Antropic API Key.txt") do (
        if "!_akey!"=="" set "_akey=%%K"
    )
)
set "_okey="
if exist "%ROOT%\Open AI API Key.txt" (
    for /f "usebackq delims=" %%K in ("%ROOT%\Open AI API Key.txt") do (
        if "!_okey!"=="" set "_okey=%%K"
    )
)
if not "!_akey!"=="" (
    powershell -NoProfile -Command "(Get-Content '%API_DIR%\.env') -replace '^ANTHROPIC_API_KEY=.*','ANTHROPIC_API_KEY=!_akey!' | Set-Content '%API_DIR%\.env'"
)
if not "!_okey!"=="" (
    powershell -NoProfile -Command "(Get-Content '%API_DIR%\.env') -replace '^OPENAI_API_KEY=.*','OPENAI_API_KEY=!_okey!' | Set-Content '%API_DIR%\.env'"
)

REM Load .env into this process (prisma + build need these vars)
for /f "usebackq tokens=1,* delims==" %%A in ("%API_DIR%\.env") do (
    set "_k=%%A"
    if not "!_k:~0,1!"=="#" if not "%%A"=="" set "%%A=%%B"
)
set NODE_ENV=development
set API_PORT=4000
set CORS_ORIGIN=http://localhost:3000

REM ── [3] Prisma - only if DB missing or schema changed ──
set "NEED_DB=1"
if exist "%API_DIR%\dev.db" (
    powershell -NoProfile -Command "if((Get-Item '%API_DIR%\prisma\schema.prisma').LastWriteTime -le (Get-Item '%API_DIR%\dev.db').LastWriteTime){exit 0}else{exit 1}" >nul 2>&1
    if !errorlevel!==0 set "NEED_DB=0"
)
if "!NEED_DB!"=="1" (
    echo  Syncing database...
    cd /d "%API_DIR%"
    pnpm exec prisma generate >nul 2>&1
    pnpm exec prisma db push --accept-data-loss >nul 2>&1
    pnpm exec prisma db seed >nul 2>&1
    echo  Database ready.
) else (
    echo  Database up-to-date. Skipping prisma.
)

REM ── [4] Build - only if source files changed ───────────
set "NEED_BUILD=1"
if exist "%API_DIR%\dist\src\main.js" (
    powershell -NoProfile -Command "$d=(Get-Item '%API_DIR%\dist\src\main.js').LastWriteTime; $n=Get-ChildItem '%API_DIR%\src' -Recurse -Filter '*.ts' | Where-Object{$_.LastWriteTime -gt $d} | Select-Object -First 1; if($n){exit 1}else{exit 0}" >nul 2>&1
    if !errorlevel!==0 set "NEED_BUILD=0"
)
if "!NEED_BUILD!"=="1" (
    echo  Building API...
    cd /d "%CORE_DIR%"
    pnpm run build >nul 2>&1
    cd /d "%API_DIR%"
    pnpm run build >"%TEMP%\bs_build.log" 2>&1
    if errorlevel 1 (
        echo.
        echo  [BUILD FAILED] Details:
        echo  ------------------------------------------------
        type "%TEMP%\bs_build.log"
        echo  ------------------------------------------------
        echo.
        pause
        exit /b 1
    )
    echo  Build complete.
) else (
    echo  No source changes. Skipping build.
)

REM ── [5] Launch both servers ─────────────────────────────
echo.
echo  Launching servers...
echo.

start "BorderScout API  [port 4000]" /d "%API_DIR%" cmd /k "set PATH=C:\Program Files\nodejs;C:\Users\Win\AppData\Roaming\npm;%PATH% && color 0B && echo. && echo  API  http://localhost:4000/v1 && echo. && node dist\src\main"
start "BorderScout Web  [port 3000]" /d "%WEB_DIR%" cmd /k "set PATH=C:\Program Files\nodejs;C:\Users\Win\AppData\Roaming\npm;%PATH% && color 0D && echo. && echo  Web  http://localhost:3000 && echo. && pnpm run dev"

REM ── [6] Wait for web then open browser ─────────────────
echo  Waiting for web server...
set /a _t=0

:waitloop
set /a _t+=1
powershell -NoProfile -Command "try{$c=New-Object Net.Sockets.TcpClient;$c.Connect('localhost',3000);$c.Close();exit 0}catch{exit 1}" >nul 2>&1
if %errorlevel%==0 goto :ready
if %_t%==10 echo  Compiling pages... (first run takes ~60s, restart is faster)
if %_t%==25 echo  Still loading...
if %_t%==60 goto :opennow
timeout /t 3 /nobreak >nul
goto :waitloop

:ready
echo  App is ready!
:opennow
echo.
echo  ================================================
echo   Web    http://localhost:3000
echo   API    http://localhost:4000/v1
echo.
echo   Email  owner@borderscout.ai
echo   Pass   BorderScout@2024
echo  ================================================
echo.
start "" "http://localhost:3000"
title BorderScout AI - Running
echo  Press any key to close this launcher.
pause >nul
endlocal
