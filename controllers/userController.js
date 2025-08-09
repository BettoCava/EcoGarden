const bcrypt = require('bcryptjs');
const Operator = require('../models/Operator');

// Controller per la gestione degli utenti (solo per admin)

// Ottieni tutti gli utenti
exports.getAllUsers = async (req, res) => {
    try {
        // Verifica che l'utente sia admin
        if (!req.session.user || req.session.user.role !== 'admin') {
            return res.status(403).json({ message: 'Accesso negato. Solo gli amministratori possono gestire gli utenti.' });
        }

        const users = await Operator.find()
            .select('-password')
            .sort({ createdAt: -1 });

        res.json(users);
    } catch (error) {
        console.error('Errore nel recupero degli utenti:', error);
        res.status(500).json({ message: 'Errore interno del server' });
    }
};

// Crea un nuovo utente
exports.createUser = async (req, res) => {
    try {
        // Verifica che l'utente sia admin
        if (!req.session.user || req.session.user.role !== 'admin') {
            return res.status(403).json({ message: 'Accesso negato. Solo gli amministratori possono creare utenti.' });
        }

        const { username, email, password, role, isActive } = req.body;

        // Validazione input
        if (!username || !email || !password) {
            return res.status(400).json({ message: 'Username, email e password sono obbligatori' });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: 'La password deve avere almeno 6 caratteri' });
        }

        // Verifica se l'username o email esistono già
        const existingUser = await Operator.findOne({
            $or: [
                { username: username.toLowerCase() },
                { email: email.toLowerCase() }
            ]
        });

        if (existingUser) {
            return res.status(400).json({ 
                message: existingUser.username === username.toLowerCase() 
                    ? 'Username già esistente' 
                    : 'Email già esistente' 
            });
        }

        // Hash della password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Crea nuovo utente
        const newUser = new Operator({
            username: username.toLowerCase(),
            email: email.toLowerCase(),
            password: hashedPassword,
            role: role || 'viewer',
            isActive: isActive !== undefined ? isActive : true
        });

        const savedUser = await newUser.save();
        
        // Rimuovi la password dalla risposta
        const userResponse = savedUser.toJSON();
        
        res.status(201).json({
            message: 'Utente creato con successo',
            user: userResponse
        });

    } catch (error) {
        console.error('Errore nella creazione dell\'utente:', error);
        
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({ message: messages.join(', ') });
        }
        
        res.status(500).json({ message: 'Errore interno del server' });
    }
};

// Aggiorna un utente esistente
exports.updateUser = async (req, res) => {
    try {
        // Verifica che l'utente sia admin
        if (!req.session.user || req.session.user.role !== 'admin') {
            return res.status(403).json({ message: 'Accesso negato. Solo gli amministratori possono modificare gli utenti.' });
        }

        const { id } = req.params;
        const { username, email, password, role, isActive } = req.body;

        // Trova l'utente esistente
        const user = await Operator.findById(id);
        if (!user) {
            return res.status(404).json({ message: 'Utente non trovato' });
        }

        // Verifica che non stia tentando di modificare se stesso
        if (user._id.toString() === req.session.user.id) {
            return res.status(400).json({ message: 'Non puoi modificare il tuo stesso account da qui' });
        }

        // Prepara i dati da aggiornare
        const updateData = {};

        if (username && username !== user.username) {
            // Verifica che il nuovo username non esista già
            const existingUsername = await Operator.findOne({ 
                username: username.toLowerCase(),
                _id: { $ne: id }
            });
            if (existingUsername) {
                return res.status(400).json({ message: 'Username già esistente' });
            }
            updateData.username = username.toLowerCase();
        }

        if (email && email !== user.email) {
            // Verifica che la nuova email non esista già
            const existingEmail = await Operator.findOne({ 
                email: email.toLowerCase(),
                _id: { $ne: id }
            });
            if (existingEmail) {
                return res.status(400).json({ message: 'Email già esistente' });
            }
            updateData.email = email.toLowerCase();
        }

        if (password && password.trim() !== '') {
            if (password.length < 6) {
                return res.status(400).json({ message: 'La password deve avere almeno 6 caratteri' });
            }
            const hashedPassword = await bcrypt.hash(password, 10);
            updateData.password = hashedPassword;
        }

        if (role && ['viewer', 'operator', 'admin'].includes(role)) {
            updateData.role = role;
        }

        if (isActive !== undefined) {
            updateData.isActive = isActive;
        }

        // Aggiorna l'utente
        const updatedUser = await Operator.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        ).select('-password');

        res.json({
            message: 'Utente aggiornato con successo',
            user: updatedUser
        });

    } catch (error) {
        console.error('Errore nell\'aggiornamento dell\'utente:', error);
        
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({ message: messages.join(', ') });
        }
        
        res.status(500).json({ message: 'Errore interno del server' });
    }
};

// Elimina un utente
exports.deleteUser = async (req, res) => {
    try {
        // Verifica che l'utente sia admin
        if (!req.session.user || req.session.user.role !== 'admin') {
            return res.status(403).json({ message: 'Accesso negato. Solo gli amministratori possono eliminare gli utenti.' });
        }

        const { id } = req.params;

        // Trova l'utente
        const user = await Operator.findById(id);
        if (!user) {
            return res.status(404).json({ message: 'Utente non trovato' });
        }

        // Verifica che non stia tentando di eliminare se stesso
        if (user._id.toString() === req.session.user.id) {
            return res.status(400).json({ message: 'Non puoi eliminare il tuo stesso account' });
        }

        // Elimina l'utente
        await Operator.findByIdAndDelete(id);

        res.json({ message: 'Utente eliminato con successo' });

    } catch (error) {
        console.error('Errore nell\'eliminazione dell\'utente:', error);
        res.status(500).json({ message: 'Errore interno del server' });
    }
};

// Attiva/disattiva un utente
exports.toggleUserStatus = async (req, res) => {
    try {
        // Verifica che l'utente sia admin
        if (!req.session.user || req.session.user.role !== 'admin') {
            return res.status(403).json({ message: 'Accesso negato. Solo gli amministratori possono modificare lo stato degli utenti.' });
        }

        const { id } = req.params;

        // Trova l'utente
        const user = await Operator.findById(id);
        if (!user) {
            return res.status(404).json({ message: 'Utente non trovato' });
        }

        // Verifica che non stia tentando di modificare se stesso
        if (user._id.toString() === req.session.user.id) {
            return res.status(400).json({ message: 'Non puoi modificare lo stato del tuo stesso account' });
        }

        // Cambia lo stato
        user.isActive = !user.isActive;
        await user.save();

        res.json({
            message: `Utente ${user.isActive ? 'attivato' : 'disattivato'} con successo`,
            user: user.toJSON()
        });

    } catch (error) {
        console.error('Errore nel cambio stato dell\'utente:', error);
        res.status(500).json({ message: 'Errore interno del server' });
    }
};

// Ottieni statistiche utenti
exports.getUserStats = async (req, res) => {
    try {
        // Verifica che l'utente sia admin
        if (!req.session.user || req.session.user.role !== 'admin') {
            return res.status(403).json({ message: 'Accesso negato.' });
        }

        const stats = await Operator.aggregate([
            {
                $group: {
                    _id: null,
                    totalUsers: { $sum: 1 },
                    activeUsers: { $sum: { $cond: ['$isActive', 1, 0] } },
                    admins: { $sum: { $cond: [{ $eq: ['$role', 'admin'] }, 1, 0] } },
                    operators: { $sum: { $cond: [{ $eq: ['$role', 'operator'] }, 1, 0] } },
                    viewers: { $sum: { $cond: [{ $eq: ['$role', 'viewer'] }, 1, 0] } }
                }
            }
        ]);

        const result = stats[0] || {
            totalUsers: 0,
            activeUsers: 0,
            admins: 0,
            operators: 0,
            viewers: 0
        };

        res.json(result);

    } catch (error) {
        console.error('Errore nel recupero delle statistiche utenti:', error);
        res.status(500).json({ message: 'Errore interno del server' });
    }
};
