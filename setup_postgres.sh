#!/bin/bash

echo "🐘 Configurando PostgreSQL para o Portfolio de Investimentos"
echo "============================================================="

# Verificar se o Homebrew está instalado
if ! command -v brew &> /dev/null; then
    echo "❌ Homebrew não encontrado. Instalando..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi

# Instalar PostgreSQL
echo "📦 Instalando PostgreSQL..."
brew install postgresql@14

# Iniciar o serviço PostgreSQL
echo "🚀 Iniciando PostgreSQL..."
brew services start postgresql@14

# Aguardar o PostgreSQL iniciar
sleep 5

# Criar usuário e banco de dados
echo "👤 Criando usuário e banco de dados..."

# Criar usuário portfolio_user
psql postgres -c "CREATE USER portfolio_user WITH ENCRYPTED PASSWORD 'portfolio_pass';"

# Criar banco portfolio_db
psql postgres -c "CREATE DATABASE portfolio_db OWNER portfolio_user;"

# Conceder privilégios
psql postgres -c "GRANT ALL PRIVILEGES ON DATABASE portfolio_db TO portfolio_user;"

echo ""
echo "✅ PostgreSQL configurado com sucesso!"
echo ""
echo "📊 Configurações do banco:"
echo "   Host: localhost"
echo "   Port: 5432"
echo "   Database: portfolio_db"
echo "   User: portfolio_user"
echo "   Password: portfolio_pass"
echo ""
echo "🔗 URL de conexão:"
echo "   postgresql://portfolio_user:portfolio_pass@localhost:5432/portfolio_db"
echo ""
echo "🔧 Para parar PostgreSQL:"
echo "   brew services stop postgresql@14"
echo ""
echo "🔧 Para reiniciar PostgreSQL:"
echo "   brew services restart postgresql@14"
echo ""


