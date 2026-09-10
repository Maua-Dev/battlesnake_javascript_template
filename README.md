# 🟨 Battlesnake JavaScript Template

Template de [Battlesnake](https://play.battlesnake.com) em **JavaScript**, com
**Express** rodando em **AWS Lambda** com **API Gateway**. O deploy é
automático: você programa, dá push, e o GitHub Actions devolve a URL da sua cobra.

---

## 📦 Pré-requisitos

- **Node.js 20 ou superior** — [nodejs.org/download](https://nodejs.org/en/download)
  Confira com `node --version`.
- Noções básicas de **JavaScript**, **API** e **Lambda**
- **Disposição, competitividade e força de vontade!**

Você **não** precisa instalar Terraform nem AWS CLI: quem cuida do deploy é o CD.

---

## 🚀 Como começar

1. Vá até o repositório [**devmaua_setup**](https://github.com/Maua-Dev/devmaua_setup),
   abra uma **issue** e escolha:
   - **project_name**: `battlesnake_javascript_{seu nome}`
   - **project template**: `battlesnake_javascript_template`
   - marque o repositório como **público**

2. Aguarde cerca de **1 minuto** e confira em
   [Repositórios da organização](https://github.com/orgs/Maua-Dev/repositories).

3. Clone e instale:
   ```bash
   git clone https://github.com/Maua-Dev/Nome_Do_Seu_Repositorio
   cd Nome_Do_Seu_Repositorio
   npm install
   ```

4. Abra [`src/logic.js`](src/logic.js) e comece a programar sua cobra 🐍

---

## 📂 Estrutura do projeto

```
.
├── package.json                # dependências e scripts
├── src
│   ├── logic.js                # 👈 É AQUI QUE VOCÊ PROGRAMA
│   ├── index.js                # rotas Express + handler da Lambda — não precisa mexer
│   └── local.js                # servidor local — não precisa mexer
├── tests
│   └── logic.test.js           # testes da sua lógica
├── terraform
│   ├── bootstrap/              # bucket de estado do Terraform
│   └── app/                    # Lambda + API Gateway
└── .github/workflows/CD.yaml   # testes + deploy automático
```

**Você só precisa de `src/logic.js`.** Os outros arquivos existem para levar o
estado do jogo até as suas quatro funções.

---

## ⭐ Onde implementar sua snake

**Você só precisa editar `src/logic.js`.** Os outros arquivos existem para
levar o estado do jogo até as suas quatro funções.

### O que você deve alterar:
- `src/logic.js` — **este é o seu arquivo principal**

### O que você normalmente NÃO precisa alterar:
- `src/index.js` — rotas Express + handler da Lambda
- `src/local.js` — servidor local
- Infraestrutura (Terraform)
- GitHub Actions

---

## 🧠 As quatro funções


Todas ficam em `src/logic.js` e recebem o `gameState` — o JSON completo que o
servidor do Battlesnake manda a cada requisição:

| Função | Rota | Quando é chamada | O que devolve |
|---|---|---|---|
| `info()` | `GET /` | ao cadastrar a cobra e no início de cada partida | aparência (cor, cabeça, cauda) |
| `start(gameState)` | `POST /start` | uma vez, no começo da partida | nada |
| `move(gameState)` | `POST /move` | **a cada turno** | `{ move: "up" \| "down" \| "left" \| "right" }` |
| `end(gameState)` | `POST /end` | uma vez, no fim da partida | nada |

A cobra já vem com a lógica que **impede ela de andar para trás**. A partir daí,
os `TODO` em `move()` marcam os próximos passos:

1. não sair do tabuleiro
2. não bater no próprio corpo
3. não bater nas cobras adversárias
4. ir atrás da comida em vez de sortear a direção

Documentação oficial da API: <https://docs.battlesnake.com/api>
Exemplo do JSON recebido: <https://docs.battlesnake.com/api/example-move>

> ⏱️ Você tem cerca de **500 ms** por jogada. Se estourar, o servidor escolhe
> uma direção qualquer por você — normalmente para a morte.

> 🧭 O tabuleiro tem a origem `(0, 0)` no **canto inferior esquerdo**: `x` cresce
> para a direita e `y` cresce para cima.

---

## 🧪 Testando

```bash
npm test
```

O template já vem com testes que garantem que a sua cobra **sempre devolve uma
direção válida** e **nunca volta por cima do próprio pescoço**. Eles usam o test
runner que já vem no Node, sem instalar nada. Escreva mais testes conforme for
implementando os passos acima.

> 🚨 Os testes rodam no GitHub Actions **antes** do deploy. Se algum falhar, o
> deploy não acontece e a URL da sua cobra não é atualizada.

### Rodando localmente

```bash
npm start
```

Sobe a mesma aplicação em `http://localhost:8000`. Em outro terminal:

```bash
curl http://localhost:8000/
curl -X POST http://localhost:8000/move \
  -H 'Content-Type: application/json' \
  -d '{"turn":1,"game":{"id":"1"},"board":{"width":11,"height":11,"food":[],"snakes":[]},"you":{"body":[{"x":5,"y":4},{"x":4,"y":4}],"head":{"x":5,"y":4}}}'
```

Dá para ir além e jogar partidas inteiras contra o seu servidor local com a
[CLI do Battlesnake](https://github.com/BattlesnakeOfficial/rules#installation):

```bash
battlesnake play -W 11 -H 11 --name minha-cobra --url http://localhost:8000 -g solo --browser
```

---

## ☁️ Deploy

O deploy é disparado por push na branch **`dev`**:

```bash
git add .
git commit -m "minha cobra agora desvia das paredes"
git push origin dev
```

O que o CD faz, nessa ordem:

1. **ExecuteTests** — roda `npm test`
2. **Bootstrap** — garante o bucket S3 que guarda o estado do Terraform
3. **build_node** — instala só as dependências de produção e empacota
   `src/` + `node_modules/` num zip
4. **deploy_app** — `terraform apply`, criando a Lambda e o API Gateway

No fim, o resumo da execução mostra a **URL da sua cobra** e um link para os
logs no CloudWatch. Você também encontra a URL no output `api_url_base` do
passo *Terraform Apply*.

---

## 🎯 Cadastrando na Arena Mauá

1. Acesse [arena.devmaua.com](https://arena.devmaua.com)
2. Faça login com sua conta Mauá
3. No campo **URL**, cole a URL gerada pelo deploy
   (algo como `https://abc123.execute-api.us-east-1.amazonaws.com/dev`)
4. Salve e participe das partidas e do ranking!

Se quiser testar no site oficial do Battlesnake:
1. Entre em [play.battlesnake.com](https://play.battlesnake.com)
2. **My Battlesnakes** → **Create Battlesnake**
3. Cole a URL do deploy e salve

Se o site reclamar da URL, teste antes no terminal:

```bash
curl https://SUA_URL_AQUI/
```

Deve responder o JSON do `info()`.

---


## 📈 Progressão pedagógica

| Nível | Nome | O que implementar |
|---|---|---|
| 0 | **Random** | movimento aleatório (já vem pronto) |
| 1 | **Don't Die** | não voltar, não bater na parede, não bater em si mesmo |
| 2 | **Food** | procurar comida |
| 3 | **Space** | avaliar espaço disponível, evitar becos |
| 4 | **Opponents** | considerar outras cobras, head-to-head |
| 5 | **Advanced** | BFS, flood fill, A*, avaliação de território |

Comece do Nível 1 implementando os `TODO`s em `src/logic.js`.

---

## 📌 Observações


- Toda a lógica da partida vive em `move()`.
- **Evite adicionar dependências pesadas.** Elas vão inteiras para o zip da
  Lambda, que tem limite de 50 MB. Se instalar algo novo, commite também o
  `package-lock.json` — é ele que o CD usa no `npm ci`.
- O projeto usa **ES Modules** (`import`/`export`, por causa do
  `"type": "module"` no `package.json`), não `require`.
- Os logs ficam no **CloudWatch**, com retenção de 14 dias. Tudo que você
  escrever com `console.log` aparece lá.
- A branch de deploy é **`dev`**. Push em outras branches roda só os testes.

---

## 🛠 Ferramentas úteis

- [Battlesnake Docs](https://docs.battlesnake.com/) — documentação da API
- [Battlesnake CLI](https://github.com/BattlesnakeOfficial/rules) — jogar partidas locais
- [Express](https://expressjs.com/pt-br/4x/api.html) — o framework das rotas
- [Postman](https://www.postman.com/) — testar requisições sem terminal
- [MDN JavaScript](https://developer.mozilla.org/pt-BR/docs/Web/JavaScript) — referência da linguagem

---

## 📞 Fale com a gente

Dúvidas? Chama no [Discord](https://discord.gg/Yr2VPgAmcb) da Dev. Community Mauá.
