@echo off
title Ruthko Connect Local Server
cd /d %~dp0
echo Starting Ruthko Connect at http://localhost:5500
echo Press CTRL + C to stop this server.
python -m http.server 5500
pause
