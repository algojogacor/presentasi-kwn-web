@echo off
title Deck Kewarganegaraan - Kelompok 6 PDB 93
cd /d "%~dp0"
set "PORT=8788"
set "PYEXE="

rem --- Cari Python: coba launcher "py" dulu, baru "python".
rem     Sengaja tanpa tanda kurung supaya tidak kena masalah
rem     ekspansi %errorlevel% di dalam blok.
py -3 -c "pass" >nul 2>nul
if %errorlevel%==0 set "PYEXE=py -3"
if defined PYEXE goto :serve

python -c "pass" >nul 2>nul
if %errorlevel%==0 set "PYEXE=python"
if defined PYEXE goto :serve

goto :nopython


:serve
echo.
echo   ==================================================
echo    DECK KEWARGANEGARAAN  -  KELOMPOK 6  -  PDB 93
echo   ==================================================
echo.
echo    Alamat    : http://127.0.0.1:%PORT%/index.html
echo    Berhenti  : tutup jendela ini
echo.
echo    Tombol    : panah / spasi   pindah slide
echo                F               layar penuh
echo                P               catatan pembicara
echo                E               mode edit
echo.
echo   PENTING: deck harus dibuka lewat alamat di atas.
echo   Kalau index.html diklik dua kali, video YouTube
echo   tidak akan bisa diputar (Error 153).
echo.
start "" "http://127.0.0.1:%PORT%/index.html"
%PYEXE% -m http.server %PORT% --bind 127.0.0.1
goto :eof


:nopython
echo.
echo   Python tidak ditemukan di komputer ini.
echo.
echo   Deck tetap bisa dibuka dengan klik dua kali index.html,
echo   TAPI video YouTube tidak akan bisa diputar di dalam deck.
echo   Untuk videonya, pakai kode QR di slide atau buka di YouTube.
echo.
echo   Kalau mau video tetap jalan: instal Python dari python.org,
echo   lalu jalankan file ini lagi.
echo.
pause
exit /b 1
