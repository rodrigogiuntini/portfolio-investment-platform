#!/bin/bash

echo "🚀 Iniciando Plataforma de Investimentos com PostgreSQL"
echo "======================================================="

# Verificar se PostgreSQL está rodando
if ! brew services list | grep postgresql@14 | grep started > /dev/null; then
    echo "📦 Iniciando PostgreSQL..."
    brew services start postgresql@14
    sleep 3
fi

# Iniciar Backend em background
echo "🔧 Iniciando Backend (PostgreSQL)..."
cd backend
source venv/bin/activate
python main_postgres.py &
BACKEND_PID=$!

# Aguardar backend carregar
sleep 5

# Iniciar Frontend em background
echo "🎨 Iniciando Frontend..."
cd ../frontend
npm run dev &
FRONTEND_PID=$!

# Aguardar frontend carregar
sleep 3

echo ""
echo "✅ APLICAÇÃO RODANDO COM POSTGRESQL!"
echo "========================================"
echo ""
echo "🌐 Frontend: http://localhost:5173"
echo "🔧 Backend:  http://localhost:8000"
echo "📚 API Docs: http://localhost:8000/docs"
echo ""
echo "🗄️ Banco de Dados: PostgreSQL"
echo "   Host: localhost:5432"
echo "   Database: portfolio_db"
echo "   User: portfolio_user"
echo ""
echo "⏹️  Para parar os serviços:"
echo "   kill $BACKEND_PID $FRONTEND_PID"
echo "   brew services stop postgresql@14"
echo ""
echo "🎯 ACESSE: http://localhost:5173"
echo ""

# Manter o script rodando
wait


