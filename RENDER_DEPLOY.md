# 🚀 Deploy no Render.com - Guia Completo

## ✅ **VANTAGENS DO RENDER**
- 🆓 **750 horas grátis** por mês (suficiente para 24/7)
- 🔄 **Deploy automático** do GitHub
- 🐍 **Suporte nativo** ao Python/FastAPI
- 🌐 **SSL automático** incluído
- 📊 **Logs em tempo real**

---

## 🎯 **PASSO A PASSO**

### **1️⃣ CRIAR CONTA NO RENDER**
1. Acesse: https://render.com
2. Clique em **"Get Started for Free"**
3. **Login com GitHub** (recomendado)
4. Autorize o Render a acessar seus repositórios

### **2️⃣ CRIAR WEB SERVICE**
1. No dashboard, clique em **"New +"**
2. Selecione **"Web Service"**
3. Conecte seu repositório: `rodrigogiuntini/portfolio-investment-platform`
4. Clique em **"Connect"**

### **3️⃣ CONFIGURAR O SERVIÇO**

#### **Configurações Básicas:**
- **Name**: `portfolio-backend`
- **Region**: `Oregon (US West)` (mais próximo)
- **Branch**: `master`
- **Root Directory**: deixe vazio
- **Runtime**: `Python 3`

#### **Build & Deploy:**
- **Build Command**: 
  ```bash
  cd backend && pip install -r requirements.txt
  ```
- **Start Command**: 
  ```bash
  cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT
  ```

#### **Plano:**
- **Instance Type**: `Free` (750 horas/mês)

### **4️⃣ VARIÁVEIS DE AMBIENTE**

Na seção **Environment**, adicione:

```env
DATABASE_URL=postgresql://postgres:JKoWQ4yBvmJQNSgB@db.thouisvndbnoobtxvzmb.supabase.co:5432/postgres
SECRET_KEY=seu-secret-key-super-seguro-aqui
ENVIRONMENT=production
BACKEND_CORS_ORIGINS=["https://portfolio-investment-platform.vercel.app"]
PYTHON_VERSION=3.11
```

### **5️⃣ DEPLOY**
1. Clique em **"Create Web Service"**
2. Aguarde o build (3-5 minutos)
3. Sua URL será: `https://portfolio-backend.onrender.com`

---

## 🔧 **CONFIGURAÇÕES AVANÇADAS**

### **Health Check**
- **Health Check Path**: `/api/health`
- **Health Check Grace Period**: `60` segundos

### **Auto-Deploy**
- ✅ **Habilitado** por padrão
- 🔄 Deploy automático a cada push no GitHub

---

## 🌐 **APÓS O DEPLOY**

### **Testar Backend**
```bash
curl https://portfolio-backend.onrender.com/api/health
```

### **Testar API Docs**
Acesse: https://portfolio-backend.onrender.com/docs

### **Logs em Tempo Real**
No dashboard do Render → **Logs**

---

## 🚀 **PRÓXIMO PASSO: VERCEL**

Após o backend estar funcionando:

1. **Deploy frontend** no Vercel
2. **Configurar CORS** com URL do Vercel
3. **Conectar ao Supabase** quando DNS resolver
4. **Testar aplicação** completa

---

## 🆘 **TROUBLESHOOTING**

### **Build Failed**
```
Solução: Verificar se requirements.txt está correto
Verificar Python version compatibility
```

### **Start Failed**
```
Solução: Verificar se PORT está sendo usado corretamente
Verificar se uvicorn está instalado
```

### **Database Connection**
```
Solução: Aguardar Supabase DNS resolver
Verificar DATABASE_URL nas variáveis de ambiente
```

---

## 📊 **MONITORAMENTO**

### **Métricas Disponíveis**
- 🔄 **Deploy status**
- 📈 **CPU/Memory usage**
- 🌐 **Request logs**
- ⏱️ **Response times**

### **Limites Free Tier**
- ⏱️ **750 horas/mês** (suficiente para 24/7)
- 💾 **512MB RAM**
- 🔄 **Sleep após 15min inatividade**

---

## 🎉 **VANTAGENS DO RENDER**

✅ **Mais fácil** que Railway  
✅ **Free tier generoso**  
✅ **Deploy automático**  
✅ **SSL incluído**  
✅ **Logs detalhados**  
✅ **Suporte Python nativo**  

---

**🚀 Pronto para começar? Siga os passos acima!**
