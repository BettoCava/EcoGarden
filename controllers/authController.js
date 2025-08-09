const Operator = require('../models/Operator');
const bcrypt = require('bcryptjs');

// Funzione per mostrare la pagina di login
const renderLoginPage = (req, res) => {
  try {
    // Se l'utente è già loggato, reindirizza alla dashboard
    if (req.session.user) {
      return res.redirect('/dashboard');
    }
    
    res.render('auth/login', {
      title: 'Login - EcoGarden',
      error: null,
      query: req.query
    });
  } catch (error) {
    console.error('Errore nel rendering della pagina di login:', error);
    res.status(500).render('error', {
      title: 'Errore del server',
      error: 'Errore nel caricamento della pagina di login'
    });
  }
};

// Funzione per gestire il login
const handleLogin = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validazione dei dati di input
    if (!username || !password) {
      return res.render('auth/login', {
        title: 'Login - EcoGarden',
        error: 'Username e password sono obbligatori'
      });
    }

    // Trova l'operatore per username
    const operator = await Operator.findOne({ username: username.toLowerCase() });
    
    if (!operator) {
      return res.render('auth/login', {
        title: 'Login - EcoGarden',
        error: 'Credenziali non valide'
      });
    }

    // Verifica che l'utente sia attivo
    if (!operator.isActive) {
      return res.render('auth/login', {
        title: 'Login - EcoGarden',
        error: 'Account disattivato. Contatta l\'amministratore.'
      });
    }

    // Verifica la password
    const isPasswordValid = await bcrypt.compare(password, operator.password);
    
    if (!isPasswordValid) {
      return res.render('auth/login', {
        title: 'Login - EcoGarden',
        error: 'Credenziali non valide'
      });
    }

    // Aggiorna l'ultimo login
    operator.lastLogin = new Date();
    await operator.save();

    // Salva i dati dell'operatore nella sessione
    req.session.user = {
      id: operator._id,
      username: operator.username,
      email: operator.email,
      role: operator.role,
      isActive: operator.isActive
    };

    console.log(`Login effettuato: ${operator.username} (${operator.role})`);

    // Reindirizza alla dashboard
    res.redirect('/dashboard');

  } catch (error) {
    console.error('Errore durante il login:', error);
    res.render('auth/login', {
      title: 'Login - EcoGarden',
      error: 'Errore interno del server. Riprova più tardi.'
    });
  }
};

// Funzione per gestire il logout
const handleLogout = (req, res) => {
  try {
    const username = req.session.user ? req.session.user.username : 'Utente sconosciuto';

    // Distruggi la sessione
    req.session.destroy((error) => {
      if (error) {
        console.error('Errore durante il logout:', error);
        return res.status(500).render('error', {
          title: 'Errore del server',
          error: 'Errore durante il logout'
        });
      }

      console.log(`Logout effettuato: ${username}`);

      // Cancella il cookie di sessione
      res.clearCookie('connect.sid');
      
      // Reindirizza alla pagina di login con messaggio di successo
      res.redirect('/login?message=logout_success');
    });

  } catch (error) {
    console.error('Errore durante il logout:', error);
    res.status(500).render('error', {
      title: 'Errore del server',
      error: 'Errore durante il logout'
    });
  }
};

// Middleware per verificare se l'utente è autenticato
const requireAuth = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  next();
};

// Middleware per verificare se l'utente è un admin
const requireAdmin = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  
  if (req.session.user.role !== 'admin') {
    return res.status(403).render('error', {
      title: 'Accesso negato',
      error: 'Non hai i permessi per accedere a questa risorsa'
    });
  }
  
  next();
};

// Middleware per aggiungere i dati dell'operatore alle variabili locali
const addOperatorToLocals = (req, res, next) => {
  if (req.session.user) {
    res.locals.operator = {
      id: req.session.user.id,
      username: req.session.user.username,
      role: req.session.user.role,
      isAdmin: req.session.user.role === 'admin'
    };
  } else {
    res.locals.operator = null;
  }
  next();
};

module.exports = {
  renderLoginPage,
  handleLogin,
  handleLogout,
  requireAuth,
  requireAdmin,
  addOperatorToLocals
};