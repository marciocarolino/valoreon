# Valoreon - Project Context (PRO COMPLETE)

---

## 🎯 VISÃO GERAL

Valoreon é um SaaS voltado para gestão financeira e valuation de pequenos negócios, com foco inicial no nicho de impressão 3D.

O sistema permite:

- Gerenciar impressoras
- Controlar manutenções
- Registrar produções
- Calcular custos operacionais
- Visualizar métricas financeiras
- Simular lucro real considerando marketplace e frete
- Comparar canais de venda
- Gerar insights acionáveis
- Coletar feedback dos usuários
- Evoluir para valuation automatizado

---

## 🧠 POSICIONAMENTO DO PRODUTO

Valoreon não é apenas um sistema de registro.

Ele atua como:

- Sistema de decisão financeira
- Assistente de lucratividade
- Plataforma de crescimento
- Simulador de lucro real
- Comparador de canais de venda

---

## 📌 STACK TECNOLÓGICO

### Frontend
- Angular (Standalone Components)
- Signals (estado reativo)
- HTTP Interceptor
- Chart.js

### Backend
- Spring Boot (Java)
- Spring Security
- JPA / Hibernate

### Banco de Dados
- PostgreSQL

### Segurança
- JWT (Access Token)
- Refresh Token com rotação
- httpOnly cookies

---

## 🧱 ARQUITETURA

### Princípios

- Backend é a fonte da verdade
- Frontend consome DTOs
- Comunicação via REST API
- Backend realiza cálculos críticos
- Frontend apenas apresenta e interpreta

---

## 🔄 FLUXO DE DADOS

Frontend → Backend → Banco  
Backend → DTOs agregados → Frontend  
Frontend → UI + Insights

---

## 🔐 AUTENTICAÇÃO E SEGURANÇA

### 🔑 Access Token

- JWT
- Expiração curta (~15 minutos)
- Enviado via header Authorization
- Não contém dados sensíveis

---

### 🔁 Refresh Token

- Persistido no banco
- Enviado via cookie httpOnly
- Expiração ~7 dias
- Rotação ativa (anti replay attack)

---

### 🍪 Cookie

- HttpOnly: true
- Secure: true (produção)
- SameSite: Lax ou Strict

---

## 🔄 FLUXO DE AUTENTICAÇÃO

### Login

POST /auth/login

Retorna:
- accessToken
- cookie com refreshToken

---

### Refresh

POST /auth/refresh

- Rotaciona refresh token
- Retorna novo accessToken

---

### Logout

POST /auth/logout

- Invalida refresh token

---

## ⚠️ REGRAS DE SEGURANÇA

- Backend nunca confia no frontend
- Nenhum endpoint aceita userId do cliente
- Refresh token nunca exposto
- Validação de ownership obrigatória

---

## 👤 IDENTIDADE DO USUÁRIO

GET /users/me

Retorna:

- id
- name
- email

---

## 🌐 FRONTEND AUTH

### AuthService

- armazena accessToken (signal)
- armazena currentUser (signal)
- gerencia sessão

---

### Interceptor

- adiciona Authorization
- trata 401
- executa refresh
- repete request automaticamente

---

## 📦 DOMÍNIO

### Printers

- name
- brand
- powerConsumptionWatts
- energyCostPerKwh
- costPerHour
- status

---

### Maintenances

- open / history
- impacta custo

---

### Productions

- quantity
- tempo
- custo
- receita

---

### 🔥 REGRA CRÍTICA

Produção = SUM(quantity  
Nunca usar COUNT

---

## 💰 MODELO FINANCEIRO

### Base

- Receita = soma vendas
- Custo = material + energia + manutenção
- Lucro = receita - custo

---

### Marketplace (novo)

Taxas são aplicadas sobre o valor da venda:

Taxa = venda * (% / 100)

Lucro = venda - custo - taxa

---

### Frete (novo)

Frete impacta diretamente o lucro:

Lucro real = venda - custo - taxa - frete

---

### ⚠️ REGRA IMPORTANTE

Taxas NÃO são calculadas sobre o lucro.

---

## 🧾 FORMULÁRIO DE PRODUÇÃO (NOVO)

### Objetivo

Permitir simulação real de lucro no momento do registro.

---

### Campos adicionados

- Canal de venda (dropdown)
- Taxa (%) (auto preenchida e editável)
- Incluir frete (checkbox)
- Valor do frete (condicional)

---

### Ordem lógica dos campos

1. Canal de venda
2. Taxa (%)
3. Incluir frete
4. Valor do frete
5. Preço de venda

---

### Regras

- Seleção de canal preenche taxa automaticamente
- Usuário pode editar taxa manualmente
- Frete só aparece se ativado
- Frete é resetado ao desativar

---

### Cálculo aplicado

lucro = venda - custo - taxa - frete

---

### Resultado exibido

- custo por peça
- lucro por peça
- lucro total
- margem

---

## 📊 DASHBOARD

### KPIs

- Receita
- Custo
- Lucro
- Produção (SUM quantity)

---

### Período

- 7 / 15 / 30 dias

---

### Gráficos

- Receita: linha
- Produção: barra

---

### Impressoras

- melhor
- pior

---

### Regras de gráfico

- <2 → não mostrar
- ≤10 → todas
- >10 → top5 + worst5

---

## 🌐 LANDING PAGE

### Objetivo

Converter visitantes em usuários através de:

- clareza financeira
- impacto visual
- comparação de lucro

---

### Elementos

- Hero com proposta clara
- Dashboard preview
- Cards com:
  - custo
  - venda
  - lucro bruto
  - lucro por canal
  - lucro real (taxas + frete)

---

### Neuro UX

- comparação direta
- loss aversion
- microcopy educativo
- foco em decisão

---

## 💬 SISTEMA DE FEEDBACK

### Objetivo

Criar loop de melhoria contínua

---

### Backend

POST /feedback

- público (sem login)
- userId opcional
- email opcional

---

### Estrutura

- type (BUG | SUGGESTION | FEEDBACK)
- message
- email
- userId

---

### Frontend

- modal de feedback
- campo de tipo
- mensagem
- email opcional
- envio sem fricção

---

## ⚙️ REGRAS DE NEGÓCIO

- 1 manutenção ativa
- nome único por usuário
- manutenção bloqueia uso
- backend valida tudo

---

## 🔌 API

### Auth
- POST /auth/login
- POST /auth/refresh
- POST /auth/logout

### User
- GET /users/me

### Dashboard
- GET /dashboard/summary
- GET /dashboard/week
- GET /dashboard/chart
- GET /dashboard/printers-profit

### Feedback
- POST /feedback

---

## 🎨 UX

- destacar lucro/prejuízo
- evitar ambiguidade
- guiar decisão
- reduzir fricção
- feedback rápido

---

## 🧠 NEURO UX

- loss aversion
- comparação
- clareza cognitiva
- tomada de decisão rápida
- feedback loop

---

## ⚠️ PROBLEMAS CONHECIDOS

- Chart.js precisa de setTimeout

---

## 🔐 HARDENING

- rate limit (login)
- headers de segurança
- controle de CORS

---

## 📎 PADRÕES

### Backend
- validar sempre
- nunca confiar no frontend

### Frontend
- não recalcular dados críticos
- usar signals
- manter simplicidade

---

## 🚀 ESTADO ATUAL

- auth segura implementada
- dashboard consistente
- landing otimizada (nível SaaS)
- cálculo de lucro real implementado
- formulário de produção avançado
- sistema de feedback implementado
- pronto para deploy (com ajustes de env)

---

## 🎯 ROADMAP

1. Deploy (Railway)
2. Primeiros usuários
3. Ajustes via feedback
4. Insights inteligentes
5. Valuation automatizado

---

## 🧠 REGRA FINAL

Dados → Métrica → Visualização → Insight → Ação → Valor