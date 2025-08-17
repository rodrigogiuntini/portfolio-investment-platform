#!/bin/bash

# =============================================================================
# 🛑 SCRIPT DE PARADA - PORTFÓLIO DE INVESTIMENTOS
# =============================================================================
# Este script para todos os serviços do projeto de forma segura
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Project directory
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Function to print colored output
print_step() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} ${GREEN}✓${NC} $1"
}

print_info() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} ${YELLOW}ℹ${NC} $1"
}

print_header() {
    echo -e "\n${PURPLE}============================================${NC}"
    echo -e "${PURPLE}🛑 $1${NC}"
    echo -e "${PURPLE}============================================${NC}\n"
}

# Function to kill processes on specific ports
kill_port() {
    local port=$1
    local service_name=$2
    local pids=$(lsof -ti:$port 2>/dev/null || true)
    
    if [ ! -z "$pids" ]; then
        print_info "Parando $service_name (porta $port)..."
        echo "$pids" | xargs kill -15 2>/dev/null || true  # Graceful shutdown
        sleep 3
        
        # Check if still running, force kill if needed
        pids=$(lsof -ti:$port 2>/dev/null || true)
        if [ ! -z "$pids" ]; then
            print_info "Forçando parada de $service_name..."
            echo "$pids" | xargs kill -9 2>/dev/null || true
            sleep 1
        fi
        
        print_step "$service_name parado"
    else
        print_info "$service_name não estava rodando"
    fi
}

# Function to kill by PID file
kill_by_pidfile() {
    local pidfile=$1
    local service_name=$2
    
    if [ -f "$pidfile" ]; then
        local pid=$(cat "$pidfile")
        if ps -p $pid > /dev/null 2>&1; then
            print_info "Parando $service_name (PID: $pid)..."
            kill -15 $pid 2>/dev/null || true
            sleep 3
            
            # Check if still running, force kill if needed
            if ps -p $pid > /dev/null 2>&1; then
                print_info "Forçando parada de $service_name..."
                kill -9 $pid 2>/dev/null || true
            fi
            print_step "$service_name parado"
        else
            print_info "$service_name não estava rodando (PID $pid não encontrado)"
        fi
        rm -f "$pidfile"
    fi
}

# Function to stop all services
stop_services() {
    print_header "PARANDO TODOS OS SERVIÇOS"
    
    # Stop frontend
    print_info "Parando Frontend..."
    kill_port 5173 "Frontend (Vite)"
    kill_by_pidfile "$PROJECT_DIR/.frontend.pid" "Frontend"
    
    # Stop backend
    print_info "Parando Backend..."
    kill_port 8000 "Backend (FastAPI)"
    kill_by_pidfile "$PROJECT_DIR/.backend.pid" "Backend"
    
    # Kill any remaining processes by name
    print_info "Verificando processos restantes..."
    pkill -f "python main_postgres.py" 2>/dev/null || true
    pkill -f "npm run dev" 2>/dev/null || true
    pkill -f "vite" 2>/dev/null || true
    
    # Clean up PID files
    rm -f "$PROJECT_DIR/.frontend.pid" "$PROJECT_DIR/.backend.pid" 2>/dev/null || true
    
    print_step "Todos os serviços foram parados!"
}

# Function to show final status
show_final_status() {
    print_header "STATUS FINAL"
    
    echo -e "${GREEN}🛑 TODOS OS SERVIÇOS FORAM PARADOS${NC}\n"
    
    echo -e "${YELLOW}📊 Verificação de Portas:${NC}"
    
    # Check port 5173 (Frontend)
    if lsof -ti:5173 > /dev/null 2>&1; then
        echo -e "  ${RED}•${NC} Porta 5173 (Frontend): ${RED}AINDA EM USO${NC}"
    else
        echo -e "  ${GREEN}•${NC} Porta 5173 (Frontend): ${GREEN}LIVRE${NC}"
    fi
    
    # Check port 8000 (Backend)
    if lsof -ti:8000 > /dev/null 2>&1; then
        echo -e "  ${RED}•${NC} Porta 8000 (Backend): ${RED}AINDA EM USO${NC}"
    else
        echo -e "  ${GREEN}•${NC} Porta 8000 (Backend): ${GREEN}LIVRE${NC}"
    fi
    
    # Check PostgreSQL (port 5432)
    if lsof -ti:5432 > /dev/null 2>&1; then
        echo -e "  ${YELLOW}•${NC} Porta 5432 (PostgreSQL): ${YELLOW}RODANDO${NC} (mantido ativo)"
    else
        echo -e "  ${YELLOW}•${NC} Porta 5432 (PostgreSQL): ${YELLOW}NÃO DETECTADO${NC}"
    fi
    
    echo -e "\n${YELLOW}🚀 Para Reiniciar:${NC}"
    echo -e "  ${GREEN}•${NC} Execute: ${YELLOW}./start.sh${NC}"
    
    echo -e "\n${PURPLE}============================================${NC}"
    echo -e "${GREEN}✨ Serviços parados com sucesso!${NC}"
    echo -e "${PURPLE}============================================${NC}\n"
}

# Main execution
main() {
    print_header "PARANDO PORTFÓLIO DE INVESTIMENTOS"
    
    stop_services
    show_final_status
}

# Run main function
main "$@"
