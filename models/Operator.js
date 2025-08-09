const mongoose = require('mongoose');

// Schema per l'operatore
const operatorSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Il nome utente è obbligatorio'],
    unique: true,
    trim: true,
    minlength: [3, 'Il nome utente deve avere almeno 3 caratteri'],
    maxlength: [50, 'Il nome utente non può superare i 50 caratteri']
  },
  email: {
    type: String,
    required: [true, 'L\'email è obbligatoria'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Inserisci un\'email valida']
  },
  password: {
    type: String,
    required: [true, 'La password è obbligatoria'],
    minlength: [6, 'La password deve avere almeno 6 caratteri']
  },
  role: {
    type: String,
    enum: {
      values: ['viewer', 'operator', 'admin'],
      message: 'Il ruolo deve essere "viewer", "operator" o "admin"'
    },
    default: 'viewer'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  }
}, {
  timestamps: true // Aggiunge automaticamente createdAt e updatedAt
});

// Indice per migliorare le performance delle query su username ed email
operatorSchema.index({ username: 1 });
operatorSchema.index({ email: 1 });

// Metodo per nascondere la password quando si converte in JSON
operatorSchema.methods.toJSON = function() {
  const operator = this.toObject();
  delete operator.password;
  return operator;
};

// Metodo per verificare se l'utente è amministratore
operatorSchema.methods.isAdmin = function() {
  return this.role === 'admin';
};

// Metodo per verificare se l'utente può creare prenotazioni
operatorSchema.methods.canCreateBookings = function() {
  return this.role === 'operator' || this.role === 'admin';
};

// Metodo per verificare se l'utente può solo visualizzare
operatorSchema.methods.isViewer = function() {
  return this.role === 'viewer';
};

// Metodo statico per trovare un operatore per username
operatorSchema.statics.findByUsername = function(username) {
  return this.findOne({ username: username.toLowerCase(), isActive: true });
};

// Metodo statico per trovare un operatore per email
operatorSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase(), isActive: true });
};

// Pre-save middleware per validazioni aggiuntive
operatorSchema.pre('save', function(next) {
  // Converti username in lowercase per uniformità
  if (this.username) {
    this.username = this.username.toLowerCase();
  }
  
  // Converti email in lowercase
  if (this.email) {
    this.email = this.email.toLowerCase();
  }
  
  next();
});

// Creazione e esportazione del modello
const Operator = mongoose.model('Operator', operatorSchema);

module.exports = Operator;
