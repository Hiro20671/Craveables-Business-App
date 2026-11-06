@echo off
echo ========================================================
echo   CRAVEABLES Business Management System - Launcher
echo ========================================================
echo.

echo Starting Django REST Backend on http://127.0.0.1:8000 ...
start "CRAVEABLES Backend" cmd /k "cd backend && venv\Scripts\activate && python manage.py runserver 127.0.0.1:8000"

timeout /t 2 >nul

echo Starting React + Vite Frontend on http://127.0.0.1:5173 ...
start "CRAVEABLES Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ========================================================
echo   Both servers launched!
echo   Frontend: http://127.0.0.1:5173
echo   Backend:  http://127.0.0.1:8000
echo   Admin credentials: admin / admin123
echo ========================================================
pause

