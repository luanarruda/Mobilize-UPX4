# RotaCerta

Aplicação web de acompanhamento do transporte público em tempo real. Projeto Interdisciplinar, Facens (ADS), **Grupo Mobilize**, tema *Mobilidade e Urbanização*.

## Como rodar

Pré-requisitos: **Node.js 20+** e **Docker** (ou um PostgreSQL 16 instalado).

```bash
# 1. Instalar as dependências de todo o projeto (front e back de uma vez)
npm install

# 2. Subir o banco de dados PostgreSQL em um contêiner
docker compose up -d

# 3. Criar o arquivo de configuração do back-end a partir do modelo
cp server/.env.example server/.env

# 4. Criar as tabelas e carregar os dados de demonstração (APAGA o banco!)
npm run db:setup

# 5. Rodar API (porta 3333) e site (porta 5173) juntos
npm run dev
```

Abra **http://localhost:5173**.

| Comando | O que faz |
|---|---|
| `npm install` | Lê os `package.json` da raiz, de `server/` e de `web/` (npm *workspaces*) e instala tudo em uma pasta `node_modules` compartilhada. |
| `docker compose up -d` | Lê o `docker-compose.yml` e sobe o PostgreSQL 16 em segundo plano (`-d`). Os dados ficam no volume `dados-pg` e sobrevivem a reinícios. |
| `npm run db:setup` | Executa `server/src/db/setup.ts`: roda o `schema.sql` (recria as tabelas) e insere linhas, pontos, horários e veículos de demonstração, tudo em uma transação. |
| `npm run dev` | Usa o `concurrently` para rodar `tsx watch` (API) e `vite` (site) no mesmo terminal; os dois recarregam sozinhos quando um arquivo muda. |

Variáveis do `server/.env`: veja os comentários em `server/.env.example`. Para apresentações, `SIMULADOR_VELOCIDADE=5` deixa os ônibus 5× mais rápidos.

## Estrutura

```
rotacerta/
├── server/                 API Node.js + TypeScript
│   └── src/
│       ├── db/             schema.sql, dados de demonstração, setup
│       ├── realtime/       simulador, estado da frota, WebSocket
│       ├── routes/         rotas REST (/api/linhas, /api/pontos…)
│       ├── geo.ts          cálculos geográficos (Haversine, interpolação)
│       └── index.ts        ponto de entrada
└── web/                    Site React + TypeScript (Vite)
    └── src/
        ├── componentes/    Layout, mapa, barra de acessibilidade
        ├── contexto/       preferências de acessibilidade
        ├── hooks/          usePosicoes (WebSocket)
        └── paginas/        telas
```

## API

| Método | Rota | Retorna |
|---|---|---|
| GET | `/api/saude` | Status do servidor |
| GET | `/api/linhas` | Lista de linhas |
| GET | `/api/linhas/:id` | Linha com trajeto e pontos em ordem |
| GET | `/api/linhas/:id/veiculos` | Posições atuais dos ônibus da linha |
| GET | `/api/pontos` | Pontos de parada e linhas que passam em cada um |
| GET | `/api/veiculos` | Posições atuais de todos os ônibus |
| WS | `/ws` | Mensagens `{ tipo: "posicoes", dados: [...] }` a cada 2 s |

## Por que cada escolha técnica

**TypeScript nos dois lados.** O front e o back trocam os mesmos formatos de dados (linha, ponto, posição). Com tipos, se alguém muda um campo no back-end, o editor aponta onde o front quebrou antes de rodar. Para um grupo de seis pessoas mexendo no mesmo código, isso evita muitos bugs de integração.

**PostgreSQL.** Os dados são relacionais por natureza: uma linha tem vários pontos, um ponto atende várias linhas (relação N:N, resolvida pela tabela `linha_pontos`), um veículo pertence a uma linha. Chaves estrangeiras garantem que não exista, por exemplo, um horário de uma linha apagada. O trajeto fica em `JSONB` porque é sempre lido inteiro e nunca filtrado por dentro.

**WebSocket em vez de *polling*.** No *polling*, o navegador pergunta ao servidor "tem novidade?" a cada poucos segundos, mesmo quando não tem. No WebSocket a conexão fica aberta e o **servidor empurra** as posições quando mudam: menos requisições e atualização imediata. Se a conexão cair, o `usePosicoes` tenta de novo com espera crescente (1 s, 2 s, 4 s… até 30 s) para não sobrecarregar o servidor quando ele volta (*exponential backoff*).

**Leaflet + OpenStreetMap.** São gratuitos e não exigem chave de API, o que preserva a reserva de R$ 300 de mapas do orçamento (seção 6 da documentação).

**Simulador de frota atrás de uma interface.** A Urbes não publica posições em tempo real abertas. O simulador implementa a interface `ProvedorPosicoes`. Quando houver uma fonte real (SPTrans, ou dados cedidos por parceiros na Fase 1), basta criar outro provedor com a mesma interface: API e front não mudam. Isso aplica a estratégia de risco da seção 5 da documentação.

**Como o simulador move um ônibus.** Cada linha tem o trajeto como lista de coordenadas. Calculamos uma vez a **distância acumulada** até cada vértice (com a fórmula de Haversine, que considera a curvatura da Terra). O estado de um ônibus é só "quantos metros já andei no trajeto". A cada 2 s ele avança `velocidade × tempo`. Para achar a coordenada, uma **busca binária** encontra o trecho certo (O(log n)) e interpola dentro dele. Ao chegar num ponto, ele para de 15 a 40 s. Guardar a posição como distância no trajeto também facilita a previsão de chegada (Etapa 2): basta subtrair a distância do ônibus da distância do ponto.

**Histórico amostrado.** As posições mudam a cada 2 s, mas só gravamos no banco a cada 30 s, em um único `INSERT` com várias linhas. Gravar tudo encheria o banco sem ganho; a amostra basta para medir a precisão da previsão (indicador de sucesso da seção 8).

**Acessibilidade (RF07) desde a fundação.** Ela foi pensada para a persona Helena:
- fonte base de 18 px e dois níveis de ampliação;
- modo de alto contraste, que também liga sozinho se o sistema operacional pedir;
- foco de teclado sempre visível e link "pular para o conteúdo";
- uma **tabela em texto** com as mesmas informações do mapa, porque mapas não são lidos por leitores de tela;
- status da conexão anunciado com `aria-live`;
- animações desligadas para quem ativou "reduzir movimento" no sistema.

## Dados de demonstração

As linhas `100`, `201`, `302`, `405`, `510` e `BRT1` são **fictícias**, montadas sobre locais reais de Sorocaba com coordenadas aproximadas e trajetos em linha reta. Elas não correspondem às linhas oficiais da Urbes.

## Roteiro

- [x] **Etapa 1:** fundação, mapa em tempo real (RF01), base de acessibilidade (RF07)
- [ ] Etapa 2: previsão de chegada (RF02), consulta de linhas e horários (RF03)
- [ ] Etapa 3: planejador de trajetos com baldeação (RF04)
- [ ] Etapa 4: notificações (RF05), favoritos (RF06), cadastro e login (RF08)
- [ ] Etapa 5: lotação colaborativa (RF09), feedback (RF10), impressão de horários (RF11)
- [ ] Etapa 6: dados reais (SPTrans Olho Vivo), testes e documentação final
