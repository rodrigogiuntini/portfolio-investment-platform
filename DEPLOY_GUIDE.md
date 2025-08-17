# 🚀 Guia Completo de Deploy - Portfolio Investment Platform

## ✅ **STATUS: CÓDIGO NO GITHUB** 

**Repositório:** https://github.com/rodrigogiuntini/portfolio-investment-platform

---

## 🎯 **PRÓXIMOS PASSOS PARA DEPLOY COMPLETO**

### 1️⃣ **SUPABASE (Database) - PRIMEIRO PASSO**

#### **Criar Projeto**
1. Acesse: https://supabase.com
2. Clique em "New Project"
3. Escolha organização
4. Nome: `portfolio-investment-platform`
5. Região: `South America (São Paulo)` 
6. Defina senha forte para o banco
7. Aguarde criação (2-3 minutos)

#### **Obter Credenciais**
1. Vá em **Settings > Database**
2. Copie a **Connection string** (URI format):
   ```
   postgresql://postgres:[SUA_SENHA]@db.[SEU_PROJETO].supabase.co:5432/postgres
   ```
3. Vá em **Settings > API**
4. Copie **Project URL** e **anon public key**

#### **Executar Migrações**
```bash
# No seu terminal local
export DATABASE_URL="postgresql://postgres:[SUA_SENHA]@db.[SEU_PROJETO].supabase.co:5432/postgres"
cd backend
alembic upgrade head
```

---

### 2️⃣ **RAILWAY (Backend) - SEGUNDO PASSO**

#### **Criar Projeto**
1. Acesse: https://railway.app
2. Login com GitHub
3. Clique em "New Project"
4. Selecione "Deploy from GitHub repo"
5. Escolha: `rodrigogiuntini/portfolio-investment-platform`
6. Railway detectará Python automaticamente

#### **Configurar Variáveis de Ambiente**
No Railway, vá em **Variables** e adicione:

```env
DATABASE_URL=postgresql://postgres:[SENHA_SUPABASE]@db.[PROJETO_SUPABASE].supabase.co:5432/postgres
SECRET_KEY=seu-secret-key-super-seguro-aqui-mude-isso
ENVIRONMENT=production
BACKEND_CORS_ORIGINS=["https://portfolio-investment-platform.vercel.app"]
```

#### **Configurar Deploy**
1. **Root Directory**: deixe vazio (raiz do projeto)
2. **Build Command**: `cd backend && pip install -r requirements.txt`
3. **Start Command**: `cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT`

---

### 3️⃣ **VERCEL (Frontend) - TERCEIRO PASSO**

#### **Importar Projeto**
1. Acesse: https://vercel.com
2. Login com GitHub
3. Clique em "New Project"
4. Importe: `rodrigogiuntini/portfolio-investment-platform`

#### **Configurar Build**
- **Framework Preset**: `Vite`
- **Root Directory**: `frontend`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

#### **Variáveis de Ambiente**
No Vercel, vá em **Settings > Environment Variables**:

```env
VITE_API_URL=https://seu-projeto.railway.app
VITE_APP_NAME=Portfolio Investment Platform
```

---

## 🔧 **CONFIGURAÇÃO FINAL**

### **Atualizar CORS no Backend**
Após deploy do Vercel, atualize no Railway:
```env
BACKEND_CORS_ORIGINS=["https://portfolio-investment-platform-[SEU_HASH].vercel.app"]
```

### **Testar Aplicação**
1. Acesse sua URL do Vercel
2. Teste login/registro
3. Verifique se API está respondendo
4. Teste criação de portfólio

---

## 🎉 **RESULTADO FINAL**

Após completar todos os passos:

- 🌐 **Frontend**: `https://portfolio-investment-platform-[hash].vercel.app`
- 🔧 **Backend**: `https://seu-projeto.railway.app`
- 🗄️ **Database**: Supabase PostgreSQL
- 📚 **API Docs**: `https://seu-projeto.railway.app/docs`

---

## 🆘 **TROUBLESHOOTING**

### **Problema: CORS Error**
```
Solução: Verificar BACKEND_CORS_ORIGINS no Railway
Deve incluir exatamente a URL do Vercel (com https://)
```

### **Problema: Database Connection**
```
Solução: Verificar DATABASE_URL no Railway
Testar conexão local primeiro
Verificar senha do Supabase
```

### **Problema: Build Error no Vercel**
```
Solução: Verificar se Root Directory = "frontend"
Limpar cache no Vercel
Verificar se npm run build funciona localmente
```

---

## 📋 **CHECKLIST DE DEPLOY**

### ✅ **Concluído**
- [x] Código no GitHub
- [x] Build do frontend funcionando
- [x] Configurações de produção prontas

### 🔄 **Próximos Passos**
- [ ] Criar projeto no Supabase
- [ ] Executar migrações no banco
- [ ] Deploy backend no Railway
- [ ] Deploy frontend no Vercel
- [ ] Configurar variáveis de ambiente
- [ ] Testar aplicação completa

---

## 🚀 **COMANDOS ÚTEIS**

```bash
# Testar build local
cd frontend && npm run build

# Testar backend local
cd backend && uvicorn app.main:app --reload

# Executar migrações
cd backend && alembic upgrade head

# Ver logs do Railway
railway logs --tail
```

---

**🎯 O projeto está 100% pronto para deploy!**

**Repositório:** https://github.com/rodrigogiuntini/portfolio-investment-platform

Siga os passos acima na ordem e em poucos minutos terá sua aplicação rodando em produção! 🚀