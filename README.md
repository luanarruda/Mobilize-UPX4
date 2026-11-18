# RotaCerta

Aplicação web de acompanhamento do transporte público em tempo real. Projeto Interdisciplinar, Facens (ADS), **Grupo Mobilize**, tema *Mobilidade e Urbanização*.

| Documento | Para quê |
|---|---|
| Este README | Como rodar, telas, API e o **porquê** de cada escolha técnica |
| [docs/ARQUITETURA.md](docs/ARQUITETURA.md) | Diagramas (sistema, fluxo em tempo real, banco), onde está cada requisito no código, disciplinas aplicadas, testes e limitações |
| [docs/APRESENTACAO.md](docs/APRESENTACAO.md) | Roteiro de demonstração pelas personas, checklist do dia, respostas para perguntas da banca e solução de problemas |

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
| `npm test` | Roda os 26 testes automáticos do back-end (Vitest). |
| `npm run apresentacao` | Compila o site e sobe **tudo num processo só** em http://localhost:3333, sem o Vite. É o modo mais estável para apresentar (ver [guia](docs/APRESENTACAO.md)). |

**Testar no celular:** com o `npm run dev` rodando, o Vite mostra uma linha `Network: http://192.168.x.x:5173`. Com o celular **na mesma rede Wi-Fi**, abra esse endereço no navegador dele. Na primeira vez, o Windows pode perguntar se libera o Node no firewall: permita em "Redes privadas". O botão "usar o ponto mais próximo de mim" não funciona por esse endereço, porque o navegador só libera a localização em `https` ou em `localhost`.

## Publicar na internet (link fixo)

O projeto já vem pronto para o **Render** (render.com), no plano gratuito. O arquivo `render.yaml` descreve tudo, e não é preciso configurar nada à mão:

1. Crie uma conta em render.com usando **"Sign in with GitHub"**.
2. No painel, clique em **New → Blueprint**, escolha o repositório **Mobilize-UPX4** e clique em **Apply**.
3. Espere de 3 a 5 minutos (instalação + compilação). O link fica parecido com `https://rotacerta.onrender.com`. Se esse nome já estiver em uso, o Render acrescenta um sufixo.

A cada `git push` na `main`, o Render publica a versão nova sozinho.

O que o `render.yaml` define:
- **`buildCommand: npm ci --include=dev && npm run build`**: `npm ci` instala exatamente as versões do `package-lock.json`. O `--include=dev` é necessário porque o TypeScript e o Vite são dependências de desenvolvimento, que o npm pularia com `NODE_ENV=production`. Depois o `build` compila o site e a API.
- **`startCommand: npm start`**: sobe a API, que também entrega o site, numa porta só.
- **`healthCheckPath: /api/saude`**: o Render chama essa rota para saber se o sistema subiu.
- **`NODE_VERSION: 24`** (também no arquivo `.node-version`): uma versão do Node que tem o `node:sqlite`.
- **`NODE_ENV: production`**: liga o cookie `Secure` (só via HTTPS) e o *trust proxy* (ver abaixo).

**Limitações do plano gratuito**, que não atrapalham uma demonstração:
- **O serviço "dorme" depois de 15 minutos sem visitas**, e o primeiro acesso depois disso demora cerca de **1 minuto** para acordar. Na apresentação, abra o link alguns minutos antes.
- **O banco é apagado a cada vez que o serviço dorme ou é atualizado**, porque o disco do plano gratuito é temporário. Como o banco se recria sozinho, as **duas contas de demonstração sempre existem**, mas contas, favoritos, relatos de lotação e mensagens criados no site somem. Para guardar dados de verdade, o próximo passo seria um banco hospedado. Com o código atual, a forma mais simples seria um SQLite em nuvem, como o Turso.
- **Bônus:** como o link é `https`, o botão "usar o ponto mais próximo de mim" funciona também no celular.

**Por que não a Vercel?** A Vercel é feita para *funções serverless*: cada requisição liga uma função, que responde e desliga. O RotaCerta precisa de um **processo que fica rodando sempre**:
- o simulador move os ônibus a cada 2 segundos, mesmo sem ninguém pedindo;
- o WebSocket empurra as posições para os navegadores sem parar;
- o banco SQLite é um arquivo que precisa continuar existindo entre uma requisição e outra.

A Vercel passou a aceitar WebSocket em 2026, mas cada conexão é uma execução de função, com limite de duração (5 minutos por padrão). Ela também não tem um processo contínuo para o simulador nem disco para o SQLite. Para rodar lá, seria preciso reescrever o simulador como cálculo sob demanda, trocar o WebSocket por consultas periódicas e mover o banco para um serviço externo. O Render roda o mesmo processo do `npm run apresentacao`, sem mudar nada no código.

**Detalhe técnico — `trust proxy`.** No Render, as requisições passam por um proxy que cuida do HTTPS. Sem `app.set('trust proxy', 1)`, o Express veria o IP do proxy em todas as requisições, e o limite de tentativas de login bloquearia **todos os visitantes juntos** quando qualquer um errasse a senha 5 vezes. Com ele, o IP real vem do cabeçalho `X-Forwarded-For`, e cada visitante tem o seu próprio limite.

Configuração opcional: copie `server/.env.example` para `server/.env` e altere o que quiser. Para apresentações, `SIMULADOR_VELOCIDADE=5` deixa os ônibus 5× mais rápidos.

## Estrutura

```
rotacerta/
├── server/                 API Node.js + TypeScript
│   ├── dados/              arquivo do banco SQLite (gerado, fora do Git)
│   └── src/
│       ├── db/             schema.sql, migrações, dados de demonstração, conexão
│       ├── realtime/       simulador, estado da frota, WebSocket
│       ├── routes/         rotas REST (/api/linhas, /api/pontos…)
│       ├── services/       catálogo, previsão, planejador, contas, fuso horário
│       ├── geo.ts          cálculos geográficos (Haversine, interpolação)
│       └── index.ts        ponto de entrada
└── web/                    Site React + TypeScript (Vite)
    └── src/
        ├── componentes/    Layout, mapa, barra de acessibilidade
        ├── contexto/       sessão, favoritos, tempo real (WebSocket), acessibilidade
        ├── hooks/          usePosicoes
        └── paginas/        Mapa, Planejar, Linhas, Linha, Ponto, Favoritos, Entrar, Conta,
                            Feedback, Equipe, Imprimir, Privacidade
```

## Telas

| Endereço | Funcionalidade |
|---|---|
| `/` | Mapa ao vivo com todas as linhas e ônibus (RF01) |
| `/linhas` | Busca de linhas e pontos por número, nome ou bairro (RF03) |
| `/linhas/:id` | Itinerário nos dois sentidos, próximas saídas, quadro de horários e mapa da linha (RF03) |
| `/pontos/:id` | Previsão de chegada de todas as linhas que passam no ponto (RF02) |
| `/planejar` | Planejador de trajetos com baldeação e opção acessível (RF04) |
| `/favoritos` | Pontos favoritos com a próxima chegada e linhas favoritas (RF06) |
| `/entrar`, `/cadastro` | Login e criação de conta opcional (RF08) |
| `/conta` | Dados da conta, baixar meus dados, excluir conta (RF08 + LGPD) |
| `/privacidade` | Política de privacidade |
| `/feedback` | Canal de feedback: problema, sugestão ou elogio, com ou sem conta (RF10) |
| `/equipe` | Mensagens recebidas, só para a conta da equipe (RF10) |
| `/linhas/:id/imprimir` | Quadro de horários para imprimir ou salvar em PDF (RF11) |

A lotação (RF09) aparece em cada chegada da página do ponto, com o botão "Informar lotação", e na tabela do mapa ao vivo.

### Contas de demonstração

Existem em qualquer computador, porque são criadas junto com o banco:

| Conta | E-mail | Senha | Para quê |
|---|---|---|---|
| Passageiro | `demo@rotacerta.com.br` | `rotacerta2026` | Já vem com a linha 201 e o ponto Facens nos favoritos |
| Equipe | `equipe@rotacerta.com.br` | `equipe2026` | Lê as mensagens do canal de feedback em `/equipe` |
 Contas criadas pelo site ficam guardadas **só no computador onde foram criadas**, no arquivo `server/dados/rotacerta.db`.


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
| GET | `/api/planejar?origem=&destino=&acessivel=` | Até 3 opções de trajeto, com cada trecho detalhado |
| GET | `/api/veiculos` | Posições atuais de todos os ônibus |
| POST | `/api/auth/cadastro` | Cria conta `{ nome, email, senha, aceite }` e já entra |
| POST | `/api/auth/login` | Entra `{ email, senha }`; devolve o cookie de sessão |
| POST | `/api/auth/logout` | Sai e invalida a sessão |
| GET | `/api/auth/eu` | Usuário logado (ou `null`) |
| PUT | `/api/auth/preferencias` | Salva fonte e contraste na conta |
| GET | `/api/auth/meus-dados` | Baixa os dados da conta em JSON (LGPD) |
| DELETE | `/api/auth/conta` | Exclui a conta e os dados (LGPD) |
| GET | `/api/lotacao` | Lotação atual dos ônibus com relatos recentes |
| POST | `/api/lotacao` | Informa lotação `{ veiculoId, nivel: 0–3, autor }` (sem conta) |
| POST | `/api/feedback` | Envia mensagem `{ tipo, mensagem, linhaId?, email? }` (sem conta) |
| GET | `/api/feedback?status=` | Lista as mensagens (só a equipe) |
| PATCH | `/api/feedback/:id` | Muda o status: `novo`, `lido` ou `resolvido` (só a equipe) |
| GET | `/api/favoritos` | Favoritos da conta (exige login) |
| PUT/DELETE | `/api/favoritos/:tipo/:id` | Adiciona/remove favorito (`tipo` = `linha` ou `ponto`) |
| POST | `/api/favoritos/importar` | Junta os favoritos do navegador aos da conta |
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

### Planejador de trajetos (Etapa 3)

**A rede vira um grafo (Estrutura de Dados).** Os **vértices** são os pontos de parada. As **arestas** são de dois tipos:
- **ônibus:** "pegar a linha X no ponto A e descer no ponto B", uma aresta para cada ponto à frente no itinerário;
- **caminhada:** "andar de A até um ponto a até 500 m", para casos em que a baldeação exige atravessar a rua ou ir ao ponto vizinho. A distância em linha reta é multiplicada por 1,3, porque as ruas não são retas, e a velocidade considerada é de 4,3 km/h.

**Algoritmo de Dijkstra.** Ele explora sempre o estado de menor custo ainda não visitado, e por isso a primeira vez que chega ao destino é pelo caminho mais barato. Para escolher o próximo estado rapidamente, usamos uma **fila de prioridade** implementada como **heap binário** (`FilaPrioridade` em `services/planejador.ts`): inserir e retirar custam O(log n), contra O(n) de procurar o menor numa lista comum.

**O custo depende da hora (grafo dependente do tempo).** O tempo de uma aresta de ônibus não é fixo: é **a espera até o próximo ônibus passar** mais a viagem. A espera vem das posições em tempo real, com o mesmo cálculo da previsão de chegada. Se o ônibus mais próximo passa antes de a pessoa chegar ao ponto, consideramos a volta seguinte dele no circuito. Na baldeação há uma margem de 1 minuto entre descer de um ônibus e pegar o próximo.

**Penalidade de baldeação.** Cada troca de ônibus soma 3 minutos ao custo, mas não ao horário de chegada mostrado. Sem isso, o algoritmo trocaria de ônibus várias vezes para ganhar segundos. É uma decisão de experiência do usuário: a persona Helena prefere esperar mais a fazer baldeação.

**Várias opções.** O estado da busca é (ponto, quantos ônibus já usou, se chegou caminhando), e guardamos o melhor resultado com 1, 2 e 3 ônibus. Uma opção com mais baldeações só aparece se chegar **pelo menos 5 minutos antes** das opções mais simples; caso contrário, é descartada como "dominada".

**Modo acessível (RF04 + RF07).** Com "Preciso de acessibilidade" marcado, o planejador só usa ônibus com elevador, só faz baldeação em pontos acessíveis e não sugere trechos a pé.

**O trajeto na URL.** Origem, destino e opção acessível ficam no endereço (`/planejar?origem=15&destino=8`). Dá para mandar o link para alguém, salvar nos favoritos do navegador e usar o botão "voltar". A página do ponto usa isso nos links "Planejar trajeto saindo daqui" e "até aqui".

**"Usar o ponto mais próximo de mim".** Usa a localização do navegador, que só funciona com a permissão da pessoa, e procura o ponto mais perto com a fórmula de Haversine. A localização **não é enviada ao servidor**: o cálculo é feito no próprio navegador, o que atende à coleta mínima de dados da LGPD (seção 8 da documentação).

**Limitações conhecidas.** O planejamento parte de pontos de parada, e não de endereços: para buscar por endereço seria preciso um serviço de geocodificação. Linhas sem ônibus em operação no momento não entram no cálculo.

### Contas e favoritos (Etapa 4)

**Migrações do banco.** A Etapa 4 cria tabelas novas (`usuarios`, `sessoes`, `favoritos`), mas quem já tem o `rotacerta.db` não pode perder os dados nem precisar apagá-lo. O SQLite tem um contador interno, `PRAGMA user_version`, onde gravamos até qual versão o banco já foi atualizado. Ao iniciar, `db/migracoes.ts` aplica só as migrações que faltam, cada uma dentro de uma transação. É o mesmo princípio de ferramentas como Flyway e Prisma Migrate.

Uma migração que já foi aplicada **nunca é editada**, porque outros computadores já a rodaram e não rodariam a versão nova. Por isso, quando os avisos saíram do escopo, a remoção da tabela `avisos` virou uma migração nova, a 3, em vez de uma alteração na 2.

**Senhas com bcrypt (RF08).** Nunca guardamos a senha, só o *hash*: o resultado de uma conta de mão única, em que dá para conferir se uma senha bate, mas não dá para voltar do hash à senha. Usamos bcrypt, e não SHA-256, por dois motivos:
- **Salt:** o bcrypt sorteia 16 bytes aleatórios para cada senha e os mistura antes de calcular. Duas pessoas com a senha "123456" ficam com hashes diferentes, e um atacante não consegue usar tabelas prontas de hashes (*rainbow tables*).
- **Custo:** o bcrypt é **lento de propósito**. Com custo 10 ele repete o cálculo 2¹⁰ = 1.024 vezes, cerca de 70 ms. Para quem faz login isso é imperceptível; para quem roubou o banco e quer testar bilhões de senhas, vira anos. O SHA-256 é feito para ser rápido: ótimo para conferir arquivos, péssimo para senhas.
- O resultado fica assim: `$2b$10$<salt de 22 caracteres><hash de 31>`. O custo e o salt vão junto no texto, e por isso o `bcrypt.compare` não precisa de mais nada.
- Usamos a biblioteca **bcryptjs**, escrita em JavaScript puro, e não a `bcrypt`, que precisa compilar código C. No Windows, a compilação costuma falhar.

**Sessão em cookie httpOnly, e não JWT.** Ao entrar, o servidor sorteia um token de 32 bytes, impossível de adivinhar, e o envia num cookie:
- **`httpOnly`:** o JavaScript da página não consegue ler o cookie. Se um script malicioso for injetado no site (XSS), ele não rouba a sessão.
- **`SameSite=Lax`:** o navegador não envia o cookie em formulários vindos de outros sites, o que protege contra CSRF.
- **No banco fica só o SHA-256 do token.** Quem copiar o arquivo do banco não consegue usar as sessões. Aqui o SHA-256 é adequado, porque o token já é aleatório e longo e não há o que "adivinhar".
- **Por que não JWT:** uma sessão guardada no banco pode ser cancelada na hora, ao sair ou ao excluir a conta. Um JWT continua válido até expirar, mesmo depois do "sair".

**Proteções no login:**
- **Mesma mensagem** para e-mail inexistente e senha errada ("E-mail ou senha incorretos"), para não revelar quais e-mails têm conta.
- **Mesmo tempo de resposta** nos dois casos: quando o e-mail não existe, conferimos a senha contra um hash falso. Sem isso, a resposta mais rápida entregaria que o e-mail não existe (*timing attack*).
- **Limite de tentativas:** após 5 erros para o mesmo e-mail a partir do mesmo IP, o login fica bloqueado por 15 minutos, o que dificulta adivinhar senhas por tentativa e erro.
- **Senha:** de 8 a 72 caracteres. O bcrypt só considera os primeiros 72 bytes.

**LGPD.** O cadastro exige aceitar a política de privacidade, e guardamos a data do aceite como registro do consentimento. Em "Minha conta", a pessoa **baixa seus dados** em JSON (direito de acesso e portabilidade) e **exclui a conta** (direito de eliminação). O `ON DELETE CASCADE` apaga junto as sessões e os favoritos. A localização usada em "ponto mais próximo" nunca sai do navegador.

**Favoritos sem conta (RF06).** A documentação diz que a conta é **opcional**, então os favoritos funcionam sem login, guardados no `localStorage` do navegador. Ao entrar, os favoritos do navegador são **enviados e juntados** aos da conta (`/api/favoritos/importar`, que ignora repetidos com `INSERT OR IGNORE`) e o navegador é limpo. Ao clicar na estrela, ela muda **na hora** (atualização otimista) e, se o servidor recusar, volta ao estado anterior.

**Preferências na conta (RF08 + RF07).** A fonte e o contraste vão para a conta. Ao entrar em outro computador, já vêm aplicados. Exemplo da persona Helena: a filha configura uma vez, e ela encontra tudo pronto.

**Uma conexão WebSocket só.** Antes, cada página abria a sua conexão, e ela caía e reabria a cada troca de página. Agora existe um `ProvedorTempoReal` no topo da aplicação, com uma conexão única para o site inteiro.

**Sem CORS.** O site e a API ficam na mesma origem (o Vite faz o proxy em desenvolvimento), então o pacote `cors`, que liberava qualquer site, foi removido. Isso fecha uma porta para ataques que usam o cookie de sessão a partir de outro domínio.

### Lotação, feedback e impressão (Etapa 5)

**Lotação colaborativa (RF09): como vários relatos viram uma informação.** Quatro níveis: vazio, lugares sentados, em pé e lotado (0 a 3).
- **Validade de 20 minutos.** A lotação muda a cada ponto, e um relato de uma hora atrás não diz nada sobre agora.
- **Uma voz por pessoa.** Se alguém informar duas vezes, vale só o último relato dessa pessoa.
- **Média ponderada pela idade.** Um relato feito agora pesa 1; um de quase 20 minutos atrás pesa quase nada. Assim a informação acompanha o ônibus enchendo ou esvaziando, sem ficar presa a relatos antigos.
- **Sem relato, a tela mostra "Lotação não informada"** em vez de inventar um valor. A informação depende de os passageiros participarem; é a mesma ideia dos alertas de trânsito do Waze.
- A lógica fica numa função pura, `consolidarLotacao`, testada separadamente.

**Lotação sem conta e sem expor ninguém (LGPD).** Exigir login para tocar em "Em pé" faria quase ninguém informar, então o relato é aceito sem conta. Para contar uma voz por pessoa, o navegador sorteia um identificador anônimo (`crypto.randomUUID()`), guardado no `localStorage`. No banco fica só o **hash** desse identificador, e o IP não é gravado. Há um limite de 10 relatos a cada 10 minutos por pessoa, para ninguém distorcer a informação com relatos em massa. Relatos com mais de 7 dias são apagados.

**Canal de feedback (RF10).** Aceita problema, sugestão ou elogio, com ou sem conta, e opcionalmente ligado a uma linha. A página de cada linha tem o atalho "Relatar um problema nesta linha".
- **Pote de mel (*honeypot*) contra spam:** o formulário tem um campo escondido de quem enxerga e também do leitor de tela (`aria-hidden`, fora da tela). Robôs de spam preenchem todos os campos; se esse vier preenchido, a API finge que deu certo, mas não grava nada. É uma alternativa ao CAPTCHA, que atrapalha justamente quem tem deficiência visual ou pouca prática.
- **Limite de 5 mensagens por hora por IP.**
- **Papéis de usuário:** a coluna `papel` (`passageiro` ou `equipe`) define quem lê as mensagens. A rota de leitura usa o middleware `exigirEquipe`: um passageiro logado recebe 403 (proibido), e quem não está logado recebe 401 (não autenticado).
- **LGPD:** se alguém exclui a conta, as mensagens continuam para a equipe, mas **anônimas**, porque o e-mail de contato é apagado junto. "Baixar meus dados" agora inclui as mensagens enviadas e quantos relatos de lotação a pessoa fez.

**Impressão e PDF (RF11) com o próprio navegador.** A página `/linhas/:id/imprimir` monta uma "folha" com o itinerário e os três quadros de horários. Os horários ficam agrupados por hora (`05h | 00 15 30 45`), como nos quadros de terminal. O botão chama `window.print()`, e na janela de impressão a opção **"Salvar como PDF"** gera o arquivo. Por que não uma biblioteca de PDF:
- não adiciona dependência ao projeto;
- o texto do PDF continua **selecionável e pesquisável**, diferente de uma "foto" da tela, e um leitor de tela consegue ler o arquivo;
- respeita o papel e as margens da impressora de cada pessoa.

O CSS `@media print` esconde os botões, força preto no branco e evita que um quadro seja cortado entre duas páginas (`break-inside: avoid`). O título da página vira o nome sugerido do arquivo ("Horários linha 201 - RotaCerta.pdf").

### Revisão de acessibilidade (RF07)

Todas as telas foram verificadas com o **axe-core**, a ferramenta automática de checagem WCAG mais usada, por exemplo pelo Lighthouse do Chrome, nas regras WCAG 2.1 níveis A e AA, nos modos normal e alto contraste com fonte A++. **Resultado: nenhuma violação.** Os dois problemas que a ferramenta encontrou foram corrigidos:

- **Rótulo no nome (WCAG 2.5.3).** Os botões "A+" e "A++" tinham o nome "Texto grande" para o leitor de tela. Quem usa **comando de voz** diz o que vê ("clicar A+"), e o comando não funcionava. Agora o nome é o texto visível mais uma explicação escondida: "A+ (texto grande)". Valeu o mesmo para o botão "Favoritar".
- **Rolagem pelo teclado (WCAG 2.1.1).** Nas páginas sem nenhum link, como a de privacidade, o conteúdo rolava dentro de uma área que o teclado não alcançava. Agora, nas páginas de texto quem rola é a própria página, e as setas e o Page Down funcionam sem nada especial. Só as telas com mapa usam rolagem interna, e elas sempre têm itens focáveis no painel. A regra usa o seletor CSS `:has()`: `#root:has(.pagina-mapa)` aplica a altura fixa só quando a página tem mapa.

Também testamos **navegar só com o teclado**: planejar um trajeto do início ao fim sem mouse funciona. Esse teste encontrou mais um defeito. Em desenvolvimento, o React (StrictMode) roda os efeitos duas vezes, e a segunda rodada movia o foco para o conteúdo logo ao abrir o site, de modo que o primeiro Tab pulava o link "Pular para o conteúdo". A correção foi comparar com o endereço anterior em vez de "pular a primeira vez".

Para repetir a verificação, a forma mais simples é a aba **Lighthouse** do Chrome (F12 → Lighthouse → Acessibilidade), que usa o mesmo axe-core.

### Layout responsivo

A documentação define que **nesta fase não haverá versão para celular**, ou seja, nenhum aplicativo nem recursos próprios de celular. Mesmo assim, o site se adapta a qualquer largura de tela, por três motivos:

1. **Acessibilidade (RF07).** Quem aumenta o zoom do navegador no computador, como a persona Helena, recebe na prática uma tela estreita: um notebook de 1366 px com zoom de 200% equivale a uma tela de 683 px. O critério *Reflow* da WCAG 2.1 (1.4.10) exige que o conteúdo continue legível **sem rolagem horizontal** até 400% de zoom.
2. **Custo.** Tornar responsivas 5 telas agora é barato. As etapas 4 e 5 trazem novas telas, que já nascem no padrão em vez de serem consertadas depois.
3. **A documentação cita turistas e pessoas na rua** como público. Um layout que funciona no navegador do celular não contradiz a decisão de não ter app: é o mesmo site.

Como foi feito, tudo em `estilos.css`:
- **Ponto de quebra em 56rem (896 px).** Abaixo disso, o mapa e o painel deixam de ficar lado a lado e passam a ficar um embaixo do outro. No "Mapa ao vivo" o mapa vem primeiro; nas outras telas, o texto vem primeiro e o mapa depois. Em media query, `rem` vale sempre 16 px (o padrão do navegador), sem depender dos botões A+/A++, mas o zoom do navegador ativa esse layout.
- **Menu sempre visível.** Em tela estreita, os três itens ficam numa linha abaixo do logo. Evitamos o menu "hambúrguer" (☰), que esconde as opções e é pouco intuitivo para quem tem pouca prática com tecnologia.
- **Grades com `minmax(min(18rem, 100%), 1fr)`**: o cartão tem 18rem de largura ideal, mas nunca fica mais largo que a tela.
- **Campos com `width: 100%; min-width: 0`.** Sem isso, um `<select>` fica da largura da opção mais comprida e vaza da tela.
- **Altura com flexbox em vez de `calc(100vh - 66px)`.** A conta fixa quebrava quando o cabeçalho crescia com a fonte A++. Isso era um defeito também no desktop, e foi corrigido junto. Usamos `dvh`, a altura que de fato aparece no celular, descontando a barra de endereço do navegador.
- **Textos escondidos para leitor de tela presos ao contêiner** (`position: relative` nas áreas que rolam). Antes, eles "escapavam" do painel e criavam uma barra de rolagem extra na página.

Verificação: em 320 px (o menor celular comum), 390 px e 1366 px, nenhuma tela tem rolagem horizontal.

## Dados de demonstração

As linhas `100`, `201`, `302`, `405`, `510` e `BRT1` são **fictícias**, montadas sobre locais reais de Sorocaba com coordenadas aproximadas e trajetos em linha reta. Elas não correspondem às linhas oficiais da Urbes. Os ônibus circulam o dia todo, mesmo fora do horário da tabela.

## Roteiro

- [x] **Etapa 1:** fundação, mapa em tempo real (RF01), base de acessibilidade (RF07)
- [x] **Etapa 2:** previsão de chegada (RF02), consulta de linhas e horários (RF03)
- [x] **Etapa 3:** planejador de trajetos com baldeação (RF04)
- [x] **Etapa 4:** favoritos (RF06), cadastro e login (RF08)
- [ ] ~~Notificações (RF05)~~: retirado do escopo pelo grupo. Com dados simulados, os avisos de atraso e desvio seriam inventados. Pode voltar quando houver dados reais da operação.
- [x] **Etapa 5:** lotação colaborativa (RF09), feedback (RF10), impressão de horários (RF11), revisão de acessibilidade (RF07)
- [x] **Etapa 6:** guia de apresentação, documentação técnica, modo de execução em processo único e revisão final

As limitações conhecidas estão listadas em [docs/ARQUITETURA.md](docs/ARQUITETURA.md#7-limitações-conhecidas).
