const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Importa i modelli
const Operator = require('./models/Operator');
const Category = require('./models/Category');
const Pitch = require('./models/Pitch');
const Booking = require('./models/Booking');

// Connessione al database
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connessione a MongoDB riuscita');
  } catch (error) {
    console.error('Errore nella connessione a MongoDB:', error);
    process.exit(1);
  }
}

// Funzione per creare utenti di default
async function createDefaultUsers() {
  try {
    console.log('🌱 Creazione utenti di esempio...');
    
    // Password di default hashata
    const defaultPassword = await bcrypt.hash('password123', 10);
    const adminPassword = await bcrypt.hash('admin123', 10);
    
    const operators = [
        {
            username: 'admin',
            email: 'admin@ecogarden.com',
            password: adminPassword,
            role: 'admin',
            isActive: true
        },
        {
            username: 'operatore1',
            email: 'operatore1@ecogarden.com',
            password: defaultPassword,
            role: 'operator',
            isActive: true
        },
        {
            username: 'visualizzatore1',
            email: 'viewer1@ecogarden.com',
            password: defaultPassword,
            role: 'viewer',
            isActive: true
        },
        {
            username: 'operatore2',
            email: 'operatore2@ecogarden.com',
            password: defaultPassword,
            role: 'operator',
            isActive: false
        }
    ];
    
    await Operator.deleteMany({});
    const createdOperators = await Operator.insertMany(operators);
    console.log(`✅ ${createdOperators.length} utenti creati`);
    
    // Trova l'admin per le prenotazioni
    const adminUser = createdOperators.find(op => op.role === 'admin');

  } catch (error) {
    console.error('Errore nella creazione degli utenti:', error);
  }
}

// Funzione per creare categorie di default
async function createDefaultCategories() {
  try {
    console.log('Creazione categorie di default...');

    // Controlla se esistono già categorie
    const existingCategories = await Category.countDocuments();
    if (existingCategories > 0) {
      console.log('Categorie già esistenti nel database');
      return;
    }

    const categories = [
      { name: 'Tende' },
      { name: 'Camper' },
      { name: 'Bungalow' },
      { name: 'Roulotte' }
    ];

    await Category.insertMany(categories);
    console.log('✅ Categorie create con successo: Tende, Camper, Bungalow, Roulotte');

  } catch (error) {
    console.error('Errore nella creazione delle categorie:', error);
  }
}

// Funzione per creare piazzole di default
async function createDefaultPitches() {
  try {
    console.log('Creazione piazzole di default...');

    // Controlla se esistono già piazzole
    const existingPitches = await Pitch.countDocuments();
    if (existingPitches > 0) {
      console.log('Piazzole già esistenti nel database');
      return;
    }

    // Recupera le categorie
    const categories = await Category.find();
    if (categories.length === 0) {
      console.log('Nessuna categoria trovata. Creando prima le categorie...');
      await createDefaultCategories();
      return createDefaultPitches(); // Riprova dopo aver creato le categorie
    }

    const tendeCategory = categories.find(cat => cat.name === 'Tende');
    const camperCategory = categories.find(cat => cat.name === 'Camper');
    const bungalowCategory = categories.find(cat => cat.name === 'Bungalow');

    const pitches = [];

    // Piazzole per tende (1-20)
    if (tendeCategory) {
      for (let i = 1; i <= 20; i++) {
        pitches.push({
          name: `Piazzola Tenda ${i.toString().padStart(2, '0')}`,
          category: tendeCategory._id
        });
      }
    }

    // Piazzole per camper (21-35)
    if (camperCategory) {
      for (let i = 21; i <= 35; i++) {
        pitches.push({
          name: `Piazzola Camper ${i}`,
          category: camperCategory._id
        });
      }
    }

    // Bungalow (1-10)
    if (bungalowCategory) {
      const bungalowNames = [
        'Bungalow Girasole',
        'Bungalow Rosa',
        'Bungalow Margherita',
        'Bungalow Tulipano',
        'Bungalow Orchidea',
        'Bungalow Violetta',
        'Bungalow Lavanda',
        'Bungalow Gelsomino',
        'Bungalow Mimosa',
        'Bungalow Azalea'
      ];

      bungalowNames.forEach(name => {
        pitches.push({
          name: name,
          category: bungalowCategory._id
        });
      });
    }

    await Pitch.insertMany(pitches);
    console.log(`✅ Create ${pitches.length} piazzole di default`);

  } catch (error) {
    console.error('Errore nella creazione delle piazzole:', error);
  }
}

// Funzione per creare prenotazioni di test
async function createTestBookings() {
  try {
    console.log('Creazione prenotazioni di test...');

    // Controlla se esistono già prenotazioni
    const existingBookings = await Booking.countDocuments();
    if (existingBookings > 0) {
      console.log('Prenotazioni già esistenti nel database');
      return;
    }

    // Recupera alcuni operatori e piazzole
    const admin = await Operator.findOne({ role: 'admin' });
    const operator = await Operator.findOne({ role: 'operator' });
    const pitches = await Pitch.find().limit(5);

    if (!admin || !operator || pitches.length === 0) {
      console.log('Impossibile creare prenotazioni di test: mancano operatori o piazzole');
      return;
    }

    const today = new Date();
    const testBookings = [];

    // Prenotazione per oggi
    testBookings.push({
      guestName: 'Mario Rossi',
      pitch: pitches[0]._id,
      startDate: new Date(today),
      endDate: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000), // +3 giorni
      createdBy: admin._id
    });

    // Prenotazione futura
    const futureDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000); // +7 giorni
    testBookings.push({
      guestName: 'Giulia Bianchi',
      pitch: pitches[1]._id,
      startDate: futureDate,
      endDate: new Date(futureDate.getTime() + 2 * 24 * 60 * 60 * 1000), // +2 giorni
      createdBy: operator._id
    });

    // Prenotazione passata
    const pastDate = new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000); // -5 giorni
    testBookings.push({
      guestName: 'Luca Verdi',
      pitch: pitches[2]._id,
      startDate: pastDate,
      endDate: new Date(pastDate.getTime() + 3 * 24 * 60 * 60 * 1000), // +3 giorni dal passato
      createdBy: admin._id
    });

    await Booking.insertMany(testBookings);
    console.log(`✅ Create ${testBookings.length} prenotazioni di test`);

  } catch (error) {
    console.error('Errore nella creazione delle prenotazioni di test:', error);
  }
}

// Funzione principale
async function seedDatabase() {
  console.log('🌱 Inizializzazione database EcoGarden...\n');

  await connectDB();

  await createDefaultUsers();
  await createDefaultCategories();
  await createDefaultPitches();
  await createTestBookings();

  console.log('\n✅ Inizializzazione database completata!');
  console.log('\n📋 Credenziali di accesso:');
  console.log('   🔑 Admin: username="admin", password="admin123", ruolo="admin"');
  console.log('   👤 Operatore: username="operatore1", password="password123", ruolo="operator"');
  console.log('   👁️  Visualizzatore: username="visualizzatore1", password="password123", ruolo="viewer"');
  console.log('   ⚠️  Operatore Disattivo: username="operatore2", password="password123", ruolo="operator" (disattivato)');
  console.log('\n🚀 Avvia il server con: npm run dev');
  
  process.exit(0);
}

// Gestione errori
process.on('unhandledRejection', (err) => {
  console.error('Errore non gestito:', err);
  process.exit(1);
});

// Avvia il seeding
seedDatabase();
