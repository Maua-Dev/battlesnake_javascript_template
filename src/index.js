// Ponte entre o AWS Lambda e a lógica da sua cobra.
//
// Você NÃO precisa mexer aqui. Este arquivo monta um servidor Express com as
// quatro rotas do Battlesnake e o embrulha com `serverless-http`, que traduz
// o evento do API Gateway em uma requisição HTTP comum.
//
// Rotas da API (https://docs.battlesnake.com/api):
//   GET  /        -> aparência da cobra
//   POST /start   -> a partida começou
//   POST /move    -> escolha a jogada deste turno
//   POST /end     -> a partida acabou

import express from "express";
import serverless from "serverless-http";

import { info, start, move, end } from "./logic.js";

export const app = express();

// Remove o prefixo do stage (ex: /dev, /staging, /prod) se presente.
//
// Dependendo de como a API é exposta, o caminho pode chegar ao Express com o
// nome do stage na frente ("/dev/move" em vez de "/move"). Sem esta
// normalização, o POST /move não casa com nenhuma rota, cai no middleware de
// fallback lá embaixo e devolve os metadados da cobra em vez da jogada — o
// que faz a cobra ser eliminada por resposta inválida.
app.use((req, res, next) => {
  const stagePrefixRegex = /^\/(?:dev|homolog|prod|staging)(\/.*)?$/;
  const match = req.url.match(stagePrefixRegex);
  if (match) {
    req.url = match[1] || "/";
  }
  next();
});

app.use(express.json());

app.get("/", (req, res) => {
  res.json(info());
});

app.post("/start", (req, res) => {
  start(req.body);
  res.send("ok");
});

app.post("/move", (req, res) => {
  res.json(move(req.body));
});

app.post("/end", (req, res) => {
  end(req.body);
  res.send("ok");
});

// Qualquer outro caminho devolve as informações da cobra, que é o que o site
// do Battlesnake espera de um GET na raiz.
app.use((req, res) => {
  res.json(info());
});

// Se o corpo da requisição não for um JSON válido, o express.json() lança um
// erro aqui. Respondemos 400 e registramos o motivo no CloudWatch, em vez de
// deixar o Express devolver uma página de erro em HTML.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(`corpo da requisição inválido: ${err.message}`);
  res.status(400).json({ error: err.message });
});

// É este nome que o Terraform configura como handler da Lambda
// (veja terraform/app/main.tf: handler = "src/index.handler").
export const handler = serverless(app);
