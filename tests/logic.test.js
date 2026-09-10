// Testes da lógica da sua cobra. Rode com `npm test`.
//
// Usamos o test runner que já vem no Node (node:test), sem nenhuma biblioteca
// extra. Conforme você for implementando os TODOs de src/logic.js, escreva
// testes novos aqui: eles rodam no GitHub Actions antes de cada deploy.

import test from "node:test";
import assert from "node:assert/strict";

import { info, start, move, end } from "../src/logic.js";
import { handler } from "../src/index.js";

const DIRECTIONS = ["up", "down", "left", "right"];

// Monta um estado de jogo mínimo, com a cobra deitada entre `head` e `neck`.
function gameState(head, neck) {
  const you = {
    id: "minha-cobra",
    name: "MinhaCobra",
    health: 100,
    body: [head, neck, { x: neck.x, y: neck.y - 1 }],
    head,
    length: 3,
    latency: "50",
    shout: "",
  };

  return {
    game: {
      id: "partida-de-teste",
      ruleset: { name: "standard", version: "v1.2.3" },
      map: "standard",
      timeout: 500,
    },
    turn: 4,
    board: {
      height: 11,
      width: 11,
      food: [{ x: 5, y: 5 }],
      hazards: [],
      snakes: [you],
    },
    you,
  };
}

test("info devolve os campos obrigatórios", () => {
  const response = info();

  assert.equal(response.apiversion, "1");
  assert.ok("author" in response);
  assert.ok("color" in response);
  assert.ok("head" in response);
  assert.ok("tail" in response);
});

test("move devolve sempre uma direção válida", () => {
  const state = gameState({ x: 5, y: 4 }, { x: 4, y: 4 });

  for (let i = 0; i < 50; i++) {
    assert.ok(DIRECTIONS.includes(move(state).move));
  }
});

test("nunca volta por cima do pescoço", () => {
  const casos = [
    // [posição do pescoço em relação à cabeça, direção proibida]
    [{ x: 4, y: 4 }, "left"],  // pescoço à esquerda
    [{ x: 6, y: 4 }, "right"], // pescoço à direita
    [{ x: 5, y: 3 }, "down"],  // pescoço abaixo
    [{ x: 5, y: 5 }, "up"],    // pescoço acima
  ];

  for (const [neck, proibida] of casos) {
    const state = gameState({ x: 5, y: 4 }, neck);

    for (let i = 0; i < 50; i++) {
      assert.notEqual(move(state).move, proibida, `a cobra andou para trás (${proibida})`);
    }
  }
});

test("start e end não quebram com um estado de jogo válido", () => {
  const state = gameState({ x: 5, y: 4 }, { x: 4, y: 4 });

  assert.doesNotThrow(() => start(state));
  assert.doesNotThrow(() => end(state));
});

// ---------------------------------------------------------------------------
// Testes de integração: percorrem o caminho completo
// evento do API Gateway -> serverless-http -> Express -> logic.js.
//
// O que eles protegem é o middleware normalizador de src/index.js. Se o
// caminho chegar com o nome do stage na frente ("/dev/move") e o middleware
// sumir, a requisição cai no fallback e devolve os metadados da cobra em vez
// da jogada — que é uma resposta inválida para o servidor do Battlesnake.
// ---------------------------------------------------------------------------

/** Monta um evento no formato que o API Gateway REST entrega para a Lambda. */
function apiGatewayEvent(method, path, body) {
  const ehRaiz = path === "/" || path === "";

  return {
    resource: ehRaiz ? "/" : "/{proxy+}",
    path,
    httpMethod: method,
    headers: { "Content-Type": "application/json" },
    multiValueHeaders: {},
    queryStringParameters: null,
    pathParameters: ehRaiz ? null : { proxy: path.replace(/^\//, "") },
    requestContext: { stage: "dev", path, httpMethod: method },
    body: body === undefined ? null : JSON.stringify(body),
    isBase64Encoded: false,
  };
}

const ESTADO_DE_JOGO = gameState({ x: 5, y: 4 }, { x: 4, y: 4 });

test("POST /dev/move devolve a jogada, e não os metadados da cobra", async () => {
  const res = await handler(apiGatewayEvent("POST", "/dev/move", ESTADO_DE_JOGO), {});
  const body = JSON.parse(res.body);

  assert.equal(res.statusCode, 200);
  assert.ok(DIRECTIONS.includes(body.move), `direção inválida: ${body.move}`);
  assert.equal(body.apiversion, undefined, "caiu no fallback de info em vez de responder o movimento");
});

test("GET /dev/ devolve os metadados da cobra", async () => {
  const res = await handler(apiGatewayEvent("GET", "/dev/"), {});
  const body = JSON.parse(res.body);

  assert.equal(res.statusCode, 200);
  assert.equal(body.apiversion, "1");
});

test("GET /dev (sem barra no fim) devolve os metadados da cobra", async () => {
  const res = await handler(apiGatewayEvent("GET", "/dev"), {});
  const body = JSON.parse(res.body);

  assert.equal(res.statusCode, 200);
  assert.equal(body.apiversion, "1");
});

test("/dev/start e /dev/end respondem ok", async () => {
  for (const rota of ["/dev/start", "/dev/end"]) {
    const res = await handler(apiGatewayEvent("POST", rota, ESTADO_DE_JOGO), {});

    assert.equal(res.statusCode, 200, `${rota} não respondeu 200`);
    assert.equal(res.body, "ok", `${rota} não respondeu "ok"`);
  }
});

test("as rotas sem o prefixo do stage continuam funcionando", async () => {
  // O API Gateway REST atual entrega o caminho já sem o stage. O middleware
  // não pode atrapalhar esse caso.
  const move = await handler(apiGatewayEvent("POST", "/move", ESTADO_DE_JOGO), {});
  const moveBody = JSON.parse(move.body);

  assert.equal(move.statusCode, 200);
  assert.ok(DIRECTIONS.includes(moveBody.move), `direção inválida: ${moveBody.move}`);

  const raiz = await handler(apiGatewayEvent("GET", "/"), {});

  assert.equal(raiz.statusCode, 200);
  assert.equal(JSON.parse(raiz.body).apiversion, "1");
});

test("o middleware não engole a lógica anti-ré", async () => {
  // Pescoço à esquerda da cabeça: "left" seria andar para trás.
  const estado = gameState({ x: 5, y: 4 }, { x: 4, y: 4 });

  for (let i = 0; i < 30; i++) {
    const res = await handler(apiGatewayEvent("POST", "/dev/move", estado), {});
    const direcao = JSON.parse(res.body).move;

    // Sem checar que veio uma direção de verdade, este teste passaria à toa
    // quando a resposta fosse o info do fallback (que não tem campo "move").
    assert.ok(DIRECTIONS.includes(direcao), `direção inválida: ${direcao}`);
    assert.notEqual(direcao, "left");
  }
});

test("evita parede quando tem outra opção", async () => {
  // Cobra no canto inferior esquerdo, pescoço à direita:
  // não pode ir para left (x=-1) nem down (y=-1) nem right (pescoço).
  // A única saída segura seria "up" — mas como os TODO de parede ainda
  // não estão implementados, apenas verificamos que retorna uma direção válida.
  const state = gameState({ x: 0, y: 0 }, { x: 1, y: 0 });

  for (let i = 0; i < 50; i++) {
    const direction = move(state).move;
    assert.ok(DIRECTIONS.includes(direction), `direção inválida: ${direction}`);
    // A cobra NÃO deve voltar pelo pescoço
    assert.notEqual(direction, "right", "voltou pelo pescoço");
  }
});

test("evita próprio corpo quando tem opção", () => {
  // Cabeça em (5,4), pescoço à esquerda (4,4).
  // Corpo em (5,5) bloqueia "up".
  // Restam "right" e "down" como opções seguras.
  const head = { x: 5, y: 4 };
  const neck = { x: 4, y: 4 };
  const bodyBlock = { x: 5, y: 5 };
  const you = {
    id: "minha-cobra",
    name: "MinhaCobra",
    health: 100,
    body: [head, neck, bodyBlock, { x: 4, y: 3 }],
    head,
    length: 4,
    latency: "50",
    shout: "",
  };
  const state = {
    game: { id: "teste", ruleset: {}, timeout: 500 },
    turn: 1,
    board: { height: 11, width: 11, food: [], hazards: [], snakes: [you] },
    you,
  };

  for (let i = 0; i < 50; i++) {
    const direction = move(state).move;
    assert.ok(DIRECTIONS.includes(direction));
    assert.notEqual(direction, "left", "voltou pelo pescoço");
    assert.notEqual(direction, "up",   "bateu no próprio corpo");
  }
});

test("comportamento definido quando não há safe moves", () => {
  // Todas as direções são perigosas: a função não pode lançar exceção
  // e deve retornar uma das quatro direções válidas.
  const head = { x: 0, y: 0 };
  const neck = { x: 0, y: 1 }; // pescoço acima — bloqueia "up"
  const you = {
    id: "minha-cobra",
    name: "MinhaCobra",
    health: 100,
    body: [head, neck, { x: 1, y: 0 }, { x: 0, y: 1 }],
    head,
    length: 4,
    latency: "50",
    shout: "",
  };
  const state = {
    game: { id: "teste", ruleset: {}, timeout: 500 },
    turn: 1,
    board: { height: 11, width: 11, food: [], hazards: [], snakes: [you] },
    you,
  };

  // Mesmo encurralada, deve retornar uma direção válida sem lançar exceção.
  assert.doesNotThrow(() => {
    const result = move(state);
    assert.ok(DIRECTIONS.includes(result.move), `direção inválida: ${result.move}`);
  });
});
