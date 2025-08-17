@echo off
echo =========================================
echo Instalacao da Plataforma de Investimentos
echo =========================================

REM Verificar se Python esta instalado
python --version >nul 2>&1
if errorlevel 1 (
    echo X Python 3 nao esta instalado. Por favor, instale Python 3.9 ou superior.
    pause
    exit /b 1
)

REM Verificar se Node.js esta instalado
node --version >nul 2>&1
if errorlevel 1 (
    echo X Node.js nao esta instalado. Por favor, instale Node.js 16 ou superior.
    pause
    exit /b 1
)

echo OK Dependencias verificadas

REM Instalar Backend
echo.
echo Instalando Backend...
cd backend

REM Criar ambiente virtual
python -m venv venv

REM Ativar ambiente virtual e instalar dependencias
call venv\Scripts\activate.bat
pip install --upgrade pip
pip install -r requirements.txt

REM Criar arquivo .env se nao existir
if not exist .env (
    echo DATABASE_URL=sqlite:///./portfolio.db > .env
    echo SECRET_KEY=your-secret-key-change-in-production >> .env
    echo ALGORITHM=HS256 >> .env
    echo ACCESS_TOKEN_EXPIRE_MINUTES=30 >> .env
    echo OK Arquivo .env criado
)

deactivate
cd ..

REM Instalar Frontend
echo.
echo Instalando Frontend...
cd frontend
call npm install
cd ..

echo.
echo =========================================
echo OK Instalacao concluida com sucesso!
echo =========================================
echo.
echo Para iniciar a aplicacao:
echo.
echo 1. Backend (em um terminal):
echo    cd backend
echo    venv\Scripts\activate
echo    python run.py
echo.
echo 2. Frontend (em outro terminal):
echo    cd frontend
echo    npm run dev
echo.
echo Acesse: http://localhost:5173
echo.
pause
