# Guia de apresentação do RotaCerta

Roteiro sugerido para demonstrar o sistema para a banca, em cerca de **12 minutos**, contando a história das três personas da documentação.

## Antes da apresentação (no dia anterior)

Num computador com **Node.js 22.13+**, com o projeto **fora do OneDrive**, no Git Bash:

```bash
cd ~/projetos/rotacerta
git pull
npm install
npm test
```

- **`git pull`**: baixa a versão mais recente do GitHub.
- **`npm install`**: garante que todas as dependências estão instaladas.
- **`npm test`**: roda os 26 testes automáticos. Todos precisam passar ("26 passed").

Crie o arquivo `server/.env` com esta linha:

```
SIMULADOR_VELOCIDADE=3
```

Com isso, os ônibus andam 3× mais rápido, e a banca vê o movimento no mapa em poucos segundos. Para voltar ao tempo real, apague a linha.

## No dia: um comando só

```bash
npm run apresentacao
```

Esse comando compila o site (`npm run build`) e sobe tudo num processo só (`npm start`). Quando aparecer `Site completo em http://localhost:3333`, abra **http://localhost:3333**. É mais estável que o `npm run dev`, porque não depende do servidor de desenvolvimento do Vite.

**Checklist (5 minutos antes):**
- [ ] Internet funcionando. As imagens do mapa vêm do OpenStreetMap; sem internet, o resto funciona, mas o fundo do mapa fica cinza.
- [ ] Navegador em tela cheia (F11), com zoom em 100% (Ctrl + 0).
- [ ] Fonte em "A" e alto contraste desligado, para mostrar a mudança ao vivo.
- [ ] Sem estar logado em nenhuma conta. Se estiver, use "Minha conta → Sair".
- [ ] Uma **janela anônima** (Ctrl + Shift + N) já logada com a conta da equipe, para a parte final. Tem que ser janela anônima: duas abas normais compartilham o mesmo cookie de sessão, e entrar com uma conta numa aba troca a conta da outra.

**Contas:**

| Conta | E-mail | Senha |
|---|---|---|
| Passageiro (demo) | `demo@rotacerta.com.br` | `rotacerta2026` |
| Equipe | `equipe@rotacerta.com.br` | `equipe2026` |

Na tela de login, o botão **"Preencher"** coloca os dados da conta demo.

## Roteiro

### 1. O problema e a solução (1 min) — tela: Mapa ao vivo

- Abra em `/`. Mostre os ônibus andando e o status **"Ao vivo"**.
- Fala: *"Quem depende de ônibus em Sorocaba enfrenta horários impressos desatualizados e espera sem previsão. O RotaCerta mostra onde cada ônibus está agora, quando ele chega e como montar o trajeto."*
- Clique na linha **201** no painel. A linha fica em destaque, e a tabela mostra cada ônibus, o próximo ponto e a lotação.
- Comente: *"A tabela repete em texto o que está no mapa, porque um mapa não é lido por leitores de tela."*

### 2. Marcos, 34 anos, trabalhador (3 min)

> Mora longe, usa duas linhas e tem horário rígido. Precisa saber se compensa esperar ou ir a pé até outro ponto.

1. **Previsão de chegada (RF02).** No mapa, clique no ponto **Facens** → "Ver previsão de chegada". Mostre a previsão, no formato "**4 min · às 21:21**" (os números mudam a cada apresentação).
   - *"Mostramos também o horário de relógio, porque é o que o Marcos compara com a hora de entrada no trabalho."*
   - *"A previsão usa a posição do ônibus, a velocidade média atual da linha e o tempo parado em cada ponto. Se a linha está lenta, a previsão acompanha."*
2. **Planejador com baldeação (RF04).** Vá em "Planejar trajeto" e use **Av. Ipanema → Facens**. Mostre a opção **405 › 201**, o passo a passo ("pegue a linha 405… desça após 2 pontos…") e o trajeto no mapa.
   - *"A rede vira um grafo, e o algoritmo de Dijkstra acha a rota que chega mais cedo. A espera em cada ponto vem da posição real dos ônibus. Cada troca de ônibus recebe uma penalidade, para o sistema não sugerir três baldeações para ganhar um minuto."*
3. **Favoritos (RF06).** Na página do ponto Facens, clique em **☆ Favoritar**, **sem estar logado**.
   - *"Funciona sem conta, salvo no navegador."*

### 3. Camila, 20 anos, estudante (3 min)

> Usa o ônibus à noite, entre casa, faculdade e estágio, e planeja os trajetos no computador.

1. **Conta opcional (RF08).** Vá em "Entrar" → **Preencher** → Entrar. Na página Favoritos, mostre que o ponto favoritado antes **veio junto para a conta**, com a próxima chegada de cada linha.
   - *"A senha é guardada com bcrypt, que é lento de propósito e usa um salt diferente para cada pessoa. A sessão fica num cookie que o JavaScript da página não consegue ler."*
2. **Lotação colaborativa (RF09).** No ponto Facens, em um ônibus, clique em **Informar lotação → Em pé**. Aparece "**Em pé · 1 pessoa informou, agora**".
   - *"A informação vem dos próprios passageiros, como no Waze. Ela vale por 20 minutos, cada pessoa conta uma vez e os relatos recentes pesam mais. Enquanto ninguém informa, mostramos 'não informada', sem inventar."*
3. **Canal de feedback (RF10).** No rodapé, clique em "Fale conosco" → **Relatar um problema**, linha 201, e escreva: *"O ponto da Facens está sem iluminação à noite."* → Enviar. Mostre o **protocolo**.

### 4. Helena, 68 anos, mobilidade reduzida (3 min)

> Tem pouca prática com tecnologia e precisa de textos grandes e da indicação de ônibus e pontos acessíveis.

1. **Fonte e contraste (RF07).** Clique em **A++** e depois em **Alto contraste**. Navegue por duas telas para mostrar que tudo se adapta.
   - *"As preferências ficam salvas na conta. A filha da Helena configura uma vez, e ela encontra tudo pronto em qualquer computador."*
2. **Trajeto acessível.** Vá em "Planejar trajeto", **Itavuvu → Shopping Iguatemi**, e marque **"Preciso de acessibilidade"**.
   - *"O planejador só usa ônibus com rampa para cadeira de rodas, só faz baldeação em pontos acessíveis e não sugere trechos a pé."*
   - Mostre o ♿ nos ônibus e nos pontos.
3. **Navegação por teclado.** Recarregue a página e aperte **Tab**: aparece "Pular para o conteúdo". Navegue alguns campos só com o teclado.
   - *"Todas as telas passaram pelo axe-core, a mesma ferramenta do Lighthouse do Chrome, com zero violações das regras WCAG 2.1 nível AA."*
4. **Impressão (RF11).** Volte o contraste e a fonte ao normal. Em "Linhas e horários" → **201** → "Imprimir horários ou salvar em PDF" → **Imprimir ou salvar em PDF**. Mostre a prévia com o itinerário e os quadros por hora.
   - *"Para quem prefere o papel na geladeira. Usamos a impressão do próprio navegador, então o PDF tem texto selecionável e pode ser lido por leitor de tela."*

### 5. O outro lado: a equipe (1 min)

- Na **janela anônima** logada como **equipe**, abra **Mensagens recebidas** (`/equipe`). A mensagem da Camila está lá. Clique em **Marcar como resolvida**.
- *"Só a conta da equipe acessa essa área. Um passageiro logado recebe acesso negado."*

### 6. Bastidores técnicos (1 min, se a banca pedir)

- **Testes:** num terminal, rode `npm test` (26 testes passando).
- **Celular:** o site é responsivo. Mostre a página no celular pelo endereço "Network" do `npm run dev`, ou redimensione a janela do navegador.
- **Documentação:** o `README.md` explica cada escolha técnica, e o `docs/ARQUITETURA.md` traz os diagramas e onde está cada requisito.

## Perguntas prováveis da banca

**"Os dados são reais?"**
Não. A Urbes não publica as posições dos ônibus em formato aberto, e esse risco estava previsto na seção 5 da documentação. Usamos um simulador com linhas de demonstração montadas sobre locais reais de Sorocaba. O simulador fica atrás de uma interface (`ProvedorPosicoes`): com dados reais da operação (Fase 1 do plano de aplicação), troca-se só essa peça, e a API e o site continuam iguais.

**"Por que tiraram as notificações (RF05)?"**
Com dados simulados, os avisos de atraso e desvio seriam inventados, e preferimos não mostrar uma informação falsa como se fosse real. O RF05 volta quando houver dados reais da operação.

**"Por que não fizeram um aplicativo?"**
A documentação define que nesta fase não haverá versão para celular. Mesmo assim, o site é responsivo, porque a WCAG exige que o conteúdo funcione com zoom de até 400%, e esse zoom tem o mesmo efeito de uma tela estreita.

**"Como vocês protegem as senhas?"**
Com bcrypt, custo 10. Cada senha recebe um salt aleatório, e o cálculo é lento de propósito (cerca de 70 ms), o que torna inviável testar bilhões de senhas. O login dá a mesma mensagem e demora o mesmo tempo para e-mail inexistente e para senha errada, e bloqueia por 15 minutos após 5 erros.

**"E a LGPD?"**
- Coleta mínima: a localização nunca sai do navegador, e a lotação e o feedback não exigem conta.
- Consentimento registrado com data no cadastro.
- Em "Minha conta", a pessoa baixa todos os seus dados e pode excluir a conta, o que apaga tudo; as mensagens de feedback ficam anônimas.

**"Por que SQLite e não um banco 'de verdade'?"**
O SQLite é um banco relacional completo, com SQL, chaves estrangeiras, transações e índices, e guarda tudo num único arquivo, sem servidor para instalar. Para um piloto rodando localmente, isso elimina um ponto de falha. Numa expansão (Fase 3), o modelo migra para PostgreSQL com poucas mudanças.

**"Como o sistema escalaria para a cidade inteira?"**
- O planejador já usa uma fila de prioridade com heap, que custa O(log n) por operação.
- O catálogo da rede fica em memória.
- O histórico é gravado por amostragem e em lote.
- Para centenas de linhas, os próximos passos seriam PostgreSQL com PostGIS para consultas geográficas e mais de uma instância da API atrás de um balanceador.

**"Como sabem que a previsão está certa?"**
O histórico de posições é gravado justamente para medir isso, e a precisão da previsão é um dos indicadores de sucesso da seção 8. Com dados reais, compara-se o previsto com o horário em que o ônibus de fato passou e ajustam-se os parâmetros, que ficam todos juntos em `PARAMETROS`, em `services/previsao.ts`.

## Apresentando pelo link online (Render)

Se o projeto estiver publicado no Render (ver README, "Publicar na internet"):
- **Abra o link de 3 a 5 minutos antes.** No plano gratuito, o serviço dorme depois de 15 minutos sem visitas e leva cerca de 1 minuto para acordar.
- O banco recomeça do zero quando o serviço dorme. As contas de demonstração continuam existindo, mas o que foi criado em ensaios anteriores (contas, mensagens, lotação) some, e assim a demonstração começa sempre "limpa".
- A banca pode acessar o link pelo próprio celular, e o botão "usar o ponto mais próximo de mim" funciona porque o link é `https`.
- Tenha o modo local (`npm run apresentacao`) como plano B, caso a internet do local falhe.

## Se algo der errado

| Sintoma | Solução |
|---|---|
| `'concurrently' não é reconhecido` | Rode `npm install`. |
| Erro de versão do Node ou `node:sqlite` | Confira com `node -v`. Precisa ser 22.13 ou maior; instale a versão LTS em nodejs.org. |
| `EADDRINUSE: 3333` | Já tem um RotaCerta rodando em outro terminal. Feche-o (Ctrl + C) ou reinicie o computador. |
| Mapa cinza, mas os ônibus aparecem | Sem internet para as imagens do OpenStreetMap. Todo o resto funciona. |
| "Muitas tentativas" no login | Reinicie o servidor (Ctrl + C e rode o comando de novo); o bloqueio fica em memória. |
| Quer o banco "zerado" | Pare o servidor e rode `npm run db:reset`. O banco é recriado no próximo início, e as contas criadas no site são apagadas. |
