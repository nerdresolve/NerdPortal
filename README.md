# Portal do TI — NerdResolve

Plataforma institucional do NerdResolve para centralização de comunicação, documentos, sistemas e métricas do setor de Tecnologia da Informação. Classificado como ativo crítico corporativo. Opera sob modelo de **Leitura Pública / Escrita Restrita**: todo o conteúdo é acessível sem autenticação, enquanto operações de criação, edição e exclusão exigem sessão administrativa.

---

## Sumário

1. [Pré-requisitos](#1-pré-requisitos)
2. [Instalação dos Pré-requisitos](#2-instalação-dos-pré-requisitos)
3. [Obtendo o Repositório](#3-obtendo-o-repositório)
4. [Configuração do Ambiente](#4-configuração-do-ambiente)
5. [Execução com Docker (Recomendado)](#5-execução-com-docker-recomendado)
6. [Execução Manual (Sem Docker)](#6-execução-manual-sem-docker)
7. [Migração do Banco de Dados](#7-migração-do-banco-de-dados)
8. [Criação do Usuário Administrador](#8-criação-do-usuário-administrador)
9. [Acessando o Sistema](#9-acessando-o-sistema)
10. [Estrutura do Projeto](#10-estrutura-do-projeto)
11. [Endpoints da API](#11-endpoints-da-api)
12. [Modelo de Acesso e Segurança](#12-modelo-de-acesso-e-segurança)
13. [Resolução de Problemas](#13-resolução-de-problemas)
14. [Configuração para Produção com Domínio Próprio](#14-configuração-para-produção-com-domínio-próprio)

---

## 1. Pré-requisitos

| Software       | Versão Mínima | Finalidade                                        |
|----------------|---------------|---------------------------------------------------|
| Docker         | 24.0+         | Containerização dos serviços                      |
| Docker Compose | 2.20+         | Orquestração dos containers                       |
| Git            | 2.40+         | Controle de versão                                |
| Node.js        | 20.0+         | Runtime (somente para execução manual sem Docker) |
| npm            | 10.0+         | Gerenciador de pacotes (incluso no Node.js)       |

> Para implantação via Docker (recomendada), apenas **Docker**, **Docker Compose** e **Git** são necessários. Node.js é provido pelos containers. O banco de dados é **SQLite** (arquivo embarcado, sem servidor separado) — persistido em um volume Docker.

---

## 2. Instalação dos Pré-requisitos

### 2.1 Git

**Ubuntu/Debian:**
```bash
sudo apt update && sudo apt install git -y
git --version
```

**macOS:**
```bash
brew install git
```

**Windows:**
Baixe o instalador em https://git-scm.com/download/win e siga o assistente. Após a instalação, abra o Git Bash e verifique com `git --version`.

---

### 2.2 Docker e Docker Compose

**Ubuntu/Debian:**
```bash
# Remover versões antigas
sudo apt remove docker docker-engine docker.io containerd runc 2>/dev/null

# Adicionar repositório oficial
sudo apt update && sudo apt install ca-certificates curl gnupg -y
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Instalar Docker Engine + Compose
sudo apt update
sudo apt install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin -y

# Permitir execução sem sudo (requer novo login)
sudo usermod -aG docker $USER && newgrp docker

# Verificar
docker --version && docker compose version
```

**macOS / Windows:**
Instale o Docker Desktop (https://www.docker.com/products/docker-desktop/). O Docker Compose já está incluso. Após a instalação, reinicie o computador e verifique com `docker --version` e `docker compose version`.

---

### 2.3 Node.js 20 (somente para execução manual)

**Ubuntu/Debian:**
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install nodejs -y
node --version && npm --version
```

**macOS:**
```bash
brew install node@20
```

**Windows:**
Baixe o instalador LTS em https://nodejs.org/ (versão 20.x ou superior).

---

## 3. Obtendo o Repositório

```bash
git clone https://github.com/nerdresolve/nerdportal.git
cd nerdportal
```

---

## 4. Configuração do Ambiente

Copie o template de variáveis de ambiente e preencha os valores obrigatórios:

```bash
cp .env.example .env
```

Abra o `.env` em um editor de texto e configure:

```env
# OBRIGATÓRIO — String aleatória de no mínimo 64 caracteres
# Linux/macOS: openssl rand -hex 32
SESSION_SECRET=cole_aqui_a_string_gerada

# OPCIONAL — sobrescreve a senha do admin padrão (admin@example.com)
ADMIN_SEED_PASSWORD=

# OPCIONAL — cria admin@example.com; se vazio, o seed é pulado
ADMIN_SEED_PASSWORD=

# OBRIGATÓRIO PARA RECUPERAÇÃO DE SENHA VIA E-MAIL
SMTP_HOST=smtp.seuprovedor.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_REQUIRE_TLS=true
SMTP_USER=conta@empresa.com.br
SMTP_PASSWORD=senha_da_conta_ou_app_password
SMTP_FROM_EMAIL=conta@empresa.com.br
SMTP_FROM_NAME=Portal do TI
```

**Gerar `SESSION_SECRET` automaticamente:**

```bash
# Linux/macOS
openssl rand -hex 32

# Windows (PowerShell)
-join ((1..64) | ForEach-Object { '{0:x}' -f (Get-Random -Max 16) })
```

### 4.1 Variáveis opcionais para recuperação de senha

| Variável                        | Obrigatória | Descrição                                               |
|---------------------------------|-------------|---------------------------------------------------------|
| `SMTP_HOST`                     | Sim         | Host SMTP do provedor de e-mail                         |
| `SMTP_PORT`                     | Sim         | Porta SMTP (587 para STARTTLS, 465 para SMTPS)          |
| `SMTP_SECURE`                   | Sim         | `true` para TLS implícito na conexão inicial            |
| `SMTP_REQUIRE_TLS`              | Não         | `true` para exigir STARTTLS quando `SMTP_SECURE=false`  |
| `SMTP_USER`                     | Sim         | Login da conta de envio                                 |
| `SMTP_PASSWORD`                 | Sim         | Senha da conta ou app password                          |
| `SMTP_FROM_EMAIL`               | Sim         | Endereço exibido como remetente                         |
| `SMTP_FROM_NAME`                | Não         | Nome do remetente (sugestão: `Portal do TI`)            |
| `PASSWORD_RESET_CODE_TTL_MINUTES` | Não       | Tempo de expiração do código (padrão: 15 min)           |
| `PASSWORD_RESET_TOKEN_TTL_MINUTES` | Não      | Tempo de expiração do token pós-validação (padrão: 15 min) |
| `PASSWORD_RESET_MAX_ATTEMPTS`   | Não         | Tentativas máximas antes de invalidar o código (padrão: 5) |

---

## 5. Execução com Docker (Recomendado)

### 5.1 Construir e iniciar os containers

A partir da raiz do projeto:

```bash
cd docker
docker compose --env-file ../.env up --build
```

Na primeira execução, o Docker irá:
1. Baixar a imagem base (`node:20-alpine`).
2. Construir os containers do backend e frontend.
3. Instalar dependências via `npm ci`.
4. Rodar o container `migrate` (aplica as migrações SQLite e cria o usuário administrador padrão).
5. Iniciar o backend na porta 4000 após a migração concluir com sucesso.
6. Iniciar o frontend na porta 3000 após o backend responder saudável (`/api/v1/health`).

O banco SQLite (`itportal.db`) e a pasta de uploads são persistidos em volumes Docker nomeados (`dbdata`, `uploads`) — os dados sobrevivem a `docker compose down` e a rebuilds das imagens.

Para executar em segundo plano (modo daemon):

```bash
docker compose --env-file ../.env up --build -d
```

### 5.2 Verificar status dos serviços

```bash
docker compose ps
```

Saída esperada:

```
NAME                 STATUS
itportal_backend     Up (healthy)
itportal_frontend    Up
```

> O container `itportal_migrate` aparece como `Exited (0)` — ele roda uma vez (migração + seed) e encerra, isso é esperado.

### 5.3 Acompanhar logs

```bash
# Todos os serviços
docker compose logs -f

# Apenas o backend
docker compose logs -f backend

# Apenas a migração/seed
docker compose logs migrate
```

### 5.4 Parar os serviços

```bash
# Parar sem remover volumes (preserva dados)
docker compose down

# Parar e remover volumes (apaga dados do banco)
docker compose down -v
```

---

## 6. Execução Manual (Sem Docker)

Certifique-se de que Node.js 20+ esteja instalado. O banco de dados é SQLite (arquivo local) — nenhuma instalação de servidor de banco é necessária.

### 6.1 Instalar dependências

```bash
cd apps/backend && npm install && cd ../..
cd apps/frontend && npm install && cd ../..
```

### 6.2 Iniciar o backend

```bash
cd apps/backend
export $(grep -v '^#' ../../.env | xargs)
npm run dev
```

**Windows (PowerShell):**
```powershell
cd apps\backend
Get-Content ..\..\env | ForEach-Object {
  if ($_ -match '^([^#][^=]*)=(.*)$') {
    [Environment]::SetEnvironmentVariable($matches[1], $matches[2])
  }
}
npm run dev
```

O backend estará disponível em `http://localhost:4000`.

### 6.3 Iniciar o frontend

Em outro terminal:

```bash
cd apps/frontend
export $(grep -v '^#' ../../.env | xargs)
npm run dev
```

O frontend estará disponível em `http://localhost:3000`.

---

## 7. Migração do Banco de Dados

As migrações criam todas as tabelas necessárias. Com Docker, o serviço `migrate` já executa isso **automaticamente** a cada `docker compose up` (é idempotente — seguro rodar mais de uma vez). Os comandos abaixo são para reexecutar manualmente ou para o modo sem Docker.

### 7.1 Via Docker

```bash
docker compose exec backend node database/migrate.js
```

### 7.2 Via execução manual

```bash
cd apps/backend
export $(grep -v '^#' ../../.env | xargs)
npm run migrate
```

Saída esperada:

```
[OK]   20260329180000_create_users_table.sql
[OK]   20260329180100_create_sessions_table.sql
[OK]   20260329180200_create_audit_logs_table.sql
[OK]   20260329180300_create_announcements_table.sql
[OK]   20260329180400_create_documents_table.sql
[OK]   20260329180500_create_systems_table.sql
[OK]   20260329180600_create_team_members_table.sql
[OK]   20260329180700_create_metrics_table.sql
[OK]   20260401000000_add_description_to_team_members.sql
[OK]   20260401010000_create_password_reset_requests_table.sql

Migrations complete. Applied: 10, Skipped: 0
```

> As migrações são idempotentes — executar novamente não causa erros; migrações já aplicadas são ignoradas.

---

## 8. Criação de Usuários Administrativos

Com Docker, o serviço `migrate` já cria os usuários administrativos automaticamente a cada `docker compose up` (os seeds detectam se o usuário já existe e pulam ou atualizam a senha, conforme o caso). Os comandos abaixo são para reexecutar manualmente ou para o modo sem Docker.

### 8.1 Administrador padrão

Criado sempre, sem configuração adicional. A senha pode ser customizada via `ADMIN_SEED_PASSWORD` no `.env`; se omitida, usa o valor padrão abaixo.

| Campo | Valor                              |
|-------|-------------------------------------|
| Email | admin@example.com               |
| Senha | `ADMIN_SEED_PASSWORD` ou `Admin@ITPortal2026` (padrão) |
| Papel | admin                                |

> **IMPORTANTE:** Altere a senha padrão imediatamente após o primeiro login.

### 8.2 Usuário adicional (admin@example.com)

Este seed só é executado se a variável `ADMIN_SEED_PASSWORD` estiver definida no `.env` — sem ela, é pulado silenciosamente e nenhuma conta é criada. Não há senha padrão embutida no código.

```env
ADMIN_SEED_PASSWORD=defina_uma_senha_forte_aqui
```

| Campo | Valor                              |
|-------|-------------------------------------|
| Email | admin@example.com       |
| Senha | `ADMIN_SEED_PASSWORD` (obrigatória) |
| Papel | admin                                |

### 8.3 Reexecutar os seeds manualmente

**Via Docker:**
```bash
docker compose run --rm migrate
```

**Via execução manual:**
```bash
cd database/seeds
export $(grep -v '^#' ../../.env | xargs)
node 001_admin_user.js
node 002_admin_user_user.js
```

---

## 9. Acessando o Sistema

### 9.1 Acesso público

1. Acesse `http://localhost:3000`.
2. Todas as páginas (Dashboard, Comunicados, Documentos, Equipe, Sistemas, Chamados) são visíveis sem autenticação.

### 9.2 Acesso administrativo

1. Acesse `http://localhost:3000/login`.
2. Informe as credenciais do administrador (somente usuários com `role = admin` são aceitos).
3. Após o login, controles de criação, edição e exclusão são exibidos nas páginas.
4. Upload de foto de membro da equipe aceita JPG, PNG, WEBP ou GIF com limite de 2 MB.

### 9.3 Recuperação de senha

1. Acesse `http://localhost:3000/recuperar-senha`.
2. Informe o e-mail administrativo e solicite o código.
3. O sistema enviará um código por e-mail (requer variáveis SMTP configuradas).
4. Valide o código e defina uma nova senha.

### 9.4 Portas dos serviços

| Serviço    | URL                                 |
|------------|-------------------------------------|
| Frontend   | http://localhost:3000               |
| Backend    | http://localhost:4000               |
| API Health | http://localhost:4000/api/v1/health |

**Verificação rápida da API:**

```bash
curl http://localhost:4000/api/v1/health
```

Resposta esperada:

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "timestamp": "2026-04-01T00:00:00.000Z"
  }
}
```

---

## 10. Estrutura do Projeto

```
nerdportal/
  apps/
    backend/                      API REST (Node.js / Express)
      controllers/                Lógica de negócio por módulo
        auth.controller.js        Login, logout, sessão, recuperação de senha
        announcements.controller.js
        documents.controller.js   Upload/download seguro
        metrics.controller.js
        systems.controller.js
        team.controller.js
      dal/                        Data Access Layer (SQL parametrizado)
        db.js                     Conexão SQLite (better-sqlite3)
        users.dal.js
        audit.dal.js
        announcements.dal.js
        documents.dal.js
        metrics.dal.js
        systems.dal.js
        team.dal.js
        password-reset.dal.js
      middlewares/                Stack de segurança (9 middlewares)
        securityHeaders.js        Helmet.js (CSP, HSTS, X-Frame-Options)
        cors.js                   CORS com whitelist de origens
        csrf.js                   Double-submit cookie + timingSafeEqual
        rateLimit.js              10 req/15min auth, 100 req/min API geral
        session.js                SQLite session store
        auth.js                   requireAuth, requireRole
        xssSanitizer.js           Sanitização recursiva de inputs
        audit.js                  Log automático de mutações
        upload.js                 Multer com filenames aleatórios
      routes/                     Definição de rotas REST
      services/                   Serviços de e-mail e upload
      src/
        server.js                 Entry point do Express
      database/
        migrate.js                Runner de migrações SQL
      tests/                      Suite de testes automatizados (Jest + Supertest)
      Dockerfile                   Build multi-stage de produção
      docker-entrypoint.sh         Ajusta permissões dos volumes e roda como usuário non-root
      package.json

    frontend/                     Interface web (Next.js 14 / SSR)
      components/                 Componentes reutilizáveis
        Header/                   Logo, navegação, usuário logado
        Sidebar/                  Menu lateral com ícones SVG
        Footer/                   Copyright e versão
        Layout/                   Shell composto (Header + Sidebar + Footer)
      pages/                      Páginas SSR (getServerSideProps)
        _app.js                   Provider global
        _document.js              HTML base (favicon, meta)
        login.js                  Autenticação administrativa
        recuperar-senha.js        Recuperação de senha por código via e-mail
        index.js                  Home institucional
        dashboard.js              Métricas por categoria
        comunicados.js            Lista paginada de comunicados
        documentos.js             Repositório com filtro e download
        equipe.js                 Diretório de membros com foto
        sistemas.js               Catálogo com filtros e badges de status
        chamados.js               Orientação para abertura de chamados
      services/
        api.js                    Camada de fetch (client-side + SSR)
        auth.js                   Guards SSR e utilitários de papel
      styles/                     CSS Modules + variáveis globais de marca
      public/                     Assets estáticos (logo, favicon)
      next.config.js
      Dockerfile
      package.json

  database/
    migrations/                   Arquivos SQL sequenciais de schema e evolução
    seeds/                        Seed do usuário administrador inicial

  docker/
    docker-compose.yml            Orquestração (migrate + backend + frontend)

  .dockerignore                   Exclusões do build context do backend (raiz do monorepo)
  .env.example                    Template de variáveis de ambiente
  .gitignore
```

> O banco SQLite (`itportal.db`) e a pasta `uploads/` são persistidos em volumes Docker nomeados (`dbdata`, `uploads`), não em diretórios do host — use `docker compose down -v` para removê-los.

---

## 11. Endpoints da API

Base URL: `http://localhost:4000/api/v1`

### Autenticação

| Método | Rota                           | Autenticação | Descrição                                        |
|--------|--------------------------------|--------------|--------------------------------------------------|
| POST   | /auth/login                    | Nenhuma      | Autenticar usuário administrativo                |
| POST   | /auth/logout                   | Obrigatória  | Encerrar sessão                                  |
| GET    | /auth/me                       | Nenhuma      | Dados da sessão atual                            |
| POST   | /auth/password-reset/request   | Nenhuma      | Solicitar código de recuperação por e-mail       |
| POST   | /auth/password-reset/verify    | Nenhuma      | Validar código e liberar token de redefinição    |
| POST   | /auth/password-reset/confirm   | Nenhuma      | Definir nova senha após validação do código      |

### Comunicados

| Método | Rota                | Permissão | Descrição             |
|--------|---------------------|-----------|-----------------------|
| GET    | /announcements      | Pública   | Listar (paginado)     |
| GET    | /announcements/:id  | Pública   | Detalhe               |
| POST   | /announcements      | admin     | Criar                 |
| PUT    | /announcements/:id  | admin     | Atualizar             |
| DELETE | /announcements/:id  | admin     | Remover (soft delete) |

### Documentos

| Método | Rota                       | Permissão | Descrição            |
|--------|----------------------------|-----------|----------------------|
| GET    | /documents                 | Pública   | Listar (paginado)    |
| GET    | /documents/:id             | Pública   | Metadados            |
| GET    | /documents/:id/download    | Pública   | Download do arquivo  |
| POST   | /documents                 | admin     | Upload (multipart)   |
| DELETE | /documents/:id             | admin     | Remover              |

### Sistemas

| Método | Rota           | Permissão | Descrição             |
|--------|----------------|-----------|-----------------------|
| GET    | /systems       | Pública   | Listar (filtrável)    |
| GET    | /systems/:id   | Pública   | Detalhe               |
| POST   | /systems       | admin     | Criar                 |
| PUT    | /systems/:id   | admin     | Atualizar             |
| DELETE | /systems/:id   | admin     | Remover (soft delete) |

### Equipe

| Método | Rota                    | Permissão | Descrição                                  |
|--------|-------------------------|-----------|--------------------------------------------|
| GET    | /team                   | Pública   | Listar membros ativos                      |
| GET    | /team/:id               | Pública   | Detalhe                                    |
| GET    | /team/photos/:filename  | Pública   | Servir foto do membro                      |
| POST   | /team                   | admin     | Criar (JSON ou multipart com foto)         |
| PUT    | /team/:id               | admin     | Atualizar (JSON ou multipart com foto)     |
| DELETE | /team/:id               | admin     | Remover (soft delete)                      |

### Métricas

| Método | Rota          | Permissão | Descrição          |
|--------|---------------|-----------|--------------------|
| GET    | /metrics      | Pública   | Listar (filtrável) |
| GET    | /metrics/:id  | Pública   | Detalhe            |
| POST   | /metrics      | admin     | Criar              |
| PUT    | /metrics/:id  | admin     | Atualizar          |
| DELETE | /metrics/:id  | admin     | Remover            |

### Utilitários

| Método | Rota    | Autenticação | Descrição              |
|--------|---------|--------------|------------------------|
| GET    | /health | Nenhuma      | Verificação de saúde   |

---

## 12. Modelo de Acesso e Segurança

### Modelo: Leitura Pública / Escrita Restrita

Todo o conteúdo é acessível publicamente via GET sem autenticação. Operações de escrita (POST, PUT, DELETE) exigem sessão administrativa válida.

| Operação | Acesso  | Proteção                        |
|----------|---------|---------------------------------|
| GET      | Público | Nenhuma autenticação necessária |
| POST     | Admin   | `requireRole("admin")` + CSRF   |
| PUT      | Admin   | `requireRole("admin")` + CSRF   |
| DELETE   | Admin   | `requireRole("admin")` + CSRF   |

O frontend renderiza controles de edição condicionalmente: apenas quando o usuário está autenticado como `admin`. Visitantes públicos visualizam apenas o conteúdo de leitura.

### Medidas de Segurança Implementadas

| Medida                    | Implementação                                                          |
|---------------------------|------------------------------------------------------------------------|
| Hash de senha             | bcrypt com fator de custo 12                                           |
| Gerenciamento de sessão   | Cookies HttpOnly, SameSite=Strict, armazenados no SQLite               |
| Prevenção de SQL Injection | Queries 100% parametrizadas via `better-sqlite3` — nenhuma concatenação |
| Proteção contra XSS       | Middleware de sanitização recursiva + CSP via Helmet.js                |
| Proteção contra CSRF      | Double-submit cookie com `crypto.timingSafeEqual`                      |
| Headers de segurança      | Helmet.js (CSP, HSTS 1 ano, X-Frame-Options DENY, X-Content-Type-Options) |
| Rate limiting             | 10 req/15 min em autenticação; 100 req/min na API geral                |
| Audit logging             | Todas as mutações registradas com usuário, ação, entidade, IP e timestamp |
| Upload de arquivos        | Allowlist de MIME types, nomes aleatórios criptograficamente seguros, validação de tamanho |
| Sessão única admin        | Novo login administrativo invalida sessões admin preexistentes          |

---

## 13. Resolução de Problemas

**Backend não inicia / não encontra o banco de dados**
Confirme que o container `migrate` rodou com sucesso (`docker compose logs migrate`) antes do `backend` subir — o backend depende de `service_completed_successfully` do `migrate`. Sem Docker, confirme que `SQLITE_DB_PATH` aponta para um caminho gravável e que `npm run migrate` foi executado ao menos uma vez.

**Erro `SESSION_SECRET must be set`**
Preencha `SESSION_SECRET` no `.env` com uma string aleatória de pelo menos 64 caracteres. Gere com `openssl rand -hex 32`.

**Porta 3000 ou 4000 já em uso**
Altere `FRONTEND_PORT` ou `BACKEND_PORT` no `.env`. Com Docker, execute `docker compose down` antes de reiniciar.

**Migrações falham com `table already exists`**
As migrações já foram aplicadas. O runner é idempotente e ignora migrações já executadas. Se o erro persistir, verifique a tabela `_migrations` no banco.

**Frontend retorna 401 em todas as páginas**
O backend pode não estar acessível. Verifique se está rodando na porta 4000 e se `NEXT_PUBLIC_API_URL` e `INTERNAL_API_URL` estão corretos no `.env`.

**better-sqlite3 falha na instalação (erro de compilação)**
`better-sqlite3` requer ferramentas de compilação nativas ao instalar via `npm install` fora do Docker (dentro do Docker, o Dockerfile já instala `python3 make g++`).
- Linux: `sudo apt install build-essential python3`
- macOS: `xcode-select --install`
- Windows: instale as Build Tools do Visual Studio

**Recuperação de senha não envia e-mail**
Verifique se as variáveis `SMTP_*` estão preenchidas corretamente no `.env`. Teste a conexão SMTP com um cliente de e-mail antes de subir o backend.

---

## 14. Configuração para Produção com Domínio Próprio

Quando o portal for publicado em um servidor com domínio definido (ex: `portal.example.com`), os seguintes pontos precisam ser atualizados.

### 14.1 Variáveis de ambiente (arquivo `.env`)

| Variável | Valor atual (dev) | O que colocar em produção |
|---|---|---|
| `FRONTEND_URL` | `http://localhost:3000` | `https://portal.example.com` |
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000/api/v1` | URL pública da API (ex: `https://api.portal.example.com/api/v1`) |
| `INTERNAL_API_URL` | `http://localhost:4000/api/v1` | URL interna do container backend (ex: `http://backend:4000/api/v1` no Docker) |
| `ALLOWED_ORIGINS` | *(vazio)* | `https://portal.example.com` |
| `NODE_ENV` | `production` | `production` (já correto) |

**`FRONTEND_URL`** é usada pelo backend para montar o link de redefinição de senha que aparece no e-mail. Se esse valor estiver errado, o link no e-mail apontará para localhost em vez do domínio real.

### 14.2 Link no e-mail de recuperação de senha

**Arquivo:** `apps/backend/services/password-reset.js`

```js
const frontendUrl = (process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/$/, "");
```

O link é construído automaticamente a partir de `FRONTEND_URL`. Basta atualizar essa variável no `.env` — nenhuma alteração de código é necessária.

### 14.3 CORS — origens permitidas

**Arquivo:** `apps/backend/middlewares/cors.js`

```js
const defaultOrigins = ["http://localhost:3000", "http://itportal_frontend:3000"];
const envOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean)
  : [];
```

Adicione o domínio do frontend na variável `ALLOWED_ORIGINS` do `.env`:

```
ALLOWED_ORIGINS=https://portal.example.com
```

Se houver mais de um domínio, separe por vírgula:

```
ALLOWED_ORIGINS=https://portal.example.com,https://www.portal.example.com
```

### 14.4 Cookie de sessão (HTTPS obrigatório em produção)

**Arquivo:** `apps/backend/middlewares/session.js`

O cookie de sessão já tem `secure: true` quando `NODE_ENV=production`. Isso exige que o frontend e a API estejam servidos via **HTTPS**. Use Let's Encrypt com Nginx ou Caddy como reverse proxy na frente do Node.js.

### 14.5 URLs no frontend

**Arquivo:** `apps/frontend/.env.local`

```
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
INTERNAL_API_URL=http://localhost:4000/api/v1
```

Atualize ambas para os valores de produção antes de fazer o build (`npm run build`). O `NEXT_PUBLIC_API_URL` é embutido no bundle durante o build — não basta alterar em runtime.

### Checklist de deploy

- [ ] Configurar DNS apontando o domínio para o IP do servidor
- [ ] Instalar certificado SSL (HTTPS) via Let's Encrypt ou similar
- [ ] Atualizar `FRONTEND_URL` no `.env` com o domínio real
- [ ] Atualizar `NEXT_PUBLIC_API_URL` e `INTERNAL_API_URL` no `.env` e em `apps/frontend/.env.local`
- [ ] Preencher `ALLOWED_ORIGINS` no `.env` com o domínio do frontend
- [ ] Confirmar `NODE_ENV=production` no `.env`
- [ ] Fazer build do frontend: `cd apps/frontend && npm run build`
- [ ] Reiniciar o backend para carregar as novas variáveis

---

NerdResolve — Tecnologia da Informação
Portal do TI v1.0.0
