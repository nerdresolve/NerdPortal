# ITPortal - Portal de Tecnologia da Informacao

Plataforma institucional do Grupo Bravante para centralizacao de comunicacao, documentos, sistemas e metricas do setor de Tecnologia da Informacao. Classificado como ativo critico corporativo. Opera sob modelo de Leitura Publica e Escrita Restrita: todo o conteudo e acessivel sem autenticacao, enquanto operacoes de criacao, edicao e exclusao exigem sessao administrativa.

---

## Indice

1. [Pre-requisitos](#1-pre-requisitos)
2. [Instalacao dos Pre-requisitos](#2-instalacao-dos-pre-requisitos)
3. [Obtendo o Projeto](#3-obtendo-o-projeto)
4. [Configuracao do Ambiente](#4-configuracao-do-ambiente)
5. [Execucao com Docker (Recomendado)](#5-execucao-com-docker-recomendado)
6. [Execucao Manual (Sem Docker)](#6-execucao-manual-sem-docker)
7. [Migracao do Banco de Dados](#7-migracao-do-banco-de-dados)
8. [Criacao do Usuario Administrador](#8-criacao-do-usuario-administrador)
9. [Acessando o Sistema](#9-acessando-o-sistema)
10. [Estrutura do Projeto](#10-estrutura-do-projeto)
11. [Endpoints da API](#11-endpoints-da-api)
12. [Seguranca](#12-seguranca)
13. [Resolucao de Problemas](#13-resolucao-de-problemas)

---

## 1. Pre-requisitos

O ITPortal requer os seguintes softwares instalados na maquina de desenvolvimento ou servidor:

| Software       | Versao Minima | Finalidade                           |
|----------------|---------------|--------------------------------------|
| Docker         | 24.0+         | Containerizacao dos servicos         |
| Docker Compose | 2.20+         | Orquestracao dos containers          |
| Node.js        | 20.0+         | Runtime para backend e frontend      |
| npm            | 10.0+         | Gerenciador de pacotes (incluso no Node.js) |
| PostgreSQL     | 16.0+         | Banco de dados (apenas se executar sem Docker) |
| Git            | 2.40+         | Controle de versao                   |

Para a opcao com Docker (recomendada), apenas Docker, Docker Compose e Git sao necessarios. Node.js e PostgreSQL sao providos pelos containers.

---

## 2. Instalacao dos Pre-requisitos

### 2.1 Git

**Windows:**
Baixe o instalador em https://git-scm.com/download/win e execute. Mantenha as opcoes padrao. Apos a instalacao, abra o Git Bash ou o terminal e verifique:

```
git --version
```

**macOS:**
```
xcode-select --install
```
Ou instale via Homebrew:
```
brew install git
```

**Linux (Ubuntu/Debian):**
```
sudo apt update
sudo apt install git -y
git --version
```

### 2.2 Docker e Docker Compose

**Windows e macOS:**
Baixe e instale o Docker Desktop em https://www.docker.com/products/docker-desktop/. O Docker Compose ja esta incluso no Docker Desktop. Apos a instalacao, reinicie o computador e verifique:

```
docker --version
docker compose version
```

**Linux (Ubuntu/Debian):**
```
# Remover versoes antigas
sudo apt remove docker docker-engine docker.io containerd runc 2>/dev/null

# Adicionar repositorio oficial
sudo apt update
sudo apt install ca-certificates curl gnupg -y
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Instalar Docker Engine + Compose
sudo apt update
sudo apt install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin -y

# Permitir execucao sem sudo
sudo usermod -aG docker $USER
newgrp docker

# Verificar
docker --version
docker compose version
```

### 2.3 Node.js 20 (Apenas para execucao manual, sem Docker)

**Windows e macOS:**
Baixe o instalador LTS em https://nodejs.org/ (versao 20.x ou superior). Execute o instalador e siga as instrucoes. Verifique:

```
node --version
npm --version
```

**Linux (Ubuntu/Debian) via NodeSource:**
```
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install nodejs -y
node --version
npm --version
```

### 2.4 PostgreSQL 16 (Apenas para execucao manual, sem Docker)

**Windows:**
Baixe o instalador em https://www.postgresql.org/download/windows/. Durante a instalacao, defina a senha do usuario `postgres` e anote-a. Adicione o diretorio `bin` do PostgreSQL ao PATH do sistema.

**macOS:**
```
brew install postgresql@16
brew services start postgresql@16
```

**Linux (Ubuntu/Debian):**
```
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
sudo apt update
sudo apt install postgresql-16 -y

# Verificar
psql --version
```

---

## 3. Obtendo o Projeto

Se o projeto foi entregue como arquivo `.zip`:

```
unzip ITPortal.zip
cd ITPortal
```

Se o projeto esta em um repositorio Git:

```
git clone <URL_DO_REPOSITORIO>
cd ITPortal
```

---

## 4. Configuracao do Ambiente

O arquivo `.env` na raiz do projeto contem todas as variaveis de ambiente necessarias. Copie o template e preencha os valores obrigatorios:

```
cp .env.example .env
```

Abra o arquivo `.env` em um editor de texto e configure:

```
# OBRIGATORIO: Defina uma senha forte para o banco de dados
POSTGRES_PASSWORD=sua_senha_segura_aqui

# OBRIGATORIO: Gere uma string aleatoria de no minimo 64 caracteres
# Em Linux/macOS, gere com: openssl rand -hex 32
SESSION_SECRET=cole_aqui_a_string_gerada

# OBRIGATORIO PARA RECUPERACAO DE SENHA VIA E-MAIL
SMTP_HOST=smtp.seuprovedor.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_REQUIRE_TLS=true
SMTP_USER=conta-que-vai-enviar@empresa.com.br
SMTP_PASSWORD=senha_da_conta_ou_app_password
SMTP_FROM_EMAIL=conta-que-vai-enviar@empresa.com.br
SMTP_FROM_NAME=Portal do TI

# OPCIONAIS: Ajuste fino do fluxo de recuperacao
PASSWORD_RESET_CODE_TTL_MINUTES=15
PASSWORD_RESET_TOKEN_TTL_MINUTES=15
PASSWORD_RESET_MAX_ATTEMPTS=5
```

Para gerar o `SESSION_SECRET` automaticamente:

**Linux/macOS:**
```
openssl rand -hex 32
```

**Windows (PowerShell):**
```
-join ((1..64) | ForEach-Object { '{0:x}' -f (Get-Random -Max 16) })
```

As demais variaveis possuem valores padrao adequados para desenvolvimento e nao precisam ser alteradas.

### 4.1 Variaveis para recuperacao de senha

Para que o administrador receba o codigo por e-mail, preencha no `.env`:

| Variavel | Obrigatoria | Descricao |
|----------|-------------|-----------|
| `SMTP_HOST` | Sim | Host SMTP do provedor que enviara os e-mails |
| `SMTP_PORT` | Sim | Porta SMTP. Ex.: `587` para STARTTLS ou `465` para SMTPS |
| `SMTP_SECURE` | Sim | Use `true` quando o provedor exigir TLS implicito na conexao inicial |
| `SMTP_REQUIRE_TLS` | Nao | Mantem `true` para exigir STARTTLS quando `SMTP_SECURE=false` |
| `SMTP_USER` | Sim | Usuario/login da conta que enviara o codigo |
| `SMTP_PASSWORD` | Sim | Senha da conta ou app password do provedor |
| `SMTP_FROM_EMAIL` | Sim | Endereco que aparecera como remetente |
| `SMTP_FROM_NAME` | Nao | Nome exibido no remetente. Sugestao: `Portal do TI` |
| `SMTP_AUTH_METHOD` | Nao | Metodo SMTP. Padrao: `LOGIN` |
| `SMTP_HELO_NAME` | Nao | Nome enviado no EHLO/HELO, se o provedor exigir personalizacao |
| `SMTP_TIMEOUT_MS` | Nao | Timeout da conexao SMTP em milissegundos |
| `PASSWORD_RESET_CODE_TTL_MINUTES` | Nao | Tempo de expiracao do codigo recebido por e-mail |
| `PASSWORD_RESET_TOKEN_TTL_MINUTES` | Nao | Tempo de expiracao do token liberado apos validar o codigo |
| `PASSWORD_RESET_MAX_ATTEMPTS` | Nao | Numero maximo de tentativas invalidas do codigo antes da invalidacao |

---

## 5. Execucao com Docker (Recomendado)

Esta e a forma recomendada de executar o projeto. Todos os servicos (banco de dados, backend e frontend) serao iniciados automaticamente.

### 5.1 Construir e iniciar os containers

A partir da raiz do projeto:

```
cd docker
docker compose --env-file ../.env up --build
```

Na primeira execucao, o Docker ira:
1. Baixar as imagens base (postgres:16-alpine, node:20-alpine).
2. Construir os containers do backend e frontend.
3. Instalar todas as dependencias via `npm ci`.
4. Iniciar o PostgreSQL com health check (aguarda ate 30 segundos).
5. Iniciar o backend (porta 4000) apos o banco estar saudavel.
6. Iniciar o frontend (porta 3000) apos o backend estar disponivel.

Para executar em segundo plano (modo daemon):

```
docker compose --env-file ../.env up --build -d
```

### 5.2 Verificar se os servicos estao rodando

```
docker compose ps
```

Os tres servicos devem estar com status `Up` ou `running`:

```
NAME                 STATUS
itportal_db          Up (healthy)
itportal_backend     Up
itportal_frontend    Up
```

### 5.3 Verificar logs

```
# Todos os servicos
docker compose logs -f

# Apenas o backend
docker compose logs -f backend

# Apenas o banco
docker compose logs -f db
```

### 5.4 Parar os servicos

```
docker compose down
```

Para parar e remover os volumes (apaga os dados do banco):

```
docker compose down -v
```

---

## 6. Execucao Manual (Sem Docker)

Caso prefira executar sem Docker, siga estes passos. Certifique-se de que Node.js 20+ e PostgreSQL 16+ estao instalados.

### 6.1 Configurar o banco de dados

Conecte-se ao PostgreSQL como superusuario e crie o banco e o usuario:

```
sudo -u postgres psql
```

Execute os seguintes comandos SQL:

```sql
CREATE USER itportal_user WITH PASSWORD 'sua_senha_aqui';
CREATE DATABASE itportal OWNER itportal_user;
GRANT ALL PRIVILEGES ON DATABASE itportal TO itportal_user;
\q
```

### 6.2 Atualizar variaveis de ambiente para execucao local

No arquivo `.env`, altere `POSTGRES_HOST` de `db` para `localhost`:

```
POSTGRES_HOST=localhost
```

### 6.3 Instalar dependencias do backend

```
cd apps/backend
npm install
cd ../..
```

### 6.4 Instalar dependencias do frontend

```
cd apps/frontend
npm install
cd ../..
```

### 6.5 Iniciar o backend

Abra um terminal e execute:

```
cd apps/backend
# Carregar variaveis de ambiente (Linux/macOS)
export $(grep -v '^#' ../../.env | xargs)

npm run dev
```

**Windows (PowerShell):**
```
cd apps\backend
Get-Content ..\..\env | ForEach-Object {
  if ($_ -match '^([^#][^=]*)=(.*)$') {
    [Environment]::SetEnvironmentVariable($matches[1], $matches[2])
  }
}
npm run dev
```

O backend estara disponivel em `http://localhost:4000`.
Na execucao manual, os uploads ficam em `apps/backend/uploads/` por padrao. Caso queira centralizar em outro caminho, defina a variavel `UPLOADS_DIR` antes de iniciar o backend.

### 6.6 Iniciar o frontend

Em outro terminal:

```
cd apps/frontend
# Carregar variaveis de ambiente (Linux/macOS)
export $(grep -v '^#' ../../.env | xargs)

npm run dev
```

O frontend estara disponivel em `http://localhost:3000`.

---

## 7. Migracao do Banco de Dados

As migracoes criam todas as tabelas necessarias no PostgreSQL. Este passo e obrigatorio antes do primeiro uso.

### 7.1 Via Docker

```
docker compose exec backend node database/migrate.js
```

Observacao: o `docker-compose.yml` monta `../database` em `/database` dentro do container do backend para que o runner de migracoes consiga acessar os arquivos SQL do projeto.

### 7.2 Via execucao manual

```
cd apps/backend
export $(grep -v '^#' ../../.env | xargs)
export POSTGRES_HOST=localhost

npm run migrate
```

A saida esperada:

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

As migracoes sao idempotentes. Executar novamente nao causa erros (migracoes ja aplicadas sao ignoradas).

---

## 8. Criacao do Usuario Administrador

O seed cria o usuario administrador padrao para o primeiro acesso.

### 8.1 Via Docker

```
docker compose exec backend node /database/seeds/001_admin_user.js
```

### 8.2 Via execucao manual

```
cd database/seeds
export $(grep -v '^#' ../../.env | xargs)
export POSTGRES_HOST=localhost

node 001_admin_user.js
```

**Credenciais padrao:**

| Campo | Valor                          |
|-------|--------------------------------|
| Email | admin@bravante.com.br          |
| Senha | Admin@ITPortal2026             |
| Role  | admin                          |

**IMPORTANTE:** Altere a senha padrao apos o primeiro login.

---

## 9. Acessando o Sistema

O ITPortal opera sob o modelo **Leitura Publica / Escrita Restrita**. Nenhuma autenticacao e necessaria para visualizar o conteudo.

### 9.1 Acesso publico (qualquer visitante)

1. Abra o navegador e acesse `http://localhost:3000`.
2. A Home institucional sera exibida diretamente, sem login.
3. Todas as paginas (Dashboard, Comunicados, Documentos, Equipe, Sistemas, Chamados) sao acessiveis sem autenticacao.

### 9.2 Acesso administrativo (gestao de conteudo)

1. Acesse diretamente `http://localhost:3000/login`.
2. Informe as credenciais do administrador (secao 8). O login aceita apenas usuarios com `role = admin`.
3. Apos o login, botoes de edicao, upload e exclusao serao exibidos nas paginas.
4. O Header publico nao exibe atalho administrativo; isso reduz exposicao visual da area de gestao para visitantes.
5. Na pagina Equipe, o cadastro administrativo aceita foto do membro em JPG, PNG, WEBP ou GIF com limite de 2 MB.
6. Operacoes de criacao, edicao e exclusao exigem sessao administrativa valida.

### 9.3 Recuperacao de senha do administrador

1. Acesse `http://localhost:3000/recuperar-senha`.
2. Informe o e-mail administrativo e solicite o codigo.
3. O backend enviara um codigo aleatorio por e-mail usando as variaveis SMTP configuradas no `.env`.
4. Valide o codigo recebido e defina uma nova senha forte.
5. A redefinicao encerra sessoes administrativas antigas para reduzir risco de sequestro de sessao.

### 9.4 Portas dos servicos

| Servico    | URL                               |
|------------|-----------------------------------|
| Frontend   | http://localhost:3000              |
| Backend    | http://localhost:4000              |
| API Health | http://localhost:4000/api/v1/health |
| PostgreSQL | localhost:5432                     |

### Verificacao rapida da API

```
curl http://localhost:4000/api/v1/health
```

Resposta esperada:

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "timestamp": "2026-03-30T00:00:00.000Z"
  }
}
```

---

## 10. Estrutura do Projeto

```
ITPortal/
  apps/
    backend/                    API REST (Node.js / Express)
      controllers/              Logica de negocio por modulo
        auth.controller.js      Login, logout, sessao
        announcements.controller.js
        documents.controller.js Upload/download seguro
        metrics.controller.js
        systems.controller.js
        team.controller.js
      dal/                      Data Access Layer (SQL parametrizado)
        db.js                   Pool de conexoes PostgreSQL
        users.dal.js
        audit.dal.js
        announcements.dal.js
        documents.dal.js
        metrics.dal.js
        systems.dal.js
        team.dal.js
      middlewares/               Stack de seguranca (9 middlewares)
        securityHeaders.js      Helmet.js (CSP, HSTS, X-Frame-Options)
        cors.js                 CORS com whitelist de origens
        csrf.js                 Double-submit cookie + timingSafeEqual
        rateLimit.js            10 req/15min auth, 100 req/min API
        session.js              PostgreSQL session store
        auth.js                 requireAuth, requireRole
        xssSanitizer.js         Sanitizacao recursiva de inputs
        audit.js                Log automatico de mutacoes
        upload.js               Multer com filenames aleatorios
      routes/                   Definicao de rotas REST
      src/
        server.js               Entry point do Express
      database/
        migrate.js              Runner de migracoes SQL
      Dockerfile
      package.json

    frontend/                   Interface web (Next.js 14 / SSR)
      components/               Componentes reutilizaveis
        Header/                 Logo, navegacao, usuario
        Sidebar/                Menu lateral com icones SVG
        Footer/                 Copyright e versao
        Layout/                 Shell que compoe Header+Sidebar+Footer
      pages/                    Paginas SSR (getServerSideProps)
        _app.js                 Provider global
        _document.js            HTML base (favicon, meta)
        login.js                Autenticacao
        recuperar-senha.js      Recuperacao administrativa por codigo
        index.js                Home institucional
        dashboard.js            Metricas por categoria
        comunicados.js          Lista paginada de comunicados
        documentos.js           Repositorio com filtro e download
        equipe.js               Diretorio de membros com upload seguro de foto
        sistemas.js             Catalogo com filtros e badges
        chamados.js             Orientacao para tickets
      services/
        api.js                  Camada de fetch (client + SSR)
        auth.js                 Guard SSR e utilitarios de role
      styles/                   CSS Modules + variaveis globais
      public/                   Assets estaticos (logo, favicon)
      next.config.js
      Dockerfile
      package.json
      uploads/                    Uploads locais da execucao manual do backend

  database/
    migrations/                 Arquivos SQL sequenciais de schema e evolucao
    seeds/                      Seed do usuario administrador

  docker/
    docker-compose.yml          Orquestracao (db + backend + frontend)

  docs/
    technical_memory.md         Documentacao tecnica e decisoes
    progress.txt                Checklist de progresso
    security_audit_report.md    Relatorio de auditoria de seguranca
    security_audit.sh           Script de auditoria automatizada

  uploads/                      Persistencia de uploads no host quando executado via Docker
  .env.example                  Template de variaveis de ambiente
  .gitignore
```

---

## 11. Endpoints da API

Base: `http://localhost:4000/api/v1`

### Autenticacao

| Metodo | Rota                         | Autenticacao | Descricao                                      |
|--------|------------------------------|--------------|------------------------------------------------|
| POST   | /auth/login                  | Nenhuma      | Autenticar usuario                             |
| POST   | /auth/password-reset/request | Nenhuma      | Solicitar codigo de recuperacao por e-mail     |
| POST   | /auth/password-reset/verify  | Nenhuma      | Validar codigo recebido e liberar troca de senha |
| POST   | /auth/password-reset/confirm | Nenhuma      | Definir nova senha apos validacao do codigo    |
| POST   | /auth/logout                 | Obrigatoria  | Encerrar sessao                                |
| GET    | /auth/me                     | Nenhuma      | Dados da sessao atual                          |

### Comunicados

| Metodo | Rota               | Permissao     | Descricao              |
|--------|--------------------|---------------|------------------------|
| GET    | /announcements     | Publica       | Listar (paginado)      |
| GET    | /announcements/:id | Publica       | Detalhe                |
| POST   | /announcements     | admin         | Criar                  |
| PUT    | /announcements/:id | admin         | Atualizar              |
| DELETE | /announcements/:id | admin         | Remover (soft delete)  |

### Documentos

| Metodo | Rota                      | Permissao     | Descricao            |
|--------|---------------------------|---------------|----------------------|
| GET    | /documents                | Publica       | Listar (paginado)    |
| GET    | /documents/:id            | Publica       | Metadados            |
| GET    | /documents/:id/download   | Publica       | Download do arquivo  |
| POST   | /documents                | admin         | Upload (multipart)   |
| DELETE | /documents/:id            | admin         | Remover              |

### Sistemas

| Metodo | Rota           | Permissao   | Descricao              |
|--------|----------------|-------------|------------------------|
| GET    | /systems       | Publica     | Listar (filtravel)     |
| GET    | /systems/:id   | Publica     | Detalhe                |
| POST   | /systems       | admin       | Criar                  |
| PUT    | /systems/:id   | admin       | Atualizar              |
| DELETE | /systems/:id   | admin       | Remover (soft delete)  |

### Equipe

| Metodo | Rota                 | Permissao   | Descricao                            |
|--------|----------------------|-------------|--------------------------------------|
| GET    | /team                | Publica     | Listar membros                       |
| GET    | /team/:id            | Publica     | Detalhe                              |
| GET    | /team/photos/:filename | Publica   | Servir foto publica do membro        |
| POST   | /team                | admin       | Criar (JSON ou multipart com foto)   |
| PUT    | /team/:id            | admin       | Atualizar (JSON ou multipart com foto) |
| DELETE | /team/:id            | admin       | Remover (soft delete)                |

### Metricas

| Metodo | Rota          | Permissao     | Descricao              |
|--------|---------------|---------------|------------------------|
| GET    | /metrics      | Publica       | Listar (filtravel)     |
| GET    | /metrics/:id  | Publica       | Detalhe                |
| POST   | /metrics      | admin         | Criar                  |
| PUT    | /metrics/:id  | admin         | Atualizar              |

### Utilitarios

| Metodo | Rota    | Autenticacao | Descricao               |
|--------|---------|--------------|-------------------------|
| GET    | /health | Nenhuma      | Verificacao de saude     |

---

## 12. Modelo de Acesso e Seguranca

### Modelo: Leitura Publica / Escrita Restrita

O ITPortal adota um modelo onde todo o conteudo (comunicados, documentos, metricas, equipe, sistemas) e acessivel publicamente via GET, sem necessidade de autenticacao. Operacoes de escrita (POST, PUT, DELETE) exigem sessao administrativa valida.

| Operacao | Acesso   | Protecao                              |
|----------|----------|---------------------------------------|
| GET      | Publico  | Nenhuma autenticacao necessaria       |
| POST     | Admin    | requireRole("admin") + CSRF           |
| PUT      | Admin    | requireRole("admin") + CSRF           |
| DELETE   | Admin    | requireRole("admin") + CSRF           |

O frontend renderiza controles de edicao (botoes de criar, editar, excluir, upload) condicionalmente: apenas quando o usuario esta autenticado como admin. Visitantes publicos veem apenas o conteudo de leitura.
O acesso administrativo continua disponivel em `/login`, mas o Header publico nao exibe mais o botao de entrada da area admin.

### Medidas de Seguranca

**Autenticacao:** Hash de senha com bcrypt (custo 12). Sessoes armazenadas no PostgreSQL com cookies HttpOnly, SameSite=Strict. Regeneracao de sessao no login para prevenir session fixation. Resposta em tempo constante para prevenir enumeracao de usuarios.
O endpoint de login administrativo aceita apenas usuarios com `role = admin`; visitantes e usuarios sem privilegio administrativo devem consumir o portal exclusivamente em modo publico.
O fluxo de recuperacao de senha gera um codigo aleatorio enviado por e-mail, armazena apenas o hash desse codigo no banco, limita tentativas de validacao, invalida pedidos anteriores e encerra sessoes existentes apos a redefinicao da senha.

**Protecao contra SQL Injection:** Todas as queries usam parametrizacao (`$1, $2, ...`) via biblioteca `pg`. Nenhuma concatenacao de strings em SQL.

**Protecao contra XSS:** Middleware de sanitizacao recursiva codifica entidades HTML em todos os inputs (body e query). Helmet.js configura Content-Security-Policy restritiva.

**Protecao contra CSRF:** Double-submit cookie com comparacao via `crypto.timingSafeEqual`. Header `X-CSRF-Token` obrigatorio em todas as requisicoes que alteram estado.

**Headers de seguranca:** Helmet.js com CSP, HSTS (1 ano), X-Frame-Options DENY, X-Content-Type-Options nosniff. Next.js adiciona camada extra de headers.

**Rate limiting:** 10 requisicoes por 15 minutos em endpoints de autenticacao. 100 requisicoes por minuto em endpoints gerais da API.

**Upload de arquivos e fotos:** Allowlist de tipos MIME seguros, nomes de arquivo criptograficamente aleatorios, prevencao de path traversal e validacao de tamanho. Documentos aceitam ate 10MB; fotos da equipe aceitam JPG, PNG, WEBP ou GIF ate 2MB e sao servidas por rota controlada.

**Audit logging:** Todas as operacoes que alteram estado sao registradas com ID do usuario, acao, entidade, IP de origem e user-agent. Tabela de auditoria e imutavel.

O relatorio completo da auditoria de seguranca esta em `docs/security_audit_report.md`.

---

## 13. Resolucao de Problemas

**O backend nao conecta ao banco de dados:**
Verifique se o PostgreSQL esta rodando e aceitando conexoes. Confirme que `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_USER` e `POSTGRES_PASSWORD` estao corretos no `.env`. Com Docker, o host deve ser `db`; sem Docker, deve ser `localhost`.

**Erro "POSTGRES_PASSWORD must be set":**
O arquivo `.env` nao foi configurado ou nao esta sendo carregado. Certifique-se de que o `.env` existe na raiz do projeto e contem `POSTGRES_PASSWORD` preenchido.

**Erro "SESSION_SECRET must be set":**
Preencha `SESSION_SECRET` no `.env` com uma string aleatoria de pelo menos 64 caracteres.

**Porta 3000 ou 4000 ja em uso:**
Altere `FRONTEND_PORT` ou `BACKEND_PORT` no `.env`. Com Docker, execute `docker compose down` antes de reiniciar.

**Migracoes falham com "relation already exists":**
Isso indica que as migracoes ja foram executadas. O runner e idempotente e ignora migracoes ja aplicadas. Se o erro persistir, verifique a tabela `_migrations` no banco.

**Frontend retorna 401 em todas as paginas:**
O backend pode nao estar acessivel. Verifique se o backend esta rodando na porta 4000 e se o `NEXT_PUBLIC_API_URL` e `INTERNAL_API_URL` estao corretos.

**bcrypt falha na instalacao (erro de compilacao):**
O bcrypt requer ferramentas de compilacao nativas. No Linux: `sudo apt install build-essential python3`. No macOS: `xcode-select --install`. No Windows: instale as Build Tools do Visual Studio.

---

## 14. Configuracao para Producao com Dominio Proprio

Quando o portal for publicado em um servidor com dominio definido (ex: `portal.bravante.com.br`), os seguintes pontos precisam ser atualizados:

---

### 14.1 Variaveis de ambiente (arquivo `.env`)

| Variavel | Valor atual (dev) | O que colocar em producao |
|---|---|---|
| `FRONTEND_URL` | `http://localhost:3000` | `https://portal.bravante.com.br` |
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000/api/v1` | `https://api.portal.bravante.com.br/api/v1` (ou o caminho da API no mesmo dominio) |
| `INTERNAL_API_URL` | `http://localhost:4000/api/v1` | URL interna do container backend (ex: `http://backend:4000/api/v1` se usar Docker) |
| `ALLOWED_ORIGINS` | *(vazio)* | `https://portal.bravante.com.br` |
| `NODE_ENV` | `production` | `production` (ja correto) |

**`FRONTEND_URL`** e usada pelo backend para montar o link de redefinicao de senha que aparece no e-mail. Se esse valor estiver errado, o link no e-mail vai apontar para localhost em vez do dominio real.

---

### 14.2 Link no e-mail de recuperacao de senha

**Arquivo:** `apps/backend/services/password-reset.js`

Funcao `buildResetEmailHtml`, linha:

```js
const frontendUrl = (process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/$/, "");
```

O link e construido automaticamente a partir de `FRONTEND_URL`. Basta atualizar essa variavel no `.env` — nenhuma alteracao de codigo e necessaria.

---

### 14.3 CORS — origens permitidas

**Arquivo:** `apps/backend/middlewares/cors.js`

```js
const defaultOrigins = ["http://localhost:3000", "http://itportal_frontend:3000"];
const envOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean)
  : [];
```

Em producao, adicione o dominio do frontend na variavel `ALLOWED_ORIGINS` do `.env`:

```
ALLOWED_ORIGINS=https://portal.bravante.com.br
```

Se houver mais de um dominio (ex: www + apex), separe por virgula:

```
ALLOWED_ORIGINS=https://portal.bravante.com.br,https://www.portal.bravante.com.br
```

---

### 14.4 Cookie de sessao (HTTPS obrigatorio em producao)

**Arquivo:** `apps/backend/middlewares/session.js`

O cookie de sessao ja tem `secure: true` quando `NODE_ENV=production`. Isso exige que o frontend e a API estejam servidos via **HTTPS**. Se o dominio nao tiver certificado SSL configurado, o login nao funcionara porque o navegador recusara o cookie.

Use Let's Encrypt com Nginx ou Caddy como reverse proxy na frente do Node.js.

---

### 14.5 URLs hardcoded no frontend

**Arquivo:** `apps/frontend/.env.local`

```
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
INTERNAL_API_URL=http://localhost:4000/api/v1
```

Atualize ambas para os valores de producao antes de fazer o build (`npm run build`). O `NEXT_PUBLIC_API_URL` e embutido no bundle do navegador durante o build — nao basta alterar em runtime.

---

### Resumo do checklist de deploy

- [ ] Configurar DNS apontando o dominio para o IP do servidor
- [ ] Instalar certificado SSL (HTTPS) via Let's Encrypt ou similar
- [ ] Atualizar `FRONTEND_URL` no `.env` com o dominio real
- [ ] Atualizar `NEXT_PUBLIC_API_URL` e `INTERNAL_API_URL` no `.env` e em `apps/frontend/.env.local`
- [ ] Preencher `ALLOWED_ORIGINS` no `.env` com o dominio do frontend
- [ ] Confirmar `NODE_ENV=production` no `.env`
- [ ] Fazer build do frontend: `cd apps/frontend && npm run build`
- [ ] Reiniciar o backend para carregar as novas variaveis

---

Grupo Bravante - Tecnologia da Informacao
ITPortal v0.1.0
