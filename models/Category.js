const mongoose = require('mongoose');

// Schema per la categoria
const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Il nome della categoria è obbligatorio'],
    unique: true,
    trim: true,
    minlength: [2, 'Il nome della categoria deve avere almeno 2 caratteri'],
    maxlength: [50, 'Il nome della categoria non può superare i 50 caratteri']
  }
}, {
  timestamps: true // Aggiunge automaticamente createdAt e updatedAt
});

// Indice per migliorare le performance delle query su name
categorySchema.index({ name: 1 });

// Metodo statico per trovare una categoria per nome
categorySchema.statics.findByName = function(name) {
  return this.findOne({ name: new RegExp('^' + name + '$', 'i') }); // Case insensitive
};

// Pre-save middleware per formattare il nome
categorySchema.pre('save', function(next) {
  // Capitalizza la prima lettera di ogni parola
  if (this.name) {
    this.name = this.name
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
  next();
});

// Creazione e esportazione del modello
const Category = mongoose.model('Category', categorySchema);

module.exports = Category;
