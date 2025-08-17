const Booking = require('../models/Booking');
const Pitch = require('../models/Pitch');

// Funzione per generare un colore unico per ogni piazzola
const getPitchColor = (pitchId, allPitches) => {
  // Trova l'indice della piazzola nell'array delle piazzole
  const pitchIndex = allPitches.findIndex(pitch => pitch._id.toString() === pitchId);
  
  // Se non trovata, usa un colore di default
  if (pitchIndex === -1) return uniqueBookingColors[0];
  
  // Assegna un colore basato sull'indice della piazzola
  return uniqueBookingColors[pitchIndex % uniqueBookingColors.length];
};
// Array di colori unici per le piazzole (versioni più scure)
const uniqueBookingColors = [
  '#DC3545', '#198754', '#0D6EFD', '#FD7E14', '#6F42C1',
  '#D63384', '#20C997', '#0DCAF0', '#FFC107', '#6C757D',
  '#8B0000', '#006400', '#000080', '#FF4500', '#4B0082',
  '#B22222', '#228B22', '#4169E1', '#FF6347', '#9932CC',
  '#CD5C5C', '#32CD32', '#1E90FF', '#FF7F50', '#8A2BE2',
  '#A0522D', '#2E8B57', '#4682B4', '#D2691E', '#9370DB',
  '#B8860B', '#008B8B', '#483D8B', '#B8722C', '#8B008B',
  '#556B2F', '#8FBC8F', '#6495ED', '#DEB887', '#DA70D6',
  '#5F9EA0', '#7FFF00', '#87CEEB', '#F4A460', '#EE82EE',
  '#708090', '#ADFF2F', '#87CEFA', '#BC8F8F', '#DDA0DD',
  '#2F4F4F', '#9ACD32', '#6495ED', '#CD853F', '#D8BFD8',
  '#696969', '#7CFC00', '#4169E1', '#A0522D', '#C71585',
  '#191970', '#00FF00', '#0000FF', '#FF8C00', '#FF1493',
  '#8B4513', '#228B22', '#1E90FF', '#FF4500', '#DC143C'
];

// Funzione helper per formattare le date in formato dd/mm/yyyy
const formatDateToDDMMYYYY = (date) => {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

// Funzione helper per ottenere il colore in base alla categoria
const getCategoryColor = (categoryName) => {
  const colors = {
    'Tende': '#28a745',
    'Camper': '#007bff', 
    'Bungalow': '#fd7e14',
    'Roulotte': '#6f42c1'
  };
  return colors[categoryName] || '#6c757d';
};

// Utils colori: conversione e generazione sfumature per categoria
function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean;
  const n = parseInt(full, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHex(r, g, b) {
  const h = (v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

// Scurisce un colore mescolando verso il nero
function darkenHex(hex, t) { // t in [0,1]
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(Math.round(r * (1 - t)), Math.round(g * (1 - t)), Math.round(b * (1 - t)));
}

function generateShades(baseHex, count) {
  if (count <= 1) return [darkenHex(baseHex, 0.15)];
  const shades = [];
  const minT = 0.05, maxT = 0.40; // gamma leggibile con testo bianco
  for (let i = 0; i < count; i++) {
    const t = minT + (maxT - minT) * (i / Math.max(1, count - 1));
    shades.push(darkenHex(baseHex, t));
  }
  return shades;
}

// Costruisce mappa piazzola->sfumatura basata sulla categoria
function buildPitchShadeMap(pitches) {
  const byCat = new Map();
  pitches.forEach(p => {
    const cat = p.category && p.category.name ? p.category.name : 'Altro';
    if (!byCat.has(cat)) byCat.set(cat, []);
    byCat.get(cat).push(p);
  });
  const map = new Map();
  byCat.forEach((arr, cat) => {
    arr.sort((a, b) => a.name.localeCompare(b.name));
    const base = getCategoryColor(cat);
    const shades = generateShades(base, arr.length);
    arr.forEach((p, i) => map.set(p._id.toString(), shades[i]));
  });
  return map;
}

// Determina colore testo leggibile su uno sfondo dato
function getReadableTextColor(hex) {
  const { r, g, b } = hexToRgb(hex);
  // YIQ/brightness heuristic
  const brightness = (r * 299 + g * 587 + b * 114) / 1000; // 0..255
  return brightness > 160 ? '#000000' : '#ffffff';
}

// Helper per serializzare date in YYYY-MM-DD in locale (evita shift timezone)
const formatLocalYMD = (date) => {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// Funzione per renderizzare la dashboard
const renderDashboard = async (req, res) => {
  try {
    // Recupera statistiche di base per la dashboard
    const totalPitches = await Pitch.countDocuments();
    const totalBookings = await Booking.countDocuments();
    
    // Prenotazioni attive oggi
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const activeBookings = await Booking.countDocuments({
      startDate: { $lte: today },
      endDate: { $gte: today }
    });

    // Arrivi di oggi (startDate in [oggi, domani))
    const upcomingBookings = await Booking.find({
      startDate: { $gte: today, $lt: tomorrow }
    })
    .populate('pitch', 'name')
    .populate('createdBy', 'username')
    .sort({ startDate: 1 })
    .limit(5);

    // Formatta le date per le prenotazioni future
    const upcomingBookingsFormatted = upcomingBookings.map(booking => ({
      ...booking.toObject(),
      startDateFormatted: formatDateToDDMMYYYY(booking.startDate),
      endDateFormatted: formatDateToDDMMYYYY(booking.endDate),
      checkedIn: booking.checkedIn === true
    }));

    res.render('dashboard/dashboard', {
      title: 'Dashboard - EcoGarden',
      stats: {
        totalPitches,
        totalBookings,
        activeBookings,
        upcomingBookings: upcomingBookings.length
      },
      upcomingBookings: upcomingBookingsFormatted
    });

  } catch (error) {
    console.error('Errore nel caricamento della dashboard:', error);
    res.status(500).render('error', {
      title: 'Errore del server',
      error: 'Errore nel caricamento della dashboard'
    });
  }
};

// Funzione API per ottenere dati per FullCalendar
const getBookingsAndPitches = async (req, res) => {
  try {
    // Recupera tutte le piazzole e formattale per FullCalendar
    const pitches = await Pitch.find()
      .populate('category', 'name')
      .sort({ name: 1 });

    const resources = pitches.map(pitch => ({
      id: pitch._id.toString(),
      title: `${pitch.name} (${pitch.category.name})`,
      categoryName: pitch.category.name
    }));

    // Recupera tutte le prenotazioni e formattale per FullCalendar
    const bookings = await Booking.find()
      .populate({
        path: 'pitch',
        select: 'name category',
        populate: {
          path: 'category',
          select: 'name'
        }
      })
      .populate('createdBy', 'username role')
      .sort({ startDate: 1 });

    // Costruisci mappa sfumature categoria->piazzole
    const pitchShadeMap = buildPitchShadeMap(pitches);

    // Formatta gli eventi per FullCalendar con sfumature per categoria
  const events = bookings.map((booking) => {
      const startFormatted = formatDateToDDMMYYYY(booking.startDate);
      const endFormatted = formatDateToDDMMYYYY(booking.endDate);
      
      // Colore dalla sfumatura della categoria della piazzola
  const eventColor = pitchShadeMap.get(booking.pitch._id.toString()) || getCategoryColor(booking.pitch.category.name);
  const eventTextColor = getReadableTextColor(eventColor);
      
      return {
        id: booking._id.toString(),
        resourceId: booking.pitch._id.toString(),
        title: `${booking.pitch.category.name} - ${booking.pitch.name}`,
        start: formatLocalYMD(booking.startDate),
        end: formatLocalYMD(booking.endDate),
        extendedProps: {
          guestName: booking.guestName,
          pitchId: booking.pitch._id.toString(),
          pitchName: booking.pitch.name,
          categoryId: booking.pitch.category._id.toString(),
          categoryName: booking.pitch.category.name,
          createdBy: booking.createdBy.username,
          createdByRole: booking.createdBy.role,
          duration: booking.getDuration(),
          createdAt: booking.createdAt,
          updatedAt: booking.updatedAt,
          startDateFormatted: startFormatted,
          endDateFormatted: endFormatted,
          checkedIn: booking.checkedIn,
          checkedOut: booking.checkedOut
        },
        className: `pitch-${booking.pitch._id.toString()}`,
        backgroundColor: eventColor,
  borderColor: eventColor,
  textColor: eventTextColor
      };
  });
  // Risposta in formato JSON per FullCalendar
    res.json({
      resources,
      events
    });

  } catch (error) {
    console.error('Errore nel recupero di prenotazioni e piazzole:', error);
    res.status(500).json({
      error: 'Errore nel recupero dei dati',
      message: 'Impossibile caricare prenotazioni e piazzole'
    });
  }
};

// Funzione per ottenere prenotazioni filtrate per data
const getBookingsByDateRange = async (req, res) => {
  try {
    const { start, end } = req.query;

    if (!start || !end) {
      return res.status(400).json({
        error: 'Parametri mancanti',
        message: 'Specificare date di inizio e fine'
      });
    }

    const startDate = new Date(start);
    const endDate = new Date(end);

    // Trova prenotazioni che si sovrappongono con il periodo richiesto
    const bookings = await Booking.find({
      $or: [
        { startDate: { $gte: startDate, $lte: endDate } },
        { endDate: { $gte: startDate, $lte: endDate } },
        { startDate: { $lte: startDate }, endDate: { $gte: endDate } }
      ]
    })
    .populate({
      path: 'pitch',
      select: 'name category',
      populate: { path: 'category', select: 'name' }
    })
    .populate('createdBy', 'username role')
    .sort({ startDate: 1 });

    // Prepara mappa sfumature su tutte le piazzole esistenti
    const allPitches = await Pitch.find().populate('category', 'name').sort({ name: 1 });
    const shadeMap = buildPitchShadeMap(allPitches);

    const events = bookings.map(booking => {
      const bg = shadeMap.get(booking.pitch._id.toString()) || getCategoryColor(booking.pitch.category.name);
      const fg = getReadableTextColor(bg);
      return {
        id: booking._id.toString(),
        resourceId: booking.pitch._id.toString(),
        title: booking.guestName,
        start: formatLocalYMD(booking.startDate),
        end: formatLocalYMD(booking.endDate),
        extendedProps: {
          guestName: booking.guestName,
          pitchName: booking.pitch.name,
          createdBy: booking.createdBy.username,
          duration: booking.getDuration(),
          checkedIn: booking.checkedIn,
          checkedOut: booking.checkedOut
        },
        backgroundColor: bg,
        borderColor: bg,
        textColor: fg
      };
    });

    res.json({ events });

  } catch (error) {
    console.error('Errore nel recupero prenotazioni per periodo:', error);
    res.status(500).json({
      error: 'Errore nel recupero dei dati',
      message: 'Impossibile caricare le prenotazioni per il periodo specificato'
    });
  }
};

// Funzione per ottenere statistiche della dashboard
const getDashboardStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const stats = {
      totalPitches: await Pitch.countDocuments(),
      totalBookings: await Booking.countDocuments(),
      activeBookings: await Booking.countDocuments({
        startDate: { $lte: today },
        endDate: { $gte: today }
      }),
      todayCheckIns: await Booking.countDocuments({
        startDate: { $gte: today, $lt: tomorrow }
      }),
      todayCheckOuts: await Booking.countDocuments({
        endDate: { $gte: today, $lt: tomorrow }
      })
    };

    res.json(stats);

  } catch (error) {
    console.error('Errore nel recupero delle statistiche:', error);
    res.status(500).json({
      error: 'Errore nel recupero delle statistiche'
    });
  }
};

// Funzione per creare una nuova prenotazione
const createBooking = async (req, res) => {
  try {
  const { guestName, start, end, pitchId, checkedIn, checkedOut } = req.body;

    // Validazione dei dati di input
    if (!guestName || !start || !end || !pitchId) {
      return res.status(400).json({
        error: 'Dati mancanti',
        message: 'Nome ospite, date di inizio e fine, e piazzola sono obbligatori'
      });
    }

    // Validazione delle date
    const startDate = new Date(start);
    const endDate = new Date(end);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({
        error: 'Date non valide',
        message: 'Le date fornite non sono in formato valido'
      });
    }

    if (endDate <= startDate) {
      return res.status(400).json({
        error: 'Date non valide',
        message: 'La data di fine deve essere successiva alla data di inizio'
      });
    }

    // Verifica che la piazzola esista
    const pitch = await Pitch.findById(pitchId);
    if (!pitch) {
      return res.status(404).json({
        error: 'Piazzola non trovata',
        message: 'La piazzola specificata non esiste'
      });
    }

    // Verifica disponibilità della piazzola
    const conflictingBooking = await Booking.checkAvailability(pitchId, startDate, endDate);
    if (conflictingBooking) {
      return res.status(409).json({
        error: 'Piazzola non disponibile',
        message: 'La piazzola è già prenotata per il periodo selezionato',
        conflictingBooking: {
          guestName: conflictingBooking.guestName,
          startDate: conflictingBooking.startDate,
          endDate: conflictingBooking.endDate
        }
      });
    }

    // Crea la nuova prenotazione
    const newBooking = new Booking({
      guestName: guestName.trim(),
      startDate: startDate,
      endDate: endDate,
      pitch: pitchId,
      createdBy: req.session.user.id,
      checkedIn: checkedIn === true || checkedIn === 'true' || checkedIn === 'on',
      checkedOut: checkedOut === true || checkedOut === 'true' || checkedOut === 'on'
    });

    await newBooking.save();

    // Popola i dati per la risposta
    await newBooking.populate('pitch', 'name category');
    await newBooking.populate('createdBy', 'username role');

    console.log(`Prenotazione creata: ${newBooking.guestName} (${pitch.name}) da ${req.session.user ? req.session.user.username : 'sconosciuto'}`);

  res.status(201).json({
      success: true,
      message: 'Prenotazione creata con successo',
      booking: newBooking
    });

  } catch (error) {
    console.error('Errore nella creazione della prenotazione:', error);
    
    // Gestione errori di validazione MongoDB
    if (error.name === 'ValidationError') {
      const errorMessages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        error: 'Errori di validazione',
        message: errorMessages.join(', ')
      });
    }

    res.status(500).json({
      error: 'Errore del server',
      message: 'Errore interno nella creazione della prenotazione'
    });
  }
};

// Funzione per aggiornare una prenotazione esistente
const updateBooking = async (req, res) => {
  try {
  const { bookingId } = req.params;
  const { guestName, start, end, pitchId, checkedIn, checkedOut } = req.body;

    // Verifica che la prenotazione esista
    const existingBooking = await Booking.findById(bookingId);
    if (!existingBooking) {
      return res.status(404).json({
        error: 'Prenotazione non trovata',
        message: 'La prenotazione specificata non esiste'
      });
    }

    // Prepara i dati per l'aggiornamento
    const updateData = {};
    
  if (guestName && guestName.trim() !== '') {
      updateData.guestName = guestName.trim();
    }

    if (start) {
      const startDate = new Date(start);
      if (isNaN(startDate.getTime())) {
        return res.status(400).json({
          error: 'Data di inizio non valida',
          message: 'La data di inizio fornita non è in formato valido'
        });
      }
      updateData.startDate = startDate;
    }

    if (end) {
      const endDate = new Date(end);
      if (isNaN(endDate.getTime())) {
        return res.status(400).json({
          error: 'Data di fine non valida',
          message: 'La data di fine fornita non è in formato valido'
        });
      }
      updateData.endDate = endDate;
    }

  if (pitchId) {
      // Verifica che la piazzola esista
      const pitch = await Pitch.findById(pitchId);
      if (!pitch) {
        return res.status(404).json({
          error: 'Piazzola non trovata',
          message: 'La piazzola specificata non esiste'
        });
      }
      updateData.pitch = pitchId;
    }
    // Aggiorna flag check-in/out se presenti
    if (typeof checkedIn !== 'undefined') {
      updateData.checkedIn = (checkedIn === true || checkedIn === 'true' || checkedIn === 'on');
    }
    if (typeof checkedOut !== 'undefined') {
      updateData.checkedOut = (checkedOut === true || checkedOut === 'true' || checkedOut === 'on');
      if (updateData.checkedOut && updateData.checkedIn === undefined) {
        // Se si marca checkout, assicura checkedIn
        updateData.checkedIn = true;
      }
    }

    // Validazione delle date se entrambe sono fornite o una è cambiata
    const finalStartDate = updateData.startDate || existingBooking.startDate;
    const finalEndDate = updateData.endDate || existingBooking.endDate;

    if (finalEndDate <= finalStartDate) {
      return res.status(400).json({
        error: 'Date non valide',
        message: 'La data di fine deve essere successiva alla data di inizio'
      });
    }

    // Verifica disponibilità se le date o la piazzola sono cambiate
    const finalPitchId = updateData.pitch || existingBooking.pitch;
    if (updateData.startDate || updateData.endDate || updateData.pitch) {
      const conflictingBooking = await Booking.checkAvailability(
        finalPitchId, 
        finalStartDate, 
        finalEndDate, 
        bookingId // Esclude la prenotazione corrente dal controllo
      );
      
      if (conflictingBooking) {
        return res.status(409).json({
          error: 'Piazzola non disponibile',
          message: 'La piazzola è già prenotata per il periodo selezionato',
          conflictingBooking: {
            guestName: conflictingBooking.guestName,
            startDate: conflictingBooking.startDate,
            endDate: conflictingBooking.endDate
          }
        });
      }
    }

    // Aggiorna la prenotazione
    const updatedBooking = await Booking.findByIdAndUpdate(
      bookingId,
  updateData,
      { new: true, runValidators: true }
    );

    // Popola i dati per la risposta
  await updatedBooking.populate('pitch', 'name category');
    await updatedBooking.populate('createdBy', 'username role');

    console.log(`Prenotazione aggiornata: ${updatedBooking.guestName} (ID: ${bookingId}) da ${req.session.user ? req.session.user.username : 'sconosciuto'}`);

    res.json({
      success: true,
      message: 'Prenotazione aggiornata con successo',
      booking: updatedBooking
    });

  } catch (error) {
    console.error('Errore nell\'aggiornamento della prenotazione:', error);
    
    // Gestione errori di validazione MongoDB
    if (error.name === 'ValidationError') {
      const errorMessages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        error: 'Errori di validazione',
        message: errorMessages.join(', ')
      });
    }

    res.status(500).json({
      error: 'Errore del server',
      message: 'Errore interno nell\'aggiornamento della prenotazione'
    });
  }
};

// Aggiorna solo check-in / check-out (permesso a tutti gli utenti autenticati)
const updateBookingCheckStatus = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { checkedIn, checkedOut } = req.body;

    const existingBooking = await Booking.findById(bookingId);
    if (!existingBooking) {
      return res.status(404).json({ error: 'Prenotazione non trovata' });
    }

    const updateData = {};
    if (typeof checkedIn !== 'undefined') {
      updateData.checkedIn = (checkedIn === true || checkedIn === 'true' || checkedIn === 'on');
    }
    if (typeof checkedOut !== 'undefined') {
      updateData.checkedOut = (checkedOut === true || checkedOut === 'true' || checkedOut === 'on');
      if (updateData.checkedOut && updateData.checkedIn === undefined) {
        updateData.checkedIn = true; // se fai checkout, forza check-in
      }
    }

    const updated = await Booking.findByIdAndUpdate(bookingId, updateData, { new: true, runValidators: true });
    await updated.populate('pitch', 'name category');
    await updated.populate('createdBy', 'username role');
    return res.json({ success: true, message: 'Stato aggiornato', booking: updated });
  } catch (error) {
    console.error('Errore aggiornando check-status:', error);
    return res.status(500).json({ error: 'Errore del server' });
  }
};

// Funzione per eliminare una prenotazione
const deleteBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;

    // Verifica che la prenotazione esista
    const existingBooking = await Booking.findById(bookingId);
    if (!existingBooking) {
      return res.status(404).json({
        error: 'Prenotazione non trovata',
        message: 'La prenotazione specificata non esiste'
      });
    }

    // Popola i dati per il logging
    await existingBooking.populate('pitch', 'name');
    await existingBooking.populate('createdBy', 'username');

    // Elimina la prenotazione
    await Booking.findByIdAndDelete(bookingId);

    console.log(`Prenotazione eliminata: ${existingBooking.guestName} (${existingBooking.pitch.name}) da ${req.session.user ? req.session.user.username : 'sconosciuto'}`);

    res.json({
      success: true,
      message: 'Prenotazione eliminata con successo'
    });

  } catch (error) {
    console.error('Errore nell\'eliminazione della prenotazione:', error);
    res.status(500).json({
      error: 'Errore del server',
      message: 'Errore interno nell\'eliminazione della prenotazione'
    });
  }
};

// Funzione helper per determinare il colore delle prenotazioni
function getBookingColor(role) {
  switch (role) {
    case 'admin':
      return '#dc3545'; // Rosso per admin
    case 'operator':
      return '#007bff'; // Blu per operator
    default:
      return '#6c757d'; // Grigio per ruoli sconosciuti
  }
}

// Funzione per ottenere tutte le categorie
const getCategories = async (req, res) => {
  try {
    const Category = require('../models/Category');
    const categories = await Category.find().sort({ name: 1 });
    res.json(categories);
  } catch (error) {
    console.error('Errore nel recupero delle categorie:', error);
    res.status(500).json({
      error: true,
      message: 'Errore interno nel recupero delle categorie'
    });
  }
};

// Funzione per ottenere piazzole disponibili per categoria e periodo
const getAvailablePitches = async (req, res) => {
  try {
    const { categoryId, startDate, endDate, excludeBookingId } = req.query;
    
    if (!categoryId) {
      return res.status(400).json({
        error: true,
        message: 'ID categoria richiesto'
      });
    }

    // Query base per le piazzole della categoria
    const pitches = await Pitch.find({ category: categoryId })
      .populate('category', 'name')
      .sort({ name: 1 });

    // Se mancano le date, ritorna tutte le piazzole della categoria
    if (!startDate || !endDate) {
      return res.json(pitches);
    }

    // Usa le stesse regole di sovrapposizione di Booking.checkAvailability (no normalizzazione)
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Limita la ricerca prenotazioni alle piazzole di questa categoria
    const pitchIdsInCategory = pitches.map(p => p._id);

    const bookingQuery = {
      pitch: { $in: pitchIdsInCategory },
      $or: [
        { startDate: { $lt: end, $gte: start } },
        { endDate: { $gt: start, $lte: end } },
        { startDate: { $lte: start }, endDate: { $gte: end } }
      ]
    };

    if (excludeBookingId) {
      bookingQuery._id = { $ne: excludeBookingId };
    }

    const overlappingBookings = await Booking.find(bookingQuery).select('pitch');

    const bookedPitchIds = new Set(
      overlappingBookings.map(b => String(b.pitch && b.pitch._id ? b.pitch._id : b.pitch))
    );

    const available = pitches.filter(p => !bookedPitchIds.has(String(p._id)));

    return res.json(available);
  } catch (error) {
    console.error('Errore nel recupero delle piazzole disponibili:', error);
    res.status(500).json({
      error: true,
      message: 'Errore interno nel recupero delle piazzole disponibili'
    });
  }
};

// Endpoint: lista piazzole con giorni rimanenti liberi a partire da una data
const getDailyPitchAvailability = async (req, res) => {
  try {
    const { date } = req.query; // YYYY-MM-DD
    if (!date) {
      return res.status(400).json({ error: true, message: 'Data richiesta (date=YYYY-MM-DD)' });
    }
    const base = new Date(date + 'T00:00:00'); // mezzanotte locale del giorno richiesto
    const ONE_DAY = 1000*60*60*24;
    const baseNext = new Date(base.getTime() + ONE_DAY); // giorno successivo (range half-open [base, baseNext))
    // Carica tutte le piazzole
    const pitches = await Pitch.find().populate('category', 'name').sort({ name: 1 });
    const pitchIds = pitches.map(p => p._id);
    // Unica query: tutte le prenotazioni che non sono terminate prima del giorno (endDate > base)
    const futureBookings = await Booking.find({
      pitch: { $in: pitchIds },
      endDate: { $gt: base } // esclude solo prenotazioni completamente concluse prima del giorno
  }).select('pitch startDate endDate').sort({ startDate: 1 });

    // Raggruppa per piazzola
    const byPitch = new Map();
    futureBookings.forEach(b => {
      const k = b.pitch && b.pitch._id ? b.pitch._id.toString() : b.pitch.toString();
      if (!byPitch.has(k)) byPitch.set(k, []);
      byPitch.get(k).push(b);
    });
    const todayMid = new Date(base.getFullYear(), base.getMonth(), base.getDate());

    const debugMode = req.query.debug === '1' || req.query.debug === 'true';
    const result = pitches.map(p => {
  const list = byPitch.get(p._id.toString()) || [];
      // Ordina ulteriormente per sicurezza
      list.sort((a,b)=>a.startDate - b.startDate);
      // Occupato se esiste prenotazione che interseca l'intervallo [base, baseNext): start < baseNext && end > base
      let occupied = false;
      let nextStart = null;
      for (const b of list) {
        const bs = b.startDate;
        const be = b.endDate;
        if (bs < baseNext && be > base) { // overlap half-open
          // Se la prenotazione inizia dopo il base ma comunque interseca (caso stesso giorno check-in) è occupata.
          occupied = true;
          break;
        }
        if (bs >= baseNext) { // candidato come prossima prenotazione successiva al giorno
          nextStart = bs;
          break; // primo futuro sufficiente
        }
      }
      if (occupied) return null;
      let daysFree = null;
      let nextBookingStartStr = null;
      if (nextStart) {
        const diff = Math.round((nextStart - base)/ONE_DAY); // diff >=1
        // Politica: diff = numero di giorni disponibili includendo il giorno corrente fino al giorno prima di nextStart
        // Se cambi volessi escludere oggi basterebbe diff-1 (ma non negativo).
        daysFree = diff;
        nextBookingStartStr = nextStart.toISOString().split('T')[0];
      }
      const payload = {
        _id: p._id,
        name: p.name,
        category: p.category ? { _id: p.category._id, name: p.category.name } : null,
        daysFree
      };
      if (debugMode) {
        payload.debug = {
          bookings: list.map(b=>({s:b.startDate, e:b.endDate})),
          nextBookingStart: nextBookingStartStr
        };
      }
      return payload;
    }).filter(Boolean);

    res.json(result);
  } catch (error) {
    console.error('Errore nel calcolo disponibilità giornaliera:', error);
    res.status(500).json({ error: true, message: 'Errore interno nel calcolo disponibilità' });
  }
};

// Funzione per ottenere tutte le piazzole
const getPitches = async (req, res) => {
  try {
    const pitches = await Pitch.find().populate('category');
    res.json(pitches);
  } catch (error) {
    console.error('Errore nel recupero delle piazzole:', error);
    res.status(500).json({ message: 'Errore nel recupero delle piazzole' });
  }
};

// Funzione per ottenere una singola piazzola
const getPitchById = async (req, res) => {
  try {
    const pitch = await Pitch.findById(req.params.id).populate('category');
    if (!pitch) {
      return res.status(404).json({ message: 'Piazzola non trovata' });
    }
    res.json(pitch);
  } catch (error) {
    console.error('Errore nel recupero della piazzola:', error);
    res.status(500).json({ message: 'Errore nel recupero della piazzola' });
  }
};

module.exports = {
  renderDashboard,
  getBookingsAndPitches,
  getBookingsByDateRange,
  getDashboardStats,
  createBooking,
  updateBooking,
  deleteBooking,
  updateBookingCheckStatus,
  getCategories,
  getAvailablePitches,
  getDailyPitchAvailability,
  getPitches,
  getPitchById
};
