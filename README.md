# 🕷️ GeekBlog

Blog para fãs do mundo geek: notícias, resúmenes semanais, personagens de Marvel e DC e promoções de HQs (histórias em quadrinhos). O projeto combina um **frontend estático** (HTML/CSS/JavaScript) com uma **API REST** (Node.js + Express + MySQL) e foi construído pensando na **conformidade com a LGPD** (Lei Geral de Proteção de Dados Pessoais nº 13.709/2018).

---

## ⚡ Funcionalidades

### 📄 Páginas do site

| Página | Descrição |
|--------|-----------|
| `index.html` | **Home** – Destaques semanais de Marvel, DC e mangas, com carga dinâmica dos posts publicados vindos da base de dados |
| `Personagens.html` | Catálogo de personagens (Marvel/DC) com buscador em tempo real |
| `hqs.html` | Seção de promoções de HQs |
| `sobre.html` | Informações sobre o projeto e a criadora |
| `login.html` / `cadastro.html` | Autenticação. Após o login, cada rol é redirigido ao seu painel |
| `escritor.html` | **Painel do Escritor** – Cria publicações e edita/elimina **só os seus próprios posts** (rol `autor`) |
| `editor.html` | **Painel do Editor** – Cria publicações e edita/elimina os posts de **qualquier autor** (rol `editor`) |
| `adm.html` | **Painel do Admin** – Todo o anterior + CRUD de personagens, dashboard de funcionamento do site e gestão de usuários/roles (rol `admin`) |
| `privacidade.html` | Política de privacidade (LGPD) |
| `direitos.html` | Formulário para exercer os direitos do titular (Art. 18 da LGPD) |

### 🖥️ Painel por roles (`escritor.html`, `editor.html`, `adm.html`)
O sistema usa 3 roles (`usuarios.role`): `autor` (escritor), `editor` e `admin`.

| Ação | Escritor (`autor`) | Editor (`editor`) | Admin (`admin`) |
|--------|------|------|------|
| Criar publicações | ✅ | ✅ | ✅ |
| Editar/excluir **próprias** publicações | ✅ | ✅ | ✅ |
| Editar/excluir publicações de outros | ❌ | ✅ | ✅ |
| Gestão de personagens (CRUD) | ❌ | ❌ | ✅ |
| Dashboard de funcionamento do site | ❌ | ❌ | ✅ |
| Gestão de usuários e roles | ❌ | ❌ | ✅ |

- **Verificação de acesso**: cada página de painel valida o rol do usuário logado (a partir do JWT guardado em `localStorage`). Se um escritor tenta abrir `editor.html` ou `adm.html`, recebe **Acesso Negado** com link ao seu próprio painel; se não há sessão, se mostra "Acesso Restringido". O backend além disso devolve `403` em operações não permitidas (defensa em profundidad).
- `POST /api/register` cria sempre usuários `autor`. Os admins criam e atribuem roles (escritor/editor/admin) desde a pestanha **Usuários** do painel admin.

### 🔒 Segurança e conformidade LGPD
- **Helmet** – cabeçalhos de segurança HTTP.
- **CORS** – restringido a origens específicas (`localhost:3000` e `localhost:5500`).
- **Rate limiting** – 100 requisições por IP em janela de 15 min; 10 tentativas em `/api/login` e `/api/register`.
- **bcrypt** – senhas armazenadas como hash (nunca em texto plano).
- **JWT** – tokens de autenticação com expiração de 8 h.
- **Anti-XSS** – uso de `textContent` ao renderizar conteúdo dinâmico.
- **Banner de cookies** – consentimento do usuário guardado em `localStorage`.
- **Direitos do titular** – endpoints para consultar e excluir os dados do usuário.

### 🤖 Chat com IA
- Rota `POST /api/chat` que usa **OpenAI (gpt-4o-mini)** como assistente especializado em cultura geek.

---

## 🛠️ Stack tecnológico

| Camada         | Tecnologia                                   |
|----------------|----------------------------------------------|
| Frontend       | HTML5, CSS3, JavaScript (fetch API)          |
| Backend        | Node.js, Express 5                           |
| Banco de dados | MySQL (driver `mysql2` com pool de conexões) |
| Autenticação   | JSON Web Tokens (`jsonwebtoken`) + bcrypt    |
| Segurança      | Helmet, CORS, express-rate-limit             |
| IA             | OpenAI SDK (`gpt-4o-mini`)                   |

Dependências em `backend/package.json`: `express`, `cors`, `helmet`, `express-rate-limit`, `bcrypt`, `jsonwebtoken`, `mysql2`, `openai`, `dotenv`.

---

## 📁 Estrutura do projeto

```
geek-blog/
├── backend/                  # API REST (Node.js + Express)
│   ├── server.js             # Servidor principal e todas as rotas
│   ├── db.js                 # Pool de conexões ao MySQL
│   ├── chat.js               # Referência de configuração OpenAI (integrado em server.js)
│   ├── criar-personagens.js  # Cria a tabela personagens e insere dados de exemplo
│   ├── test-db.js            # Script para testar a conexão ao MySQL
│   ├── package.json          # Dependências e scripts
│   └── .env.example          # Template das variáveis de ambiente
├── Mysql/
│   └── UML-BD.txt            # Esquema da base de dados (usuarios, categorias, posts)
├── img/                      # Imagens do site
├── query/                    # (vazio) scripts de consulta futuros
├── .gitignore
├── _config.yml               # Configuração GitHub Pages
├── index.html                # Home
├── adm.html                  # Painel administrativo
├── login.html                # Login
├── cadastro.html             # Registro de usuários
├── Personagens.html          # Catálogo de personagens
├── hqs.html                  # Promoções de HQs
├── sobre.html                # Sobre o projeto
├── privacidade.html          # Política de privacidade (LGPD)
├── direitos.html             # Direitos do titular (LGPD)
└── style.css                 # Folha de estilos
```

---

## 🚀 Configuração e execução

### 1. Requisitos prévios
- **Node.js** (v18 ou superior recomendado)
- **MySQL** (ou MariaDB) em execução
- Navegador web moderno (Chrome, Firefox, Edge)

### 2. Criar a base de dados

Execute o esquema de `Mysql/UML-BD.txt` no seu gestor MySQL:

```sql
CREATE DATABASE geek;
USE geek;

CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'autor', -- 'admin', 'editor', 'autor'
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE categorias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(50) NOT NULL UNIQUE,
    slug VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE posts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    conteudo TEXT NOT NULL,
    imagem_capa_url VARCHAR(500),
    autor_id INT REFERENCES usuarios(id) ON DELETE SET NULL,
    categoria_id INT REFERENCES categorias(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'rascunho', -- 'rascunho', 'publicado'
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

> 💡 Nota: o esquema original usa `SERIAL`; em MySQL equivale a `INT AUTO_INCREMENT`.

Depois, crie a tabela de **personagens** e cargue dados de exemplo:

```bash
cd backend
npm install
copy .env.example .env   # edite com suas credenciais
node criar-personagens.js
```

### 3. Configurar as variáveis de ambiente

Copie `.env.example` a `.env` dentro de `backend/` e complete os valores:

```env
DB_HOST=localhost
DB_USER=seu_usuario
DB_PASSWORD=sua_senha
DB_NAME=geek
PORT=3000
OPENAI_API_KEY=tu_chave_aqui
JWT_SECRET=tu_segredo_jwt_muito_longo_e_secreto
```

> ⚠️ O arquivo `.env` está em `.gitignore` – nunca suba credenciais reais ao repositório.

### 4. Levantar o backend

```bash
cd backend
npm install
node server.js
```

Você deveria ver: `✅ Conectado com sucesso ao banco de dados MySQL (geek)!` e `🚀 Servidor rodando na porta 3000: http://localhost:3000`.

### 5. Abrir o frontend

Abra `index.html` no navegador ou sirva a carpeta raíz com um servidor estático, por exemplo:

```bash
# Opção 1: VS Code com Live Server (porta 5500)
# Opção 2: Python
python -m http.server 5500
```

Depois visite `http://localhost:5500`.

---

## 🔌 Documentação da API

Todas as rotas respondem em formato JSON desde `http://localhost:3000`. As rotas protegidas exigem o header `Authorization: Bearer <token>`.

| Método | Rota                     | Protegida | Descrição |
|--------|--------------------------|-----------|-----------|
| GET    | `/api/posts`             | ❌        | Lista as publicações publicadas (com autor e categoria) |
| GET    | `/api/posts/painel`      | ✅        | Posts do painel: o `autor` vê só os seus; editor/admin veem todos (incl. rascunhos) |
| GET    | `/api/posts/:id/painel`  | ✅        | Post individual para edição (autor do post, editor ou admin) |
| GET    | `/api/posts/:id`         | ❌        | Obtém uma publicação por ID |
| POST   | `/api/posts`             | ✅        | Cria uma publicação (body: `titulo`, `slug`, `conteudo`, `imagem_capa_url?`, `categoria_id?`, `status?`) |
| PUT    | `/api/posts/:id`         | ✅        | Atualiza uma publicação (autor do post, `editor` ou `admin`) |
| DELETE | `/api/posts/:id`         | ✅        | Exclue uma publicação (autor do post, `editor` ou `admin`) |
| GET    | `/api/personagens`       | ❌        | Lista todos os personagens ordenados por nome |
| GET    | `/api/personagens/:id`   | ❌        | Obtém um personagem por ID |
| POST   | `/api/personagens`       | ✅        | Cria um personagem (body: `nome`, `editora`, `descricao?`, `imagem_url?`) |
| PUT    | `/api/personagens/:id`   | ✅        | Atualiza um personagem |
| DELETE | `/api/personagens/:id`   | ✅        | Exclue um personagem (só admin) |
| POST   | `/api/register`          | ❌        | Registra um usuário (body: `nome`, `email`, `senha`). Sempre com rol `autor` |
| POST   | `/api/login`             | ❌        | Inicia sessão e devolve um token JWT (expira em 8 h) |
| GET    | `/api/usuarios`          | ✅        | Lista usuários do site (**só admin**) |
| POST   | `/api/usuarios`          | ✅        | Cria usuário com rol – body: `nome`, `email`, `senha`, `role` (**só admin**) |
| PUT    | `/api/usuarios/:id/role` | ✅        | Muda o rol de um usuário – body: `role` (**só admin**, não sobre si mesmo) |
| GET    | `/api/stats`             | ✅        | Dashboard de funcionamento (contadores de usuários, posts publicados/rascunhos, personagens, categorias, posts recentes) – **só admin** |
| GET    | `/api/usuarios/:id/dados`| ✅        | Acesso aos dados do usuário (LGPD Art. 18) – só o próprio usuário ou admin |
| DELETE | `/api/usuarios/:id`      | ✅        | Eliminação dos dados do usuário (LGPD Art. 18) – só o próprio usuário ou admin |
| POST   | `/api/chat`              | ✅        | Envia uma mensagem ao assistente IA (body: `mensagem`) |

### Middlewares de segurança aplicados à API
- `helmet()` – cabeçalhos HTTP seguros.
- CORS restrito a `http://localhost:3000`, `http://localhost:5500` e `http://127.0.0.1:5500`.
- Rate limiting global: **100 requisições / 15 min** por IP em `/api/`.
- Rate limiting de autenticação: **10 tentativas / 15 min** em `/api/login` e `/api/register`.
- Limite do corpo da requisição: **10 MB** (`express.json`).
- Tratamento global de erros com resposta JSON `500`.

---

## 🗄️ Base de dados

Esquema atual (ver `Mysql/UML-BD.txt`):

- **usuarios** – `id`, `nome`, `email`, `senha_hash`, `role`, `criado_em`
- **categorias** – `id`, `nome`, `slug`
- **posts** – `id`, `titulo`, `slug`, `conteudo`, `imagem_capa_url`, `autor_id` (FK), `categoria_id` (FK), `status` (`rascunho`/`publicado`), `criado_em`, `atualizado_em`
- **personagens** – `id`, `nome`, `editora`, `descricao`, `imagem_url`, `criado_em`, `atualizado_em` (criada pelo script `backend/criar-personagens.js`)

---

## ⚖️ Conformidade LGPD (Lei nº 13.709/2018)

| Área                     | Implementação |
|--------------------------|---------------|
| Consentimento            | Banner de cookies + checkbox obrigatório no registro (`cadastro.html`) |
| Transparência            | `privacidade.html` com política detalhada e identificação do Encarregado de Dados (DPO) |
| Direitos do titular      | `direitos.html` (Art. 18) + endpoints `GET/DELETE /api/usuarios/:id` |
| Segurança das senhas     | Hash com **bcrypt** (nunca em texto plano) |
| Segurança da API         | Helmet, CORS, rate limiting, JWT |
| Proteção contra XSS      | Uso de `textContent` na renderização de conteúdo dinâmico |
| Retenção de dados        | Política documentada em `privacidade.html` (seção 8) |

---

## 🗺️ Estado atual e próximos passos

### ✔️ Completado
- Frontend do blog com destaques estáticos e dinâmicos desde a API.
- Painel admin con CRUD de posts e personagens.
- Autenticação (registro/login) con JWT e bcrypt.
- API REST completa con proteção de rotas.
- Páginas de privacidade e direitos do titular.
- Catálogo de personagens con buscador.
- Integração con OpenAI (chat).

### 🔜 Pendente / em desenvolvimento
- Página `hqs.html` (Promoções de HQs) – ainda é um esqueleto sem conteúdo.
- Formulário de `direitos.html` – atualmente simula o envio; falta a ruta `POST /api/direitos` no backend.
- Buscador global funcional (a busca da Home ainda não consulta a API).
- Paginação de posts.
- Roles avançados (`editor`, `autor`, `admin`) com permissões diferenciadas no painel: **✅ implementado** (painels `escritor.html`, `editor.html`, `adm.html`)
- Publicação/despublicação de posts (estado `rascunho`/`publicado`): **✅ implementado** no formulário de posts
- Dashboard de funcionamento do site para admin (`/api/stats` + pestanha Estatísticas): **✅ implementado**
- Testes automatizados (`npm test` ainda não configurado).
- Deploy em produção (atualmente aponta a `http://localhost:3000`).

---

## 📜 Licencia

Projeto académico/educativo. Todos os direitos reservados – GeekBlog © 2026.

---

*Documentação gerada a partir da análise do estado atual do projeto (commit `506adc9`, branch `main`).*
