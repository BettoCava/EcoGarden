const mongoose = require('mongoose');

// Schema per la prenotazione
const bookingSchema = new mongoose.Schema({
  guestName: {
    type: String,
    required: [true, 'Il nome dell\'ospite è obbligatorio'],
    trim: true,
    minlength: [2, 'Il nome dell\'ospite deve avere almeno 2 caratteri'],
    maxlength: [100, 'Il nome dell\'ospite non può superare i 100 caratteri']
  },
  startDate: {
    type: Date,
    required: [true, 'La data di inizio è obbligatoria']
  },
  endDate: {
    type: Date,
    required: [true, 'La data di fine è obbligatoria']
  },
  pitch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pitch',
    required: [true, 'La piazzola è obbligatoria']
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Operator',
    required: [true, 'L\'operatore che ha creato la prenotazione è obbligatorio']
  },
  // Stato operativo: check-in e check-out effettuati
  checkedIn: {
    type: Boolean,
    default: false
  },
  checkedOut: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true // Aggiunge automaticamente createdAt e updatedAt
});

// Indici per migliorare le performance
bookingSchema.index({ startDate: 1 });
bookingSchema.index({ endDate: 1 });
bookingSchema.index({ pitch: 1 });
bookingSchema.index({ createdBy: 1 });
bookingSchema.index({ startDate: 1, endDate: 1, pitch: 1 }); // Indice composto per verificare disponibilità
bookingSchema.index({ checkedIn: 1 });
bookingSchema.index({ checkedOut: 1 });

// Validazione personalizzata per le date
bookingSchema.pre('save', function(next) {
  // Verifica che la data di fine sia successiva alla data di inizio
  if (this.endDate <= this.startDate) {
    return next(new Error('La data di fine deve essere successiva alla data di inizio'));
  }
  // Coerenza stato: non si può fare check-out senza check-in
  if (this.checkedOut && !this.checkedIn) {
    this.checkedIn = true;
  }
  next();
});

// Garantisce coerenza anche sugli update atomici
bookingSchema.pre('findOneAndUpdate', function(next) {
  const update = this.getUpdate() || {};
  const $set = update.$set || update;
  if ($set.endDate && $set.startDate && $set.endDate <= $set.startDate) {
    return next(new Error('La data di fine deve essere successiva alla data di inizio'));
  }
  if (($set.checkedOut === true || $set.checkedOut === 'true' || $set.checkedOut === 'on') && !$set.checkedIn) {
    // Forza checkedIn se si imposta checkedOut a true
    if (!update.$set) update.$set = {};
    update.$set.checkedIn = true;
    this.setUpdate(update);
  }
  next();
});

// Metodo statico per trovare prenotazioni per piazzola
bookingSchema.statics.findByPitch = function(pitchId) {
  return this.find({ pitch: pitchId })
    .populate('pitch')
    .populate('createdBy', 'username role')
    .sort({ startDate: 1 });
};

// Metodo statico per trovare prenotazioni per operatore
bookingSchema.statics.findByOperator = function(operatorId) {
  return this.find({ createdBy: operatorId })
    .populate('pitch')
    .populate('createdBy', 'username role')
    .sort({ startDate: -1 });
};

// Metodo statico per verificare disponibilità di una piazzola
bookingSchema.statics.checkAvailability = function(pitchId, startDate, endDate, excludeBookingId = null) {
  const query = {
    pitch: pitchId,
    $or: [
      { startDate: { $lt: endDate, $gte: startDate } },
      { endDate: { $gt: startDate, $lte: endDate } },
      { startDate: { $lte: startDate }, endDate: { $gte: endDate } }
    ]
  };
  
  // Escludere una prenotazione specifica (utile per gli aggiornamenti)
  if (excludeBookingId) {
    query._id = { $ne: excludeBookingId };
  }
  
  return this.findOne(query);
};

// Metodo statico per trovare prenotazioni in un periodo
bookingSchema.statics.findByDateRange = function(startDate, endDate) {
  return this.find({
    $or: [
      { startDate: { $gte: startDate, $lte: endDate } },
      { endDate: { $gte: startDate, $lte: endDate } },
      { startDate: { $lte: startDate }, endDate: { $gte: endDate } }
    ]
  })
  .populate('pitch')
  .populate('createdBy', 'username role')
  .sort({ startDate: 1 });
};

// Metodo per calcolare la durata del soggiorno
bookingSchema.methods.getDuration = function() {
  const diffTime = Math.abs(this.endDate - this.startDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

// Middleware per popolare automaticamente i riferimenti nelle query find
bookingSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'pitch',
    select: 'name category',
    populate: {
      path: 'category',
      select: 'name'
    }
  }).populate({
    path: 'createdBy',
    select: 'username role'
  });
  next();
});

// Creazione e esportazione del modello
const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;
