const mongoose = require('mongoose');

// Schema per la piazzola
const pitchSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Il nome della piazzola è obbligatorio'],
    trim: true,
    minlength: [2, 'Il nome della piazzola deve avere almeno 2 caratteri'],
    maxlength: [100, 'Il nome della piazzola non può superare i 100 caratteri']
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'La categoria è obbligatoria']
  }
}, {
  timestamps: true // Aggiunge automaticamente createdAt e updatedAt
});

// Indici per migliorare le performance
pitchSchema.index({ name: 1 });
pitchSchema.index({ category: 1 });

// Metodo statico per trovare piazzole per categoria
pitchSchema.statics.findByCategory = function(categoryId) {
  return this.find({ category: categoryId }).populate('category');
};

// Metodo statico per trovare una piazzola per nome
pitchSchema.statics.findByName = function(name) {
  return this.findOne({ name: new RegExp('^' + name + '$', 'i') }).populate('category');
};

// Metodo per popolare automaticamente la categoria
pitchSchema.methods.populateCategory = function() {
  return this.populate('category');
};

// Pre-save middleware per validazioni aggiuntive
pitchSchema.pre('save', function(next) {
  // Formatta il nome con la prima lettera maiuscola
  if (this.name) {
    this.name = this.name
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
  next();
});

// Middleware per popolare automaticamente la categoria nelle query find
pitchSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'category',
    select: 'name'
  });
  next();
});

// Creazione e esportazione del modello
const Pitch = mongoose.model('Pitch', pitchSchema);

module.exports = Pitch;
