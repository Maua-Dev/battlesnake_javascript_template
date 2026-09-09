// Sobe a mesma aplicação num servidor local, para você testar sem precisar
// fazer deploy. Rode com:
//
//   npm start
//
// E, em outro terminal:
//
//   curl http://localhost:8000/

import { app } from "./index.js";

const host = "0.0.0.0";
const port = process.env.PORT || 8000;

app.listen(port, host, () => {
  console.log(`Battlesnake rodando em http://localhost:${port}`);
});
