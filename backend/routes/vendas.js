/**
 * routes/vendas.js
 * Recurso REST completo de vendas, montado em /api/vendas.
 * Aliases exigidos no briefing (/api/ultimas-vendas, /api/venda) são
 * registrados diretamente em server.js apontando para os mesmos handlers.
 */
const express = require('express');
const router = express.Router();
const controller = require('../controllers/vendaController');
const { exigirAutenticacao } = require('../middleware/auth');

router.get('/', controller.listar);                          // GET /api/vendas?filtros...
router.get('/ultimas', controller.ultimas);                   // GET /api/vendas/ultimas?limite=10
router.get('/csv', exigirAutenticacao, controller.listar);     // fallback JSON (CSV gerado no front a partir da lista)
router.get('/:id', controller.obterPorId);                     // GET /api/vendas/:id
router.post('/', exigirAutenticacao, controller.criar);        // POST /api/vendas
router.put('/:id', exigirAutenticacao, controller.atualizar);  // PUT /api/vendas/:id
router.delete('/:id', exigirAutenticacao, controller.remover); // DELETE /api/vendas/:id

module.exports = router;
