// Middleware per il controllo dei permessi degli utenti

// Middleware per verificare se l'utente è autenticato
exports.isAuthenticated = (req, res, next) => {
    if (req.session && req.session.user) {
        return next();
    }
    
    // Se è una richiesta AJAX, invia JSON
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        return res.status(401).json({ message: 'Accesso negato. Effettuare il login.' });
    }
    
    // Altrimenti reindirizza alla pagina di login
    return res.redirect('/login');
};

// Middleware per verificare se l'utente è attivo
exports.isActive = (req, res, next) => {
    if (req.session && req.session.user && req.session.user.isActive) {
        return next();
    }
    
    // Distruggi la sessione se l'utente non è attivo
    req.session.destroy();
    
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        return res.status(403).json({ message: 'Account disattivato. Contattare l\'amministratore.' });
    }
    
    return res.redirect('/login?error=account_disabled');
};

// Middleware per verificare se l'utente è amministratore
exports.isAdmin = (req, res, next) => {
    if (req.session && req.session.user && req.session.user.role === 'admin') {
        return next();
    }
    
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        return res.status(403).json({ message: 'Accesso negato. Solo gli amministratori possono accedere a questa risorsa.' });
    }
    
    return res.status(403).render('error', { 
        title: 'Accesso Negato',
        message: 'Solo gli amministratori possono accedere a questa pagina.',
        error: { status: 403 }
    });
};

// Middleware per verificare se l'utente può creare/modificare prenotazioni
exports.canManageBookings = (req, res, next) => {
    if (req.session && req.session.user && 
        (req.session.user.role === 'operator' || req.session.user.role === 'admin')) {
        return next();
    }
    
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        return res.status(403).json({ message: 'Accesso negato. Non hai i permessi per gestire le prenotazioni.' });
    }
    
    return res.status(403).render('error', { 
        title: 'Accesso Negato',
        message: 'Non hai i permessi per gestire le prenotazioni.',
        error: { status: 403 }
    });
};

// Middleware per verificare se l'utente può solo visualizzare (per bloccare azioni non permesse)
exports.isViewerOnly = (req, res, next) => {
    if (req.session && req.session.user && req.session.user.role === 'viewer') {
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            return res.status(403).json({ message: 'Accesso negato. Hai solo permessi di visualizzazione.' });
        }
        
        return res.status(403).render('error', { 
            title: 'Accesso Negato',
            message: 'Hai solo permessi di visualizzazione.',
            error: { status: 403 }
        });
    }
    
    return next();
};

// Middleware combinato per autenticazione completa
exports.requireAuth = [
    exports.isAuthenticated,
    exports.isActive
];

// Middleware combinato per amministratori
exports.requireAdmin = [
    exports.isAuthenticated,
    exports.isActive,
    exports.isAdmin
];

// Middleware combinato per gestione prenotazioni
exports.requireBookingManagement = [
    exports.isAuthenticated,
    exports.isActive,
    exports.canManageBookings
];

// Funzione helper per verificare i permessi in base al ruolo
exports.checkPermission = (requiredRole) => {
    return (req, res, next) => {
        if (!req.session || !req.session.user) {
            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                return res.status(401).json({ message: 'Accesso negato. Effettuare il login.' });
            }
            return res.redirect('/login');
        }

        const userRole = req.session.user.role;
        
        // Definisci la gerarchia dei ruoli
        const roleHierarchy = {
            'viewer': 1,
            'operator': 2,
            'admin': 3
        };

        const userLevel = roleHierarchy[userRole] || 0;
        const requiredLevel = roleHierarchy[requiredRole] || 0;

        if (userLevel >= requiredLevel) {
            return next();
        }

        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            return res.status(403).json({ message: 'Accesso negato. Permessi insufficienti.' });
        }

        return res.status(403).render('error', { 
            title: 'Accesso Negato',
            message: 'Non hai i permessi necessari per accedere a questa risorsa.',
            error: { status: 403 }
        });
    };
};

// Middleware per aggiungere informazioni sui permessi alle viste
exports.addPermissionsToLocals = (req, res, next) => {
    if (req.session && req.session.user) {
        res.locals.user = req.session.user;
        res.locals.isAdmin = req.session.user.role === 'admin';
        res.locals.canManageBookings = req.session.user.role === 'operator' || req.session.user.role === 'admin';
        res.locals.isViewer = req.session.user.role === 'viewer';
    } else {
        res.locals.user = null;
        res.locals.isAdmin = false;
        res.locals.canManageBookings = false;
        res.locals.isViewer = false;
    }
    next();
};
