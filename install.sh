#!/bin/bash

echo "========================================="
echo "Instalação da Plataforma de Investimentos"
echo "========================================="

# Verificar se Python está instalado
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 não está instalado. Por favor, instale Python 3.9 ou superior."
    exit 1
fi

# Verificar se Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não está instalado. Por favor, instale Node.js 16 ou superior."
    exit 1
fi

echo "✅ Dependências verificadas"

# Instalar Backend
echo ""
echo "📦 Instalando Backend..."
cd backend

# Criar ambiente virtual
python3 -m venv venv

# Ativar ambiente virtual e instalar dependências
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# Criar arquivo .env se não existir
if [ ! -f .env ]; then
    echo "DATABASE_URL=sqlite:///./portfolio.db" > .env
    echo "SECRET_KEY=$(openssl rand -hex 32)" >> .env
    echo "ALGORITHM=HS256" >> .env
    echo "ACCESS_TOKEN_EXPIRE_MINUTES=30" >> .env
    echo "✅ Arquivo .env criado"
fi

deactivate
cd ..

# Instalar Frontend
echo ""
echo "📦 Instalando Frontend..."
cd frontend
npm install
cd ..

echo ""
echo "========================================="
echo "✅ Instalação concluída com sucesso!"
echo "========================================="
echo ""
echo "Para iniciar a aplicação:"
echo ""
echo "1. Backend (em um terminal):"
echo "   cd backend"
echo "   source venv/bin/activate  # No Windows: venv\\Scripts\\activate"
echo "   python run.py"
echo ""
echo "2. Frontend (em outro terminal):"
echo "   cd frontend"
echo "   npm run dev"
echo ""
echo "Acesse: http://localhost:5173"
echo ""
