#!/bin/bash

# =============================================================================
# 🚀 SCRIPT SIMPLES DE INICIALIZAÇÃO - PORTFÓLIO DE INVESTIMENTOS
# =============================================================================
# Baseado no start_postgres.sh que já funcionava
# =============================================================================

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

print_header() {
    echo -e "\n${PURPLE}============================================${NC}"
    echo -e "${PURPLE}🚀 $1${NC}"
    echo -e "${PURPLE}============================================${NC}\n"
}

print_step() {
    echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} ${GREEN}✓${NC} $1"
}

print_info() {
    echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} ${YELLOW}ℹ${NC} $1"
}

# Project directory
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

main() {
    print_header "INICIANDO PORTFÓLIO DE INVESTIMENTOS"
    
    print_step "Parando processos existentes..."
    pkill -f "python main_postgres.py" 2>/dev/null || true
    pkill -f "npm run dev" 2>/dev/null || true
    sleep 2
    
    print_step "Verificando PostgreSQL..."
    if ! pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
        print_info "Iniciando PostgreSQL via Homebrew..."
        brew services start postgresql@14 || brew services start postgresql || true
        sleep 3
    else
        print_step "PostgreSQL já está rodando"
    fi
    
    print_step "Iniciando Backend..."
    cd "$PROJECT_DIR/backend"
    source venv/bin/activate
    nohup python main_postgres.py > ../backend.log 2>&1 &
    BACKEND_PID=$!
    echo $BACKEND_PID > ../backend.pid
    print_info "Backend iniciado (PID: $BACKEND_PID)"
    
    print_step "Aguardando backend ficar pronto..."
    sleep 8
    
    print_step "Iniciando Frontend..."
    cd "$PROJECT_DIR/frontend"
    nohup npm run dev > ../frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > ../frontend.pid
    print_info "Frontend iniciado (PID: $FRONTEND_PID)"
    
    print_step "Aguardando frontend ficar pronto..."
    sleep 8
    
    print_header "🎉 APLICAÇÃO INICIADA COM SUCESSO!"
    
    echo -e "${GREEN}📊 Serviços Disponíveis:${NC}"
    echo -e "  ${GREEN}•${NC} Frontend:  ${YELLOW}http://localhost:5173${NC}"
    echo -e "  ${GREEN}•${NC} Backend:   ${YELLOW}http://localhost:8000${NC}"
    echo -e "  ${GREEN}•${NC} API Docs:  ${YELLOW}http://localhost:8000/docs${NC}"
    
    echo -e "\n${GREEN}📝 Logs:${NC}"
    echo -e "  ${GREEN}•${NC} Backend:   ${YELLOW}tail -f backend.log${NC}"
    echo -e "  ${GREEN}•${NC} Frontend:  ${YELLOW}tail -f frontend.log${NC}"
    
    echo -e "\n${GREEN}🛑 Para Parar:${NC}"
    echo -e "  ${GREEN}•${NC} Execute: ${YELLOW}./stop.sh${NC}"
    
    echo -e "\n${PURPLE}============================================${NC}"
    echo -e "${GREEN}✨ Acesse: http://localhost:5173${NC}"
    echo -e "${PURPLE}============================================${NC}\n"
    
    print_info "Testando conectividade..."
    sleep 3
    
    # Test backend
    if curl -s http://localhost:8000/health > /dev/null 2>&1; then
        print_step "Backend: ✅ OK"
    else
        echo -e "${YELLOW}⚠${NC} Backend ainda carregando..."
    fi
    
    # Test frontend
    if curl -s http://localhost:5173 > /dev/null 2>&1; then
        print_step "Frontend: ✅ OK"
    else
        echo -e "${YELLOW}⚠${NC} Frontend ainda carregando..."
    fi
    
    echo -e "\n${GREEN}🚀 Tudo pronto! Você pode fechar este terminal.${NC}"
}

# Run main function
main "$@"
