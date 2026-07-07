# JRC · Painel de Ranking de Vendas

Painel comercial em tempo real para exibição em TVs, desktops e celulares, mostrando o ranking de vendas dos coordenadores da JRC, a disputa entre as equipes/imobiliárias parceiras e o desempenho de cada empreendimento. Construído com Node.js + Express + Socket.io no backend e HTML/CSS/JavaScript puro no frontend.

## Sumário

- [Stack utilizada](#stack-utilizada)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Instalação e execução local](#instalação-e-execução-local)
- [Login do painel administrativo](#login-do-painel-administrativo)
- [Banco de dados](#banco-de-dados)
- [Como editar os dados](#como-editar-os-dados)
- [API REST](#api-rest)
- [Tempo real (Socket.io)](#tempo-real-socketio)
- [Sobre os dados iniciais](#sobre-os-dados-iniciais)
- [Deploy em produção](#deploy-em-produção)
- [Exibindo em uma TV](#exibindo-em-uma-tv)

## Stack utilizada

| Camada    | Tecnologia |
|-----------|------------|
| Frontend  | HTML5, CSS3 (sem frameworks), JavaScript puro |
| Backend   | Node.js + Express |
| Banco     | SQLite via módulo nativo `node:sqlite` (zero dependências, zero compilação) |
| Tempo real| Socket.io (com fallback automático para polling a cada 5s) |

> **Por que SQLite e não PostgreSQL por padrão?** O briefing permite qualquer uma das duas opções. Optamos por SQLite através do módulo nativo `node:sqlite` (disponível a partir do Node 22.5) para que o projeto rode imediatamente após `npm install`, sem exigir instalação/configuração de um servidor de banco separado. O schema completo em PostgreSQL está pronto em [`database/database.sql`](database/database.sql) e o guia de migração está na seção [Deploy em produção](#deploy-em-produção).

## Estrutura do projeto

```
jrc-ranking-vendas/
├── backend/
│   ├── server.js              # ponto de entrada (Express + Socket.io)
│   ├── config/db.js           # conexão com o banco (node:sqlite)
│   ├── controllers/           # lógica de cada recurso da API
│   ├── models/                # acesso a dados (queries)
│   ├── routes/                # definição das rotas REST
│   ├── middleware/auth.js     # proteção das rotas administrativas
│   ├── sockets/index.js       # configuração do Socket.io
│   ├── database/init.js       # criação das tabelas
│   ├── database/seed.js       # dados iniciais de demonstração
│   └── utils/hash.js          # hash de senha
├── frontend/
│   ├── index.html             # painel principal (TV / dashboard)
│   ├── admin.html             # painel administrativo
│   ├── css/style.css          # estilo do painel principal
│   ├── css/admin.css          # estilo do painel administrativo
│   ├── js/dashboard.js        # tempo real + renderização do painel
│   ├── js/admin.js            # CRUD + login do admin
│   └── assets/logo-jrc.svg
├── database/
│   ├── database.sql           # schema de referência em PostgreSQL
│   └── jrc_ranking.db         # arquivo SQLite (criado automaticamente)
├── package.json
├── .env.example
└── README.md
```

## Instalação e execução local

**Pré-requisito:** Node.js **22.5 ou superior** (o projeto usa o módulo nativo `node:sqlite`, que não existe em versões mais antigas). Verifique com `node -v`.

```bash
# 1. Entre na pasta do projeto
cd jrc-ranking-vendas

# 2. Instale as dependências (rápido — sem compilação nativa)
npm install

# 3. Copie o arquivo de variáveis de ambiente (opcional, já há valores padrão)
cp .env.example .env

# 4. Inicie o servidor
npm start
```

Ao iniciar, o servidor automaticamente cria o banco SQLite em `database/jrc_ranking.db` e o popula com dados de demonstração (na primeira execução apenas).

Acesse:

- **Painel principal (TV/dashboard):** http://localhost:3000
- **Painel administrativo:** http://localhost:3000/admin
- **API:** http://localhost:3000/api/dashboard

Para desenvolvimento com reinício automático ao salvar arquivos:

```bash
npm run dev
```

## Login do painel administrativo

Usuário de demonstração criado pelo seed:

```
Login: admin
Senha: jrc2026
```

Altere essa senha (ou crie novos usuários) diretamente na tabela `usuarios` do banco — não há tela de gestão de usuários no MVP, apenas login.

## Banco de dados

O schema conceitual (tabelas `equipes`, `coordenadores`, `empreendimentos`, `vendas`, `usuarios`) está documentado e comentado em [`database/database.sql`](database/database.sql), incluindo os `CREATE TABLE`, índices, chaves estrangeiras e o `INSERT` inicial das equipes/empreendimentos. Esse arquivo é a referência para quem for rodar em PostgreSQL.

Em desenvolvimento local, o mesmo schema é criado automaticamente em SQLite por `backend/database/init.js`, e populado por `backend/database/seed.js`.

Para **resetar o banco** (apagar tudo e recomeçar do zero com os dados de demonstração):

```bash
rm database/jrc_ranking.db database/jrc_ranking.db-*
npm start
```

## Como editar os dados

Há três formas de alterar os dados exibidos no painel:

1. **Painel administrativo (recomendado):** acesse `/admin`, faça login e cadastre/edite/exclua vendas, coordenadores, equipes e empreendimentos pela interface. Toda alteração reflete instantaneamente no painel principal.
2. **Editando o seed:** abra `backend/database/seed.js` e altere as listas de `coordenadores`, `empreendimentos` (nomes, faixas de valor, metas) ou os parâmetros de geração de vendas fictícias. Apague o arquivo `.db` e rode `npm start` novamente para recriar o banco com os novos dados.
3. **Direto na API:** todos os endpoints de escrita (`POST`/`PUT`/`DELETE`) aceitam JSON e podem ser chamados via `curl`, Postman/Insomnia etc. (veja a seção [API REST](#api-rest)).

## API REST

Todas as rotas abaixo respondem em JSON e estão prefixadas com `/api`. Rotas de escrita (`POST`/`PUT`/`DELETE`, exceto login) exigem o header `Authorization: Bearer <token>` obtido em `/api/auth/login`.

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/ranking` | Ranking de coordenadores |
| GET | `/api/coordenadores` | Lista coordenadores |
| POST | `/api/coordenadores` | Cria coordenador *(autenticado)* |
| PUT | `/api/coordenadores/:id` | Edita coordenador *(autenticado)* |
| DELETE | `/api/coordenadores/:id` | Desativa coordenador *(autenticado)* |
| GET | `/api/equipes` | Lista equipes/imobiliárias |
| POST/PUT/DELETE | `/api/equipes[/:id]` | CRUD de equipes *(autenticado)* |
| GET | `/api/empreendimentos` | Lista empreendimentos |
| POST/PUT/DELETE | `/api/empreendimentos[/:id]` | CRUD de empreendimentos *(autenticado)* |
| GET | `/api/vendas` | Lista vendas (aceita `?busca=&coordenador_id=&equipe_id=&empreendimento_id=&data_inicio=&data_fim=`) |
| GET | `/api/ultimas-vendas` ou `/api/vendas/ultimas` | Últimas vendas (`?limite=10`) |
| POST | `/api/venda` ou `/api/vendas` | Cadastra venda *(autenticado)* |
| PUT | `/api/venda/:id` ou `/api/vendas/:id` | Edita venda *(autenticado)* |
| DELETE | `/api/venda/:id` ou `/api/vendas/:id` | Exclui venda *(autenticado)* |
| GET | `/api/dashboard` | Payload completo do painel (resumo + ranking + disputa + empreendimentos) |
| GET | `/api/dashboard/disputa-equipes` | Disputa entre as duas equipes em destaque |
| GET | `/api/dashboard/ranking-empreendimentos` | Ranking de empreendimentos |
| POST | `/api/auth/login` | Login (`{ "login": "...", "senha": "..." }`) → retorna `token` |
| POST | `/api/auth/logout` | Invalida o token atual |

## Tempo real (Socket.io)

O painel principal conecta via Socket.io e recebe o evento `dashboard:atualizar` sempre que uma venda (ou cadastro de coordenador/equipe/empreendimento) é criada, editada ou excluída — o ranking, a disputa e as barras de progresso são animados automaticamente, sem recarregar a página. Um evento adicional `venda:nova` dispara um toast de celebração no canto da tela.

Caso a conexão via socket caia (rede instável, proxy bloqueando WebSocket etc.), o painel detecta automaticamente e passa a atualizar via **polling a cada 5 segundos**, voltando ao tempo real assim que a conexão for restabelecida — sem necessidade de recarregar a página.

## Sobre os dados iniciais

Os nomes dos empreendimentos (**Vista 289, Olympea Residence, Hublot Higienópolis, Corum Residence, Gate Residence**) e as faixas de valores usadas na geração de vendas de demonstração foram extraídos dos espelhos de vendas da JRC anexados ao projeto. As tabelas anexadas são **tabelas de preço/estoque de unidades**, não um histórico de vendas por coordenador — como essa informação não existia nos anexos, os **coordenadores, as equipes e o histórico de 54 vendas de julho/26 são dados fictícios gerados apenas para demonstrar o painel em funcionamento**, prontos para serem substituídos pelos dados reais via painel administrativo.

As duas equipes/imobiliárias cadastradas na disputa (**Empreendimentos Rio Preto** vs **Renascer & Jales JK**) seguem exatamente os nomes pedidos no briefing.

## Deploy em produção

### Opção A — manter SQLite
Funciona bem para um painel interno de uma única empresa/instância:
1. `npm install --omit=dev` no servidor.
2. Configure `.env` com `PORT` e `SESSION_SECRET` de produção.
3. Use um gerenciador de processos como [PM2](https://pm2.keymetrics.io/) (`pm2 start backend/server.js --name jrc-ranking`) para manter o servidor no ar e reiniciar automaticamente.
4. Coloque um proxy reverso (Nginx/Caddy) na frente para TLS (HTTPS) e domínio próprio.
5. Faça backup periódico do arquivo `database/jrc_ranking.db`.

### Opção B — migrar para PostgreSQL
1. Rode `database/database.sql` em um banco Postgres (`psql -d jrc_ranking -f database/database.sql`).
2. Instale um driver Postgres (`npm install pg`) e crie um novo `backend/config/db.postgres.js` implementando os mesmos métodos usados pelos models (`prepare().run()/get()/all()`) — ou reescreva os models em `backend/models/` para usar `pg` diretamente com SQL assíncrono.
3. Ajuste `.env` com `DB_CLIENT=postgres` e as credenciais `PG_*`.
4. Como o restante da aplicação (controllers, rotas, sockets, frontend) não depende do SQLite diretamente, a migração fica isolada à camada de acesso a dados.

## Exibindo em uma TV

1. Abra `http://<ip-do-servidor>:3000` no navegador da Smart TV, um mini-PC conectado à TV, ou um Chromecast com um navegador em modo kiosk.
2. Ative o modo tela cheia (F11 na maioria dos navegadores).
3. O layout é responsivo e se adapta automaticamente a TVs Full HD, 4K, desktops, tablets e celulares — o mesmo endereço pode ser aberto em qualquer dispositivo da rede.
