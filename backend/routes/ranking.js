const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');

// GET /api/ranking -> ranking de coordenadores
router.get('/', dashboardController.getRanking);

module.exports = router;
