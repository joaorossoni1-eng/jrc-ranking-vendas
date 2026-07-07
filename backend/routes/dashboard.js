const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');

// GET /api/dashboard -> payload completo do painel
router.get('/', dashboardController.getDashboard);

// GET /api/dashboard/disputa-equipes -> disputa entre imobiliárias
router.get('/disputa-equipes', dashboardController.getDisputaEquipes);

// GET /api/dashboard/ranking-empreendimentos -> ranking de empreendimentos
router.get('/ranking-empreendimentos', dashboardController.getRankingEmpreendimentos);

module.exports = router;
