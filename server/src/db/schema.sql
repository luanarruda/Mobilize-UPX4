-- Modelo de dados do RotaCerta (SQLite: o banco é um único arquivo local).
-- Linhas, pontos, veículos, horários e histórico de posições
-- (seção 3.b da documentação: Banco de Dados).

DROP TABLE IF EXISTS posicoes;
DROP TABLE IF EXISTS horarios;
DROP TABLE IF EXISTS veiculos;
DROP TABLE IF EXISTS linha_pontos;
DROP TABLE IF EXISTS pontos;
DROP TABLE IF EXISTS linhas;

-- Uma linha de ônibus. O trajeto é um JSON com as coordenadas [lat, lng]
-- do percurso completo (ida + volta); é sempre lido inteiro.
CREATE TABLE linhas (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo    TEXT NOT NULL UNIQUE,
  nome      TEXT NOT NULL,
  cor       TEXT NOT NULL,                  -- cor no mapa, ex.: #1f6feb
  empresa   TEXT,
  trajeto   TEXT NOT NULL CHECK (json_valid(trajeto))
);

-- Ponto de parada. "acessivel" atende ao RF07. SQLite não tem BOOLEAN:
-- usamos INTEGER 0/1 com CHECK para não aceitar outros valores.
CREATE TABLE pontos (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  nome      TEXT NOT NULL,
  lat       REAL NOT NULL,
  lng       REAL NOT NULL,
  acessivel INTEGER NOT NULL DEFAULT 0 CHECK (acessivel IN (0, 1)),
  coberto   INTEGER NOT NULL DEFAULT 0 CHECK (coberto IN (0, 1))
);

-- Ligação N:N entre linhas e pontos, com a ordem no itinerário.
-- distancia_m = metros do início do trajeto até o ponto; é a base
-- do cálculo de previsão de chegada (RF02).
CREATE TABLE linha_pontos (
  linha_id    INTEGER NOT NULL REFERENCES linhas(id) ON DELETE CASCADE,
  ordem       INTEGER NOT NULL,
  ponto_id    INTEGER NOT NULL REFERENCES pontos(id) ON DELETE CASCADE,
  sentido     TEXT NOT NULL CHECK (sentido IN ('ida', 'volta')),
  distancia_m REAL NOT NULL,
  PRIMARY KEY (linha_id, ordem)
);
CREATE INDEX idx_linha_pontos_ponto ON linha_pontos(ponto_id);

CREATE TABLE veiculos (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  prefixo   TEXT NOT NULL UNIQUE,            -- número pintado no ônibus
  linha_id  INTEGER REFERENCES linhas(id) ON DELETE SET NULL,
  acessivel INTEGER NOT NULL DEFAULT 1 CHECK (acessivel IN (0, 1))
);

-- Horários programados de saída do terminal inicial (RF03). "HH:MM".
CREATE TABLE horarios (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  linha_id  INTEGER NOT NULL REFERENCES linhas(id) ON DELETE CASCADE,
  tipo_dia  TEXT NOT NULL CHECK (tipo_dia IN ('util', 'sabado', 'domingo')),
  saida     TEXT NOT NULL CHECK (saida GLOB '[0-2][0-9]:[0-5][0-9]')
);
CREATE INDEX idx_horarios_linha ON horarios(linha_id, tipo_dia, saida);

-- Histórico de posições (amostrado a cada 30 s) para medir, no futuro,
-- a precisão da previsão (indicador de sucesso, seção 8).
CREATE TABLE posicoes (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  veiculo_id     INTEGER NOT NULL REFERENCES veiculos(id) ON DELETE CASCADE,
  lat            REAL NOT NULL,
  lng            REAL NOT NULL,
  velocidade_kmh REAL,
  registrado_em  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_posicoes_veiculo_tempo ON posicoes(veiculo_id, registrado_em DESC);
