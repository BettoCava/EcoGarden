const Category = require('../models/Category');
const Pitch = require('../models/Pitch');

// Funzione per mostrare la pagina di amministrazione
const renderAdminPage = async (req, res) => {
  try {
    // Recupera tutte le categorie e le piazzole dal database
    const categories = await Category.find().sort({ name: 1 });
    const pitches = await Pitch.find()
      .populate('category', 'name')
      .sort({ name: 1 });

    res.render('admin/admin-dashboard', {
      title: 'Dashboard Amministratore - EcoGarden',
      categories: categories,
      pitches: pitches,
      success: req.query.success || null,
      error: req.query.error || null
    });

  } catch (error) {
    console.error('Errore nel caricamento della pagina admin:', error);
    res.status(500).render('error', {
      title: 'Errore del server',
      error: 'Errore nel caricamento della dashboard amministratore'
    });
  }
};

// Funzione per creare una nuova categoria
const createCategory = async (req, res) => {
  try {
    const { name } = req.body;

    // Validazione dei dati di input
    if (!name || name.trim().length === 0) {
      return res.redirect('/admin?error=Il nome della categoria è obbligatorio');
    }

    // Verifica se la categoria esiste già
    const existingCategory = await Category.findByName(name.trim());
    if (existingCategory) {
      return res.redirect('/admin?error=Categoria già esistente');
    }

    // Crea la nuova categoria
    const newCategory = new Category({
      name: name.trim()
    });

    await newCategory.save();

    console.log(`Categoria creata: ${newCategory.name} da ${req.session.user ? req.session.user.username : 'sconosciuto'}`);
    res.redirect('/admin?success=Categoria creata con successo');

  } catch (error) {
    console.error('Errore nella creazione della categoria:', error);
    
    // Gestione errori di validazione MongoDB
    if (error.name === 'ValidationError') {
      const errorMessage = Object.values(error.errors)[0].message;
      return res.redirect(`/admin?error=${encodeURIComponent(errorMessage)}`);
    }
    
    // Gestione errore duplicato
    if (error.code === 11000) {
      return res.redirect('/admin?error=Categoria già esistente');
    }

    res.redirect('/admin?error=Errore nella creazione della categoria');
  }
};

// Funzione per eliminare una categoria
const deleteCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;

    // Verifica se la categoria esiste
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.redirect('/admin?error=Categoria non trovata');
    }

    // Verifica se ci sono piazzole associate a questa categoria
    const pitchesCount = await Pitch.countDocuments({ category: categoryId });
    if (pitchesCount > 0) {
      return res.redirect('/admin?error=Impossibile eliminare la categoria: ci sono piazzole associate');
    }

    // Elimina la categoria
    await Category.findByIdAndDelete(categoryId);

    console.log(`Categoria eliminata: ${category.name} da ${req.session.user ? req.session.user.username : 'sconosciuto'}`);
    res.redirect('/admin?success=Categoria eliminata con successo');

  } catch (error) {
    console.error('Errore nell\'eliminazione della categoria:', error);
    res.redirect('/admin?error=Errore nell\'eliminazione della categoria');
  }
};

// Funzione per creare una nuova piazzola
const createPitch = async (req, res) => {
  try {
    const { name, category } = req.body;

    // Validazione dei dati di input
    if (!name || name.trim().length === 0) {
      return res.redirect('/admin?error=Il nome della piazzola è obbligatorio');
    }

    if (!category) {
      return res.redirect('/admin?error=La categoria è obbligatoria');
    }

    // Verifica se la categoria esiste
    const existingCategory = await Category.findById(category);
    if (!existingCategory) {
      return res.redirect('/admin?error=Categoria non valida');
    }

    // Verifica se la piazzola esiste già
    const existingPitch = await Pitch.findByName(name.trim());
    if (existingPitch) {
      return res.redirect('/admin?error=Piazzola già esistente');
    }

    // Crea la nuova piazzola
    const newPitch = new Pitch({
      name: name.trim(),
      category: category
    });

    await newPitch.save();

    console.log(`Piazzola creata: ${newPitch.name} (${existingCategory.name}) da ${req.session.user ? req.session.user.username : 'sconosciuto'}`);
    res.redirect('/admin?success=Piazzola creata con successo');

  } catch (error) {
    console.error('Errore nella creazione della piazzola:', error);
    
    // Gestione errori di validazione MongoDB
    if (error.name === 'ValidationError') {
      const errorMessage = Object.values(error.errors)[0].message;
      return res.redirect(`/admin?error=${encodeURIComponent(errorMessage)}`);
    }

    res.redirect('/admin?error=Errore nella creazione della piazzola');
  }
};

// Funzione per eliminare una piazzola
const deletePitch = async (req, res) => {
  try {
    const { pitchId } = req.params;

    // Verifica se la piazzola esiste
    const pitch = await Pitch.findById(pitchId).populate('category', 'name');
    if (!pitch) {
      return res.redirect('/admin?error=Piazzola non trovata');
    }

    // Verifica se ci sono prenotazioni associate a questa piazzola
    // Importa il modello Booking solo se necessario per evitare dipendenze circolari
    const Booking = require('../models/Booking');
    const bookingsCount = await Booking.countDocuments({ pitch: pitchId });
    
    if (bookingsCount > 0) {
      return res.redirect('/admin?error=Impossibile eliminare la piazzola: ci sono prenotazioni associate');
    }

    // Elimina la piazzola
    await Pitch.findByIdAndDelete(pitchId);

    console.log(`Piazzola eliminata: ${pitch.name} (${pitch.category.name}) da ${req.session.user ? req.session.user.username : 'sconosciuto'}`);
    res.redirect('/admin?success=Piazzola eliminata con successo');

  } catch (error) {
    console.error('Errore nell\'eliminazione della piazzola:', error);
    res.redirect('/admin?error=Errore nell\'eliminazione della piazzola');
  }
};

// Funzione per ottenere statistiche del campeggio
const getCampingStats = async (req, res) => {
  try {
    const stats = {
      totalCategories: await Category.countDocuments(),
      totalPitches: await Pitch.countDocuments(),
      totalBookings: 0, // Sarà aggiornato quando il modello Booking sarà disponibile
      activeBookings: 0 // Prenotazioni attive oggi
    };

    // Se il modello Booking è disponibile, calcola le statistiche delle prenotazioni
    try {
      const Booking = require('../models/Booking');
      const today = new Date();
      
      stats.totalBookings = await Booking.countDocuments();
      stats.activeBookings = await Booking.countDocuments({
        startDate: { $lte: today },
        endDate: { $gte: today }
      });
    } catch (bookingError) {
      // Modello Booking non ancora disponibile o errore nel caricamento
      console.log('Modello Booking non disponibile per le statistiche');
    }

    res.json(stats);

  } catch (error) {
    console.error('Errore nel recupero delle statistiche:', error);
    res.status(500).json({ error: 'Errore nel recupero delle statistiche' });
  }
};

module.exports = {
  renderAdminPage,
  createCategory,
  deleteCategory,
  createPitch,
  deletePitch,
  getCampingStats
};
