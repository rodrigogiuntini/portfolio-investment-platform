# 📊 Portfolio Investment Platform

Uma plataforma moderna e completa para gestão de investimentos com análises avançadas, otimização de portfólio e interface premium.

![Portfolio Platform](https://img.shields.io/badge/Status-Production%20Ready-green)
![React](https://img.shields.io/badge/React-18.x-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-Latest-green)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)
![Material-UI](https://img.shields.io/badge/Material--UI-5.x-purple)

## 🚀 Funcionalidades

### 💼 Gestão de Portfólio
- ✅ **Múltiplos portfólios** com diferentes estratégias
- ✅ **Cálculos automáticos** de performance e métricas
- ✅ **Alocação de ativos** por categoria
- ✅ **Histórico completo** de transações

### 📈 Análises Avançadas
- ✅ **Otimização de Markowitz** com fronteira eficiente
- ✅ **Simulação Monte Carlo** para projeções
- ✅ **Índices Sharpe e Sortino** para análise de risco
- ✅ **Métricas de performance** em tempo real

### 🎨 Interface Premium
- ✅ **Design moderno** e responsivo
- ✅ **Material-UI** components
- ✅ **Gráficos interativos** com Recharts
- ✅ **Tema escuro/claro** personalizável

### 🔔 Notificações Inteligentes
- ✅ **Análise automática** de performance
- ✅ **Alertas de risco** e oportunidades
- ✅ **Sugestões de rebalanceamento**
- ✅ **Marcos e metas** atingidas

## 🛠️ Tecnologias

### Frontend
- **React 18** + TypeScript
- **Material-UI (MUI)** para componentes
- **TanStack Query** para gerenciamento de estado
- **Recharts** para visualizações
- **Zustand** para estado global
- **React Router** para navegação

### Backend
- **FastAPI** + Python
- **SQLAlchemy** ORM
- **PostgreSQL** database
- **JWT** authentication
- **Alembic** para migrações
- **Pydantic** para validação

### Deploy
- **Vercel** para frontend
- **Supabase** para banco de dados
- **Railway/Render** para backend

## 🚀 Deploy Rápido

### 1. Clone o repositório
```bash
git clone https://github.com/seu-usuario/portfolio-investment-platform.git
cd portfolio-investment-platform
```

### 2. Frontend (Vercel)
```bash
cd frontend
npm install
npm run build
```

### 3. Backend + Database
- Configure Supabase para PostgreSQL
- Deploy backend no Railway/Render
- Configure variáveis de ambiente

## 🔧 Desenvolvimento Local

### Pré-requisitos
- Node.js 18+
- Python 3.9+
- PostgreSQL

### Instalação
```bash
# Clone o projeto
git clone https://github.com/seu-usuario/portfolio-investment-platform.git
cd portfolio-investment-platform

# Backend
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Frontend
cd ../frontend
npm install

# Iniciar serviços
./start.sh
```

### URLs de Desenvolvimento
- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

## 🔑 Credenciais de Teste

### Usuário Principal
- **Email**: `rodrigo.giuntini@gmail.com`
- **Senha**: `123456`

### Usuário de Teste
- **Email**: `test@example.com`
- **Senha**: `testpass123`

## 📁 Estrutura do Projeto

```
portfolio-investment-platform/
├── frontend/                 # React + TypeScript
│   ├── src/
│   │   ├── components/      # Componentes reutilizáveis
│   │   ├── pages/          # Páginas da aplicação
│   │   ├── services/       # API calls
│   │   └── stores/         # Estado global
│   └── package.json
├── backend/                 # FastAPI + Python
│   ├── app/
│   │   ├── routers/        # Endpoints da API
│   │   ├── services/       # Lógica de negócio
│   │   ├── models.py       # Modelos do banco
│   │   └── main.py         # App principal
│   └── requirements.txt
└── README.md
```

## 🎯 Funcionalidades Principais

### Dashboard
- Visão geral dos investimentos
- Gráficos de evolução patrimonial
- Métricas de performance
- Alocação de ativos

### Portfólios
- Criação e gestão de múltiplos portfólios
- Análise de performance individual
- Comparação com benchmarks
- Métricas avançadas (Sharpe, Sortino)

### Transações
- Registro completo de operações
- Suporte a diversos tipos (Compra, Venda, Dividendos)
- Histórico com filtros avançados
- Cálculos automáticos

### Otimização
- Teoria Moderna de Portfólio (Markowitz)
- Fronteira eficiente
- Simulação Monte Carlo
- Análise de risco/retorno

## 🔒 Segurança

- ✅ Autenticação JWT
- ✅ Validação de dados com Pydantic
- ✅ Sanitização de inputs
- ✅ CORS configurado
- ✅ Rate limiting

## 📊 Performance

- ✅ Queries otimizadas (5 queries vs 365+)
- ✅ Lazy loading de componentes
- ✅ Cache inteligente com React Query
- ✅ Bundle otimizado com Vite

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 🆘 Suporte

- 📧 Email: rodrigo.giuntini@gmail.com
- 🐛 Issues: [GitHub Issues](https://github.com/seu-usuario/portfolio-investment-platform/issues)
- 📖 Docs: [API Documentation](http://localhost:8000/docs)

---

**Desenvolvido com ❤️ para gestão inteligente de investimentos**