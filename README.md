# RotaCerta

Aplicação web de acompanhamento do transporte público em tempo real. Projeto Interdisciplinar, Facens (ADS), **Grupo Mobilize**, tema *Mobilidade e Urbanização*.

## Como rodar

Pré-requisito: **Node.js 22.13 ou mais novo** (recomendado: a versão LTS mais recente em [nodejs.org](https://nodejs.org)). Não é preciso instalar banco de dados nem Docker.

```bash
npm install
npm run dev
```

Abra **http://localhost:5173**.

| Comando | O que faz |
|---|---|
| `node -v` | Mostra a versão do Node instalada. Precisa ser 22.13 ou maior, porque o banco usa o módulo `node:sqlite`, que vem embutido no Node a partir dessa versão. |
| `npm install` | Lê os `package.json` da raiz, de `server/` e de `web/` (npm *workspaces*) e instala tudo em uma pasta `node_modules` compartilhada. Só é preciso rodar de novo quando alguém adicionar uma dependência. |
| `npm run dev` | Sobe a API (porta 3333) e o site (porta 5173) juntos com o `concurrently`. Os dois recarregam sozinhos quando um arquivo muda. Na primeira vez, cria o banco `server/dados/rotacerta.db` com os dados de demonstração. |
| `npm run db:reset` | Apaga o arquivo do banco. No próximo `npm run dev` ele é recriado do zero. Use quando mudar o `schema.sql` ou os dados de demonstração. |
| `npm test` | Roda os testes automáticos do back-end (Vitest). |

Configuração opcional: copie `server/.env.example` para `server/.env` e altere o que quiser. Para apresentações, `SIMULADOR_VELOCIDADE=5` deixa os ônibus 5× mais rápidos.

## Estrutura

```
rotacerta/
├── server/                 API Node.js + TypeScript
│   ├── dados/              arquivo do banco SQLite (gerado, fora do Git)
│   └── src/
│       ├── db/             schema.sql, dados de demonstração, conexão
│       ├── realtime/       simulador, estado da frota, WebSocket
│       ├── routes/         rotas REST (/api/linhas, /api/pontos…)
│       ├── services/       catálogo da rede, previsão de chegada, fuso horário
│       ├── geo.ts          cálculos geográficos (Haversine, interpolação)
│       └── index.ts        ponto de entrada
└── web/                    Site React + TypeScript (Vite)
    └── src/
        ├── componentes/    Layout, mapa, barra de acessibilidade
        ├── contexto/       preferências de acessibilidade
        ├── hooks/          usePosicoes (WebSocket)
        └── paginas/        Mapa, Linhas, Linha, Ponto
```

## Telas

| Endereço | Funcionalidade |
|---|---|
| `/` | Mapa ao vivo com todas as linhas e ônibus (RF01) |
| `/linhas` | Busca de linhas e pontos por número, nome ou bairro (RF03) |
| `/linhas/:id` | Itinerário nos dois sentidos, próximas saídas, quadro de horários e mapa da linha (RF03) |
| `/pontos/:id` | Previsão de chegada de todas as linhas que passam no ponto (RF02) |

## API

| Método | Rota | Retorna |
|---|---|---|
| GET | `/api/saude` | Status do servidor |
| GET | `/api/linhas` | Lista de linhas (com nomes dos pontos, para a busca) |
| GET | `/api/linhas/:id` | Linha com trajeto, destinos e pontos em ordem |
| GET | `/api/linhas/:id/horarios` | Horários de dia útil, sábado e domingo, e o tipo de dia de hoje |
| GET | `/api/linhas/:id/veiculos` | Posições atuais dos ônibus da linha |
| GET | `/api/pontos` | Pontos de parada e linhas que passam em cada um |
| GET | `/api/pontos/:id` | Um ponto e as linhas que o atendem |
| GET | `/api/pontos/:id/previsoes` | Próximas chegadas por linha e sentido |
| GET | `/api/veiculos` | Posições atuais de todos os ônibus |
| WS | `/ws` | Mensagens `{ tipo: "posicoes", dados: [...] }` a cada 2 s |

## Por que cada escolha técnica

### Fundação (Etapa 1)

**TypeScript nos dois lados.** O front e o back trocam os mesmos formatos de dados (linha, ponto, posição). Com tipos, se alguém muda um campo no back-end, o editor aponta onde o front quebrou antes de rodar. Para um grupo de seis pessoas mexendo no mesmo código, isso evita muitos bugs de integração.

**SQLite: banco local em um arquivo.** O projeto não tem servidor de banco de dados. O SQLite guarda o banco inteiro em um arquivo (`server/dados/rotacerta.db`) e já vem embutido no Node (`node:sqlite`), então não há nada para instalar. Mesmo assim, é um banco relacional de verdade, com SQL, tabelas, chaves estrangeiras e índices, o que atende à disciplina de Banco de Dados. Três detalhes do SQLite tratados no código:
- **Chaves estrangeiras vêm desligadas por padrão**, por compatibilidade com versões antigas. Ligamos com `PRAGMA foreign_keys = ON`; sem isso, o banco aceitaria um horário de uma linha que não existe.
- **Não existe tipo BOOLEAN.** Usamos `INTEGER` com `CHECK (acessivel IN (0, 1))` e convertemos para `true`/`false` ao ler.
- **Modo WAL** (`PRAGMA journal_mode = WAL`): leituras não ficam esperando enquanto o histórico de posições é gravado.

Se no futuro houver um servidor (Fase 3, expansão), o `schema.sql` migra para PostgreSQL com poucas mudanças.

**Modelo relacional.** Uma linha tem vários pontos e um ponto atende várias linhas: é uma relação N:N, resolvida pela tabela `linha_pontos`, que guarda também a ordem e o sentido. O trajeto fica como JSON numa coluna de texto porque é sempre lido inteiro e nunca filtrado por dentro; o `CHECK (json_valid(trajeto))` impede gravar um JSON quebrado.

**WebSocket em vez de *polling*.** No *polling*, o navegador pergunta ao servidor "tem novidade?" a cada poucos segundos, mesmo quando não tem. No WebSocket a conexão fica aberta e o **servidor empurra** as posições quando mudam: menos requisições e atualização imediata. Se a conexão cair, o `usePosicoes` tenta de novo com espera crescente (1 s, 2 s, 4 s… até 30 s) para não sobrecarregar o servidor quando ele volta (*exponential backoff*).

**Leaflet + OpenStreetMap.** São gratuitos e não exigem chave de API, o que preserva a reserva de R$ 300 de mapas do orçamento (seção 6 da documentação).

**Simulador de frota atrás de uma interface.** A Urbes não publica posições em tempo real abertas. O simulador implementa a interface `ProvedorPosicoes`. Quando houver uma fonte real, basta criar outro provedor com a mesma interface: API e front não mudam. Isso aplica a estratégia de risco da seção 5 da documentação.

**Como o simulador move um ônibus.** Cada linha tem o trajeto como lista de coordenadas. Calculamos uma vez a **distância acumulada** até cada vértice (com a fórmula de Haversine, que considera a curvatura da Terra). O estado de um ônibus é só "quantos metros já andei no trajeto". A cada 2 s ele avança `velocidade × tempo`. Para achar a coordenada, uma **busca binária** encontra o trecho certo (O(log n)) e interpola dentro dele. Ao chegar num ponto, ele para de 15 a 40 s.

**Histórico amostrado.** As posições mudam a cada 2 s, mas só gravamos no banco a cada 30 s, num lote dentro de uma transação. O SQLite grava no disco uma vez por transação, então um lote de 18 ônibus custa quase o mesmo que um só. Registros com mais de 7 dias são apagados. A amostra basta para medir a precisão da previsão (indicador de sucesso da seção 8).

**Acessibilidade (RF07) desde a fundação.** Ela foi pensada para a persona Helena:
- fonte base de 18 px e dois níveis de ampliação;
- modo de alto contraste, que também liga sozinho se o sistema operacional pedir;
- foco de teclado sempre visível e link "pular para o conteúdo";
- uma **tabela em texto** com as mesmas informações do mapa, porque mapas não são lidos por leitores de tela;
- status da conexão anunciado com `aria-live`;
- animações desligadas para quem ativou "reduzir movimento" no sistema.

### Previsão de chegada e consulta (Etapa 2)

**Como a previsão é calculada (RF02).** Cada ônibus sabe quantos metros já andou no circuito da linha, e cada ponto sabe a quantos metros fica do início. Então:

```
distância que falta = (posição do ponto − posição do ônibus) mod comprimento do circuito
tempo = distância que falta ÷ velocidade operacional + pontos no caminho × 25 s
```

- **O "mod" (resto da divisão)** trata o ônibus que já passou do ponto: ele precisa dar a volta no circuito. Por exemplo, num circuito de 10 km, um ônibus em 9 km indo para um ponto em 2 km tem 3 km pela frente (passa pelo terminal e segue), e não −7 km.
- **Velocidade operacional** é a média dos ônibus da linha que estão andando agora, limitada entre 12 e 40 km/h. Se a linha toda está lenta por causa do trânsito, a previsão acompanha. Ônibus parados no ponto ficam fora da média, para não puxá-la para zero.
- **Pontos no caminho × 25 s** conta o tempo de embarque e desembarque. Sem isso a previsão seria otimista demais em linhas com muitos pontos.
- **Ida e volta separadas.** Um ponto pode receber a mesma linha nos dois sentidos, indo para destinos diferentes, então cada sentido é uma previsão própria.
- **Sem ônibus em rota** (madrugada, ou linha sem veículo no momento): a previsão usa a tabela de horários mais o tempo estimado de viagem do terminal até o ponto, e a tela avisa que é "pela tabela".
- **A tela mostra minutos e horário de relógio** ("7 min · às 21:42"). Para a persona Marcos, que decide se espera ou anda, o relógio é mais fácil de usar do que um contador.

Os parâmetros ficam juntos em `services/previsao.ts` (`PARAMETROS`), para o grupo ajustar quando medir a precisão real. A lógica tem testes automáticos em `previsao.test.ts`.

**Catálogo em memória.** Linhas, pontos e itinerários quase nunca mudam, mas são consultados a cada previsão. Por isso são lidos do banco uma vez e mantidos em memória (`services/catalogo.ts`). Já os horários são lidos do banco a cada consulta, porque são muitos registros e cada pedido só precisa de uma linha e de um tipo de dia.

**Fuso horário fixo.** "Próxima saída" e "dia útil ou sábado" dependem da hora local. Servidores em nuvem costumam rodar em UTC, 3 horas à frente de Sorocaba, e às 22h de sexta o servidor acharia que já é sábado. Por isso a hora é sempre calculada em `America/Sao_Paulo` (`services/tempo.ts`). Feriados ainda não são tratados.

**Busca sem acento.** A busca normaliza o texto (remove acentos e ignora maiúsculas) para "eden" encontrar "Éden". Ela procura no número da linha, no nome e nos pontos atendidos, então digitar "Facens" encontra a linha 201 mesmo sem a palavra no número. Ela roda no navegador, porque a lista de linhas é pequena e assim o resultado aparece enquanto se digita.

**Acessibilidade nas novas telas.** O número de resultados da busca é anunciado ao leitor de tela enquanto se digita (`role="status"`). Ao trocar de página, o foco vai para o conteúdo principal, para o leitor de tela anunciar a nova página. Os horários que já passaram ficam riscados, mas continuam legíveis. Na página do ponto, a previsão se atualiza sozinha a cada 15 s e tem um botão "Atualizar" para quem quiser forçar.

## Dados de demonstração

As linhas `100`, `201`, `302`, `405`, `510` e `BRT1` são **fictícias**, montadas sobre locais reais de Sorocaba com coordenadas aproximadas e trajetos em linha reta. Elas não correspondem às linhas oficiais da Urbes. Os ônibus circulam o dia todo, mesmo fora do horário da tabela.

## Roteiro

- [x] **Etapa 1:** fundação, mapa em tempo real (RF01), base de acessibilidade (RF07)
- [x] **Etapa 2:** previsão de chegada (RF02), consulta de linhas e horários (RF03)
- [ ] Etapa 3: planejador de trajetos com baldeação (RF04)
- [ ] Etapa 4: notificações (RF05), favoritos (RF06), cadastro e login (RF08)
- [ ] Etapa 5: lotação colaborativa (RF09), feedback (RF10), impressão de horários (RF11)
- [ ] Etapa 6: dados reais (SPTrans Olho Vivo), testes e documentação final
