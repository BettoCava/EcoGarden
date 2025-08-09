const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const Operator = require('./models/Operator');

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--username' && args[i+1]) out.username = args[++i];
    else if (args[i] === '--password' && args[i+1]) out.password = args[++i];
  }
  return out;
}

async function prompt(question) {
  return new Promise((resolve) => {
    process.stdout.write(question);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    process.stdin.once('data', (data) => {
      process.stdin.pause();
      resolve(data.toString().trim());
    });
  });
}

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connessione a MongoDB riuscita');
  } catch (error) {
    console.error('Errore nella connessione a MongoDB:', error.message);
    process.exit(1);
  }
}

async function createOrUpdateAdmin(username, password) {
  try {
    const hashed = await bcrypt.hash(password, 10);

    const update = {
      username,
      email: `${username}@ecogarden.local`,
      password: hashed,
      role: 'admin',
      isActive: true
    };

    const opts = { upsert: true, new: true, setDefaultsOnInsert: true };
    const admin = await Operator.findOneAndUpdate({ username }, update, opts);

    console.log(`✅ Admin pronto: username="${admin.username}"`);
  } catch (error) {
    console.error('Errore nella creazione/aggiornamento admin:', error.message);
    process.exit(1);
  }
}

(async function main() {
  const args = parseArgs();
  let { username, password } = args;

  if (!username) username = await prompt('Inserisci username admin: ');
  if (!password) password = await prompt('Inserisci password admin: ');

  if (!username || !password) {
    console.error('Username e password sono obbligatori.');
    process.exit(1);
  }

  await connectDB();
  await createOrUpdateAdmin(username, password);
  await mongoose.disconnect();
  process.exit(0);
})();
