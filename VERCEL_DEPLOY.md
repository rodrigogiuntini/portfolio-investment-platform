# 🌐 Deploy no Vercel - Guia Passo a Passo

## 🚀 **VERCEL SETUP - FRONTEND**

### **1️⃣ ACESSAR VERCEL**
1. Vá para: https://vercel.com
2. Clique em **"Start Deploying"** ou **"Login"**
3. **Continue with GitHub** (mesmo GitHub do Render)
4. Autorize o Vercel a acessar seus repositórios

---

### **2️⃣ IMPORTAR PROJETO**
1. No dashboard, clique em **"New Project"**
2. Na seção **"Import Git Repository"**
3. Procure por: `rodrigogiuntini/portfolio-investment-platform`
4. Clique em **"Import"**

---

### **3️⃣ CONFIGURAR PROJETO**

#### **🔧 Configure Project:**
- **Project Name**: `portfolio-investment-platform` (ou deixe automático)
- **Framework Preset**: **Vite** ⚠️ IMPORTANTE!
- **Root Directory**: `frontend` ⚠️ IMPORTANTE!

#### **📦 Build and Output Settings:**
- **Build Command**: `npm run build` (automático)
- **Output Directory**: `dist` (automático)
- **Install Command**: `npm install` (automático)

---

### **4️⃣ VARIÁVEIS DE AMBIENTE**

Clique em **"Environment Variables"** e adicione:

```env
VITE_API_URL
https://portfolio-backend-pp3l.onrender.com

VITE_APP_NAME
Portfolio Investment Platform
```

**⚠️ IMPORTANTE:** Use exatamente estes nomes (VITE_API_URL)

---

### **5️⃣ DEPLOY**
1. Clique em **"Deploy"**
2. Aguarde o build (2-3 minutos)
3. Sua URL será algo como: `https://portfolio-investment-platform-xyz.vercel.app`

---

## 🎯 **CONFIGURAÇÕES DETALHADAS**

### **Framework Detection:**
- ✅ Vercel deve detectar **Vite** automaticamente
- ✅ Se não detectar, selecione **Vite** manualmente

### **Root Directory:**
- ✅ **OBRIGATÓRIO**: `frontend`
- ❌ **NÃO deixe vazio** (senão tentará buildar da raiz)

### **Build Settings:**
```bash
Build Command: npm run build
Output Directory: dist
Install Command: npm install
Development Command: npm run dev
```

---

## 🔧 **TROUBLESHOOTING**

### **Build Failed - "No package.json"**
```
Solução: Verificar se Root Directory = "frontend"
```

### **Build Failed - "Vite not found"**
```
Solução: Verificar se Framework Preset = "Vite"
```

### **Build Success mas página branca**
```
Solução: Verificar variáveis de ambiente VITE_*
```

### **API não conecta**
```
Solução: Aguardar Render ficar "Live"
Verificar VITE_API_URL
```

---

## 🌟 **APÓS O DEPLOY**

### **✅ Testar Frontend:**
1. Acesse sua URL do Vercel
2. Deve carregar a página de login
3. Design deve estar perfeito

### **⚠️ API ainda não funciona:**
- Normal! Render ainda está buildando
- Quando Render ficar "Live", tudo conectará

### **🔄 Auto-Deploy:**
- ✅ Habilitado automaticamente
- 🔄 Todo push no GitHub = novo deploy

---

## 📊 **MONITORAMENTO**

### **Vercel Dashboard:**
- 📈 **Analytics** (visitantes, performance)
- 📋 **Deployments** (histórico)
- 🔧 **Settings** (domínio, variáveis)

### **URLs Importantes:**
- 🌐 **Produção**: `https://seu-app.vercel.app`
- 📚 **Preview**: Para cada branch
- 🔧 **Dashboard**: `https://vercel.com/dashboard`

---

## 🎉 **RESULTADO FINAL**

Após completar:
- ✅ **Frontend**: Vercel (React + Vite)
- ✅ **Backend**: Render (FastAPI + Python)
- ✅ **Database**: Supabase (PostgreSQL)
- ✅ **Deploy automático** em ambos

---

**🚀 Pronto para começar? Acesse https://vercel.com!**
