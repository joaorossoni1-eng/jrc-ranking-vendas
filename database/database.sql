-- ============================================================================
-- JRC RANKING DE VENDAS — SCHEMA DE BANCO DE DADOS
-- ============================================================================
-- Este script cria a estrutura completa do banco em PostgreSQL.
-- O projeto roda "out of the box" com SQLite (zero configuração — veja
-- backend/database/init.js), mas este arquivo é a referência oficial do
-- schema para quem for migrar para PostgreSQL em produção.
--
-- Para aplicar em um Postgres local:
--   createdb jrc_ranking
--   psql -d jrc_ranking -f database/database.sql
-- ============================================================================

-- Extensão para gerar timestamps padronizados (opcional, mas recomendada)
-- CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DROP TABLE IF EXISTS vendas CASCADE;
DROP TABLE IF EXISTS coordenadores CASCADE;
DROP TABLE IF EXISTS empreendimentos CASCADE;
DROP TABLE IF EXISTS equipes CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;

-- ----------------------------------------------------------------------------
-- Tabela: equipes
-- Representa as equipes/imobiliárias parceiras que disputam o ranking
-- (ex.: "Empreendimentos Rio Preto" vs "Renascer & Jales JK")
-- ----------------------------------------------------------------------------
CREATE TABLE equipes (
    id          SERIAL PRIMARY KEY,
    nome        VARCHAR(120) NOT NULL UNIQUE,
    cor         VARCHAR(7)   NOT NULL DEFAULT '#0B1E3D', -- cor de destaque (hex) usada no painel
    logo        VARCHAR(255),                             -- caminho/URL do logo (opcional)
    ativo       BOOLEAN      NOT NULL DEFAULT TRUE,
    criado_em   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- Tabela: coordenadores
-- ----------------------------------------------------------------------------
CREATE TABLE coordenadores (
    id          SERIAL PRIMARY KEY,
    nome        VARCHAR(120) NOT NULL,
    foto        VARCHAR(255),                              -- URL/caminho da foto (opcional)
    equipe_id   INTEGER      NOT NULL REFERENCES equipes(id) ON DELETE RESTRICT,
    ativo       BOOLEAN      NOT NULL DEFAULT TRUE,
    criado_em   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_coordenadores_equipe ON coordenadores(equipe_id);

-- ----------------------------------------------------------------------------
-- Tabela: empreendimentos
-- ----------------------------------------------------------------------------
CREATE TABLE empreendimentos (
    id            SERIAL PRIMARY KEY,
    nome          VARCHAR(150) NOT NULL UNIQUE,
    imagem        VARCHAR(255),                            -- URL/caminho de imagem de capa (opcional)
    meta_vendas   INTEGER      NOT NULL DEFAULT 0,          -- meta de unidades para a barra de progresso
    ativo         BOOLEAN      NOT NULL DEFAULT TRUE,
    criado_em     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- Tabela: usuarios (login do painel administrativo)
-- ----------------------------------------------------------------------------
CREATE TABLE usuarios (
    id           SERIAL PRIMARY KEY,
    login        VARCHAR(60)  NOT NULL UNIQUE,
    senha_hash   VARCHAR(255) NOT NULL,   -- hash SHA-256 (ver backend/utils/hash.js)
    nome         VARCHAR(120) NOT NULL,
    perfil       VARCHAR(20)  NOT NULL DEFAULT 'admin', -- admin | operador
    ativo        BOOLEAN      NOT NULL DEFAULT TRUE,
    criado_em    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- Tabela: vendas
-- ----------------------------------------------------------------------------
CREATE TABLE vendas (
    id                 SERIAL PRIMARY KEY,
    coordenador_id     INTEGER      NOT NULL REFERENCES coordenadores(id)   ON DELETE RESTRICT,
    equipe_id          INTEGER      NOT NULL REFERENCES equipes(id)        ON DELETE RESTRICT,
    empreendimento_id  INTEGER      NOT NULL REFERENCES empreendimentos(id) ON DELETE RESTRICT,
    unidade            VARCHAR(30)  NOT NULL,
    valor              NUMERIC(14,2) NOT NULL DEFAULT 0,
    data_venda         DATE         NOT NULL,
    hora_venda         TIME         NOT NULL DEFAULT CURRENT_TIME,
    observacoes        VARCHAR(255),
    criado_em          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_vendas_coordenador    ON vendas(coordenador_id);
CREATE INDEX idx_vendas_equipe         ON vendas(equipe_id);
CREATE INDEX idx_vendas_empreendimento ON vendas(empreendimento_id);
CREATE INDEX idx_vendas_data           ON vendas(data_venda);

-- ============================================================================
-- DADOS INICIAIS (seed mínimo) — dados completos de demonstração ficam em
-- backend/database/seed.js, gerados automaticamente na primeira execução.
-- ============================================================================

INSERT INTO equipes (nome, cor) VALUES
  ('Empreendimentos Rio Preto', '#0B1E3D'),
  ('Renascer & Jales JK',       '#C9A227');

INSERT INTO empreendimentos (nome, meta_vendas) VALUES
  ('Vista 289',           40),
  ('Olympea Residence',   30),
  ('Hublot Higienópolis', 25),
  ('Corum Residence',     35),
  ('Gate Residence',      20);

-- Usuário administrador padrão (login: admin / senha: jrc2026)
-- Hash SHA-256 de "jrc2026"
INSERT INTO usuarios (login, senha_hash, nome, perfil) VALUES
  ('admin', '5eba24fb3fbde12287d79b408d4d31008c0cefff44d756c3b21917b44777900f', 'Administrador JRC', 'admin');
