#!/bin/bash

# =============================================================================
# 🚀 SCRIPT DE INICIALIZAÇÃO COMPLETO - PORTFÓLIO DE INVESTIMENTOS
# =============================================================================
# Este script inicializa todo o projeto:
# - PostgreSQL Database
# - Backend (FastAPI)
# - Frontend (React + Vite)
# =============================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Project directory
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"

# Log file
LOG_FILE="$PROJECT_DIR/startup.log"

# Function to print colored output
print_step() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} ${GREEN}✓${NC} $1"
}

print_info() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} ${CYAN}ℹ${NC} $1"
}

print_warning() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} ${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} ${RED}✗${NC} $1"
}

print_header() {
    echo -e "\n${PURPLE}============================================${NC}"
    echo -e "${PURPLE}🚀 $1${NC}"
    echo -e "${PURPLE}============================================${NC}\n"
}

# Function to check if port is in use
check_port() {
    local port=$1
    if lsof -ti:$port > /dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to kill processes on specific ports
kill_port() {
    local port=$1
    local pids=$(lsof -ti:$port 2>/dev/null || true)
    if [ ! -z "$pids" ]; then
        print_warning "Matando processos na porta $port: $pids"
        echo "$pids" | xargs kill -9 2>/dev/null || true
        sleep 2
    fi
}

# Function to wait for service to be ready
wait_for_service() {
    local url=$1
    local service_name=$2
    local max_attempts=30
    local attempt=1
    
    print_info "Aguardando $service_name ficar disponível em $url..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s "$url" > /dev/null 2>&1; then
            print_step "$service_name está pronto!"
            return 0
        fi
        
        printf "."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    print_error "$service_name não ficou disponível após $((max_attempts * 2)) segundos"
    return 1
}

# Function to check if PostgreSQL is running
check_postgres() {
    if pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Function to start PostgreSQL
start_postgres() {
    print_step "Verificando PostgreSQL..."
    
    if check_postgres; then
        print_info "PostgreSQL já está rodando"
        return 0
    fi
    
    print_info "Iniciando PostgreSQL..."
    
    # Try different ways to start PostgreSQL based on installation
    if command -v brew &> /dev/null && brew services list | grep postgresql | grep started > /dev/null; then
        print_info "PostgreSQL já iniciado via Homebrew"
    elif command -v brew &> /dev/null; then
        print_info "Iniciando PostgreSQL via Homebrew..."
        brew services start postgresql@14 || brew services start postgresql || true
    elif command -v pg_ctl &> /dev/null; then
        print_info "Iniciando PostgreSQL via pg_ctl..."
        pg_ctl -D /usr/local/var/postgres start || true
    elif command -v systemctl &> /dev/null; then
        print_info "Iniciando PostgreSQL via systemctl..."
        sudo systemctl start postgresql || true
    else
        print_warning "Não foi possível detectar como iniciar PostgreSQL"
        print_info "Por favor, inicie PostgreSQL manualmente"
    fi
    
    # Wait for PostgreSQL to be ready
    local attempt=1
    while [ $attempt -le 15 ]; do
        if check_postgres; then
            print_step "PostgreSQL está rodando!"
            return 0
        fi
        print_info "Aguardando PostgreSQL... (tentativa $attempt/15)"
        sleep 2
        attempt=$((attempt + 1))
    done
    
    print_error "PostgreSQL não iniciou corretamente"
    return 1
}

# Function to setup backend
setup_backend() {
    print_step "Configurando Backend..."
    
    cd "$BACKEND_DIR"
    
    # Check if virtual environment exists
    if [ ! -d "venv" ]; then
        print_info "Criando ambiente virtual Python..."
        python3 -m venv venv
    fi
    
    # Activate virtual environment
    source venv/bin/activate
    
    # Install dependencies
    print_info "Instalando dependências Python..."
    pip install -q --upgrade pip
    pip install -q -r requirements.txt
    
    print_step "Backend configurado!"
}

# Function to start backend
start_backend() {
    print_step "Iniciando Backend..."
    
    # Kill any existing backend processes
    kill_port 8000
    
    cd "$BACKEND_DIR"
    source venv/bin/activate
    
    print_info "Iniciando servidor FastAPI na porta 8000..."
    nohup python main_postgres.py > "$LOG_FILE.backend" 2>&1 &
    BACKEND_PID=$!
    
    # Wait for backend to be ready
    if wait_for_service "http://localhost:8000/health" "Backend"; then
        print_step "Backend iniciado com sucesso! (PID: $BACKEND_PID)"
        echo $BACKEND_PID > "$PROJECT_DIR/.backend.pid"
        return 0
    else
        print_error "Backend falhou ao iniciar"
        return 1
    fi
}

# Function to setup frontend
setup_frontend() {
    print_step "Configurando Frontend..."
    
    cd "$FRONTEND_DIR"
    
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        print_info "Instalando dependências Node.js..."
        npm install
    else
        print_info "Dependências do frontend já instaladas"
    fi
    
    print_step "Frontend configurado!"
}

# Function to start frontend
start_frontend() {
    print_step "Iniciando Frontend..."
    
    # Kill any existing frontend processes
    kill_port 5173
    
    cd "$FRONTEND_DIR"
    
    print_info "Iniciando servidor Vite na porta 5173..."
    nohup npm run dev > "$LOG_FILE.frontend" 2>&1 &
    FRONTEND_PID=$!
    
    # Wait for frontend to be ready
    if wait_for_service "http://localhost:5173" "Frontend"; then
        print_step "Frontend iniciado com sucesso! (PID: $FRONTEND_PID)"
        echo $FRONTEND_PID > "$PROJECT_DIR/.frontend.pid"
        return 0
    else
        print_error "Frontend falhou ao iniciar"
        return 1
    fi
}

# Function to show final status
show_status() {
    print_header "STATUS FINAL"
    
    echo -e "${GREEN}🎉 PORTFÓLIO DE INVESTIMENTOS INICIADO COM SUCESSO!${NC}\n"
    
    echo -e "${CYAN}📊 Serviços Disponíveis:${NC}"
    echo -e "  ${GREEN}•${NC} Frontend:  ${YELLOW}http://localhost:5173${NC}"
    echo -e "  ${GREEN}•${NC} Backend:   ${YELLOW}http://localhost:8000${NC}"
    echo -e "  ${GREEN}•${NC} API Docs:  ${YELLOW}http://localhost:8000/docs${NC}"
    echo -e "  ${GREEN}•${NC} Database:  ${YELLOW}PostgreSQL localhost:5432${NC}"
    
    echo -e "\n${CYAN}📝 Logs:${NC}"
    echo -e "  ${GREEN}•${NC} Backend:   ${YELLOW}$LOG_FILE.backend${NC}"
    echo -e "  ${GREEN}•${NC} Frontend:  ${YELLOW}$LOG_FILE.frontend${NC}"
    
    echo -e "\n${CYAN}🛑 Para Parar:${NC}"
    echo -e "  ${GREEN}•${NC} Execute: ${YELLOW}./stop.sh${NC}"
    echo -e "  ${GREEN}•${NC} Ou: ${YELLOW}pkill -f 'python main_postgres.py' && pkill -f 'npm run dev'${NC}"
    
    echo -e "\n${PURPLE}============================================${NC}"
    echo -e "${GREEN}✨ Acesse: http://localhost:5173${NC}"
    echo -e "${PURPLE}============================================${NC}\n"
}

# Main execution
main() {
    print_header "INICIANDO PORTFÓLIO DE INVESTIMENTOS"
    
    # Clear previous logs
    > "$LOG_FILE"
    > "$LOG_FILE.backend" 2>/dev/null || true
    > "$LOG_FILE.frontend" 2>/dev/null || true
    
    print_info "Iniciando em: $PROJECT_DIR"
    print_info "Logs em: $LOG_FILE"
    
    # Step 1: Start PostgreSQL
    if ! start_postgres; then
        print_error "Falha ao iniciar PostgreSQL"
        exit 1
    fi
    
    # Step 2: Setup and start backend
    if ! setup_backend; then
        print_error "Falha ao configurar backend"
        exit 1
    fi
    
    if ! start_backend; then
        print_error "Falha ao iniciar backend"
        exit 1
    fi
    
    # Step 3: Setup and start frontend
    if ! setup_frontend; then
        print_error "Falha ao configurar frontend"
        exit 1
    fi
    
    if ! start_frontend; then
        print_error "Falha ao iniciar frontend"
        exit 1
    fi
    
    # Step 4: Show final status
    show_status
    
    # Keep script running to show real-time logs
    print_info "Pressione Ctrl+C para ver logs em tempo real ou ./stop.sh para parar tudo"
    print_info "Monitore os logs em tempo real com: tail -f $LOG_FILE.backend $LOG_FILE.frontend"
}

# Handle interruption
trap 'echo -e "\n${YELLOW}Script interrompido. Para parar os serviços, execute: ./stop.sh${NC}"; exit 0' INT

# Run main function
main "$@"
