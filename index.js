// Importazione delle dipendenze
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
require('dotenv').config();

// Importazione dei router
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');

// Importa i controller
const { 
  renderDashboard, 
  getBookingsAndPitches, 
  getBookingsByDateRange, 
  getDashboardStats,
  createBooking,
  updateBooking,
  deleteBooking,
  getCategories,
  getAvailablePitches,
  getPitches,
  getPitchById
} = require('./controllers/dashboardController');
// Controllers
const dashboardController = require('./controllers/dashboardController');
const userController = require('./controllers/userController');

// Middleware
const authMiddleware = require('./middleware/authMiddleware');

// Inizializzazione dell'app Express
const app = express();

// Configurazione della connessione al database MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('Connessione a MongoDB riuscita');
})
.catch((error) => {
  console.error('Errore nella connessione a MongoDB:', error);
});

// Configurazione del motore di template EJS
app.set('view engine', 'ejs');
app.set('views', './views');

// Configurazione per servire file statici dalla cartella 'public'
app.use(express.static('public'));

// Configurazione per servire FullCalendar da node_modules
app.use('/node_modules', express.static('node_modules'));

// Configurazione di express-session per la gestione delle sessioni
app.use(session({
  secret: process.env.SESSION_SECRET || 'default-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Impostare su true se si usa HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 24 ore
  }
}));

// Middleware per il parsing dei dati
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware per logging delle richieste (opzionale)
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

// ================================
// ROTTE
// ================================

// Rotta home - reindirizza alla dashboard se loggato, altrimenti mostra homepage
app.get('/', (req, res) => {
  if (req.session.user) {
    return res.redirect('/dashboard');
  }
  res.render('index', { title: 'EcoGarden - Home' });
});

// Rotte di autenticazione
app.use('/', authRoutes);

// Middleware globale per aggiungere informazioni sui permessi
app.use(authMiddleware.addPermissionsToLocals);

// Rotte dashboard e API
app.get('/dashboard', authMiddleware.requireAuth, renderDashboard);
app.get('/api/data', authMiddleware.requireAuth, getBookingsAndPitches);
app.get('/api/categories', authMiddleware.requireAuth, getCategories);
app.get('/api/available-pitches', authMiddleware.requireAuth, getAvailablePitches);
app.get('/api/pitches', authMiddleware.requireAuth, getPitches);
app.get('/api/pitches/:id', authMiddleware.requireAuth, getPitchById);
app.get('/api/bookings/range', authMiddleware.requireAuth, getBookingsByDateRange);
app.get('/api/stats', authMiddleware.requireAuth, getDashboardStats);

// Rotte per gestione prenotazioni (solo operatori e admin)
app.post('/api/bookings', authMiddleware.requireBookingManagement, createBooking);
app.put('/api/bookings/:bookingId', authMiddleware.requireBookingManagement, updateBooking);
app.delete('/api/bookings/:bookingId', authMiddleware.requireBookingManagement, deleteBooking);

// Rotte per gestione utenti (solo admin)
app.get('/api/users', authMiddleware.requireAdmin, userController.getAllUsers);
app.post('/api/users', authMiddleware.requireAdmin, userController.createUser);
app.put('/api/users/:id', authMiddleware.requireAdmin, userController.updateUser);
app.delete('/api/users/:id', authMiddleware.requireAdmin, userController.deleteUser);
app.put('/api/users/:id/toggle-status', authMiddleware.requireAdmin, userController.toggleUserStatus);
app.get('/api/users/stats', authMiddleware.requireAdmin, userController.getUserStats);

// Rotte amministrazione
app.use('/admin', adminRoutes);

// Gestione errori 404
app.use('*', (req, res) => {
  res.status(404).render('404', { title: 'Pagina non trovata' });
});

// Gestione errori globali
app.use((error, req, res, next) => {
  console.error('Errore del server:', error);
  res.status(500).render('error', { 
    title: 'Errore del server',
    error: process.env.NODE_ENV === 'development' ? error : 'Errore interno del server'
  });
});

// Avvio del server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server avviato sulla porta ${PORT}`);
  console.log(`Ambiente: ${process.env.NODE_ENV || 'development'}`);
});
