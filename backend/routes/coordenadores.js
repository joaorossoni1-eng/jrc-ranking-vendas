const express = require('express');
const router = express.Router();
const controller = require('../controllers/coordenadorController');
const { exigirAutenticacao } = require('../middleware/auth');

router.get('/', controller.listar);
router.get('/:id', controller.obterPorId);
router.post('/', exigirAutenticacao, controller.criar);
router.put('/:id', exigirAutenticacao, controller.atualizar);
router.delete('/:id', exigirAutenticacao, controller.remover);

module.exports = router;
