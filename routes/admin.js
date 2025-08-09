const express = require('express');
const router = express.Router();
const { 
  renderAdminPage, 
  createCategory, 
  deleteCategory, 
  createPitch, 
  deletePitch,
  getCampingStats 
} = require('../controllers/adminController');
const { requireAdmin } = require('../controllers/authController');

// Applica il middleware requireAdmin a tutte le rotte
router.use(requireAdmin);

// ================================
// ROTTE PER LA GESTIONE UTENTI
// ================================

// Rotta GET per mostrare la pagina di gestione utenti
router.get('/users', (req, res) => {
  res.render('admin/users', { 
    title: 'Gestione Utenti - EcoGarden',
    user: req.session.user
  });
});

// Rotta GET per mostrare la dashboard amministratore
router.get('/', renderAdminPage);

// ================================
// ROTTE PER LE CATEGORIE
// ================================

// Rotta POST per creare una nuova categoria
router.post('/categories', createCategory);

// Rotta DELETE per eliminare una categoria
router.delete('/categories/:categoryId', deleteCategory);

// ================================
// ROTTE PER LE PIAZZOLE
// ================================

// Rotta POST per creare una nuova piazzola
router.post('/pitches', createPitch);

// Rotta DELETE per eliminare una piazzola
router.delete('/pitches/:pitchId', deletePitch);

// ================================
// ROTTE AGGIUNTIVE
// ================================

// Rotta GET per ottenere statistiche del campeggio (API)
router.get('/stats', getCampingStats);

module.exports = router;
