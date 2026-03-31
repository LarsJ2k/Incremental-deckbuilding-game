@echo off
cd /d "C:\Users\lja08\Desktop\Overig\Codex\Deckbuilder roguelite"
start cmd /k "npm run dev"
timeout /t 5 >nul
start http://localhost:5173