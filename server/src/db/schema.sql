-- Modelo de dados do RotaCerta.
-- Linhas, pontos, veículos, horários e histórico de posições
-- (seção 3.b da documentação: Banco de Dados).

DROP TABLE IF EXISTS posicoes, horarios, veiculos, linha_pontos, pontos, linhas CASCADE;

-- Uma linha de ônibus. O trajeto é a sequência de coordenadas [lat, lng]
-- do percurso completo (ida + volta), guardado em JSONB porque é sempre lido inteiro.
CREATE TABLE linhas (
  id        SERIAL PRIMARY KEY,
  codigo    VARCHAR(10)  NOT NULL UNIQUE,
  nome      VARCHAR(120) NOT NULL,
  cor       CHAR(7)      NOT NULL,           -- cor no mapa, ex.: #1f6feb
  empresa   VARCHAR(80),
  trajeto   JSONB        NOT NULL
);

-- Ponto de parada. "acessivel" atende ao RF07 (indicar pontos acessíveis).
CREATE TABLE pontos (
  id        SERIAL PRIMARY KEY,
  nome      VARCHAR(120)     NOT NULL,
  lat       DOUBLE PRECISION NOT NULL,
  lng       DOUBLE PRECISION NOT NULL,
  acessivel BOOLEAN          NOT NULL DEFAULT FALSE,
  coberto   BOOLEAN          NOT NULL DEFAULT FALSE
);

-- Tabela de ligação N:N entre linhas e pontos, com a ordem no itinerário.
-- distancia_m = quantos metros do início do trajeto até o ponto; é a base
-- do cálculo de previsão de chegada (RF02).
CREATE TABLE linha_pontos (
  linha_id    INT REFERENCES linhas(id) ON DELETE CASCADE,
  ordem       INT NOT NULL,
  ponto_id    INT NOT NULL REFERENCES pontos(id) ON DELETE CASCADE,
  sentido     VARCHAR(5) NOT NULL CHECK (sentido IN ('ida', 'volta')),
  distancia_m DOUBLE PRECISION NOT NULL,
  PRIMARY KEY (linha_id, ordem)
);
CREATE INDEX idx_linha_pontos_ponto ON linha_pontos(ponto_id);

CREATE TABLE veiculos (
  id        SERIAL PRIMARY KEY,
  prefixo   VARCHAR(10) NOT NULL UNIQUE,     -- número pintado no ônibus
  linha_id  INT REFERENCES linhas(id) ON DELETE SET NULL,
  acessivel BOOLEAN NOT NULL DEFAULT TRUE    -- elevador/rampa (RF07)
);

-- Horários programados de saída do terminal inicial (RF03).
CREATE TABLE horarios (
  id        SERIAL PRIMARY KEY,
  linha_id  INT NOT NULL REFERENCES linhas(id) ON DELETE CASCADE,
  tipo_dia  VARCHAR(7) NOT NULL CHECK (tipo_dia IN ('util', 'sabado', 'domingo')),
  saida     TIME NOT NULL
);
CREATE INDEX idx_horarios_linha ON horarios(linha_id, tipo_dia, saida);

-- Histórico de posições (amostrado, não a cada atualização) para análises
-- futuras, como medir a precisão da previsão (indicador de sucesso, seção 8).
CREATE TABLE posicoes (
  id             BIGSERIAL PRIMARY KEY,
  veiculo_id     INT NOT NULL REFERENCES veiculos(id) ON DELETE CASCADE,
  lat            DOUBLE PRECISION NOT NULL,
  lng            DOUBLE PRECISION NOT NULL,
  velocidade_kmh REAL,
  registrado_em  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_posicoes_veiculo_tempo ON posicoes(veiculo_id, registrado_em DESC);
