const express = require('express');
const router = express.Router();
const { renderLoginPage, handleLogin, handleLogout } = require('../controllers/authController');

// Rotta GET per mostrare la pagina di login
router.get('/login', renderLoginPage);

// Rotta POST per gestire il login
router.post('/login', handleLogin);

// Rotta GET per gestire il logout
router.get('/logout', handleLogout);

// Rotta POST alternativa per il logout (per form con method POST)
router.post('/logout', handleLogout);

module.exports = router;
