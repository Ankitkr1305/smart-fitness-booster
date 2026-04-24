@echo off
cd /d "%~dp0"
set PORT=5000
node backend\server.js
