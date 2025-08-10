# EcoGarden - Sistema di Gestione Camping

EcoGarden è un sistema completo di gestione per camping e aree di sosta, sviluppato in Node.js con Express, MongoDB e un'interfaccia web responsive basata su Bootstrap e FullCalendar.

## 🌟 Funzionalità Principali

### 📅 Gestione Prenotazioni
- **Calendario Interattivo**: Visualizza tutte le prenotazioni in un calendario FullCalendar personalizzato
- **Creazione Prenotazioni**: Modal intuitivo per creare nuove prenotazioni con validazione automatica
- **Modifica/Eliminazione**: Possibilità di modificare o eliminare prenotazioni esistenti
- **Controllo Disponibilità**: Verifica automatica della disponibilità delle piazzole per periodo selezionato

### 🏕️ Gestione Struttura
- **Categorie Piazzole**: Organizzazione delle piazzole in categorie (es. Tenda, Camper, Roulotte)
- **Piazzole**: Gestione completa delle piazzole con associazione alle categorie
- **Colori Personalizzati**: Ogni piazzola ha un colore distintivo per una facile identificazione visiva
- **Ordinamento**: Piazzole ordinate per categoria e nome per una visualizzazione organizzata

### 👥 Sistema di Autenticazione
- **Login Sicuro**: Sistema di autenticazione con bcryptjs per password crittografate
- **Ruoli Utente**: Tre livelli di accesso:
  - **Visualizzatore**: Solo lettura del calendario e prenotazioni
  - **Operatore**: Visualizzazione + creazione/modifica prenotazioni
  - **Amministratore**: Accesso completo + gestione utenti e configurazioni
- **Gestione Utenti**: Gli admin possono creare, modificare e eliminare utenti
- **Controllo Permessi**: Sistema granulare di controllo accessi per ogni funzionalità
- **Sessioni**: Gestione delle sessioni utente con express-session
- **Controllo Accessi**: Middleware per proteggere le route sensibili

### 📊 Dashboard e Statistiche
- **Statistiche in Tempo Reale**: Contatori delle prenotazioni attive, piazzole occupate, ecc.
- **Interfaccia Amministrativa**: Pannello admin per gestire utenti, categorie e piazzole
- **Dashboard Responsive**: Interfaccia ottimizzata per desktop, tablet e mobile

### 📱 Design Responsive
- **Mobile-First**: Design ottimizzato per dispositivi mobili
- **Modal a Schermo Intero**: Su mobile, i modal si aprono a schermo intero per una migliore usabilità
- **FAB (Floating Action Button)**: Pulsante di azione flottante per aggiungere prenotazioni su mobile

## 🛠️ Tecnologie Utilizzate

### Backend
- **Node.js** (v14+): Runtime JavaScript
- **Express.js** (v4.18.2): Framework web
- **MongoDB**: Database NoSQL
- **Mongoose** (v7.5.0): ODM per MongoDB
- **bcryptjs**: Crittografia password
- **express-session**: Gestione sessioni
- **dotenv**: Gestione variabili d'ambiente

### Frontend
- **EJS** (v3.1.9): Template engine
- **Bootstrap** (v5.3.2): Framework CSS
- **FullCalendar** (v6.1.15): Libreria calendario (installazione locale)
- **Bootstrap Icons**: Set di icone
- **JavaScript Vanilla**: Logica frontend

### Database Schema
```javascript
// Operatore
{
  username: String (unique),
  email: String (unique),
  password: String (hashed),
  role: String (enum: ['viewer', 'operator', 'admin']),
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}

// Categoria
{
  name: String (unique),
  description: String,
  createdAt: Date
}

// Piazzola
{
  name: String (unique),
  category: ObjectId (ref: Category),
  createdAt: Date
}

// Prenotazione
{
  guestName: String,
  startDate: Date,
  endDate: Date,
  pitch: ObjectId (ref: Pitch),
  createdBy: ObjectId (ref: Operator),
  createdAt: Date
}
```

## 🚀 Installazione e Configurazione

### Prerequisiti
- Node.js (versione 14 o superiore)
- MongoDB (locale o cloud - MongoDB Atlas)
- npm o yarn

### 1. Clonazione del Repository
```bash
git clone <url-repository>
cd EcoGarden
```

### 2. Installazione Dipendenze
```bash
npm install
```

### 3. Configurazione Ambiente
Crea un file `.env` nella root del progetto:
```env
# Database
MONGODB_URI=mongodb://localhost:27017/ecogarden
# o per MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/ecogarden

# Server
PORT=3000

# Session Secret (genera una stringa casuale sicura)
SESSION_SECRET=la_tua_stringa_segreta_molto_lunga_e_casuale

# Ambiente
NODE_ENV=development
```

### 4. Inizializzazione Database (seed completo demo)
Esegui lo script di seed per creare dati di esempio:
```bash
npm run seed
# oppure
node seed.js
```

Questo creerà:
- Un utente admin (username: `admin`, password: `admin123`, ruolo: `admin`)
- Utenti di esempio con diversi ruoli (viewer, operator)
- Categorie di esempio (Tenda, Camper, Roulotte)
- Piazzole di esempio
- Alcune prenotazioni di test

### 4.1. Seed solo amministratore (input da CLI)
Puoi creare solo un account amministratore fornendo username e password da input/argomenti:
```bash
# interattivo
npm run seed:admin

# oppure con argomenti
node seed-admin.js --username admin --password admin123
```
Questo script crea (o aggiorna) un utente con ruolo `admin` e `isActive: true` senza modificare altri utenti.

### 5. Avvio dell'Applicazione

#### Sviluppo
```bash
npm run dev
# oppure
npm start
```

#### Produzione
```bash
NODE_ENV=production npm start
```

L'applicazione sarà disponibile su `http://localhost:3000`

## 🖥️ Deployment su Server

### Opzione 1: Server VPS/Dedicato

#### Preparazione Server
```bash
# Aggiorna il sistema
sudo apt update && sudo apt upgrade -y

# Installa Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Installa MongoDB
sudo apt-get install -y mongodb

# Installa PM2 per la gestione dei processi
sudo npm install -g pm2
```

#### Deploy dell'Applicazione
```bash
# Clona il repository
git clone <url-repository>
cd EcoGarden

# Installa dipendenze
npm install --production

# Copia il file di configurazione
cp .env.example .env
# Modifica .env con i valori di produzione

# Avvia con PM2
pm2 start index.js --name "ecogarden"
pm2 startup
pm2 save
```

#### Configurazione Nginx (opzionale)
```nginx
server {
    listen 80;
    server_name tuo-dominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Opzione 2: Heroku

#### Preparazione
```bash
# Installa Heroku CLI
npm install -g heroku

# Login
heroku login

# Crea app
heroku create nome-tua-app
```

#### Configurazione
```bash
# Aggiungi MongoDB Atlas
heroku addons:create mongolab:sandbox

# Configura variabili d'ambiente
heroku config:set SESSION_SECRET=la_tua_stringa_segreta
heroku config:set NODE_ENV=production

# Deploy
git add .
git commit -m "Deploy to Heroku"
git push heroku main
```

### Opzione 3: Docker

#### Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
```

#### docker-compose.yml (app + MongoDB)
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - MONGODB_URI=mongodb://mongo:27017/ecogarden
      - SESSION_SECRET=your-secret-key
    depends_on:
      - mongo

  mongo:
    image: mongo:5
    volumes:
      - mongodb_data:/data/db
    ports:
      - "27017:27017"

volumes:
  mongodb_data:
```

### Avvio con Docker Compose (app + MongoDB)

È incluso un file `docker-compose.yml` pronto all'uso.

Comandi principali:

```bash
# build e avvio in background
docker compose up -d --build

# verificare i servizi
docker compose ps

# log (Mongo)
docker compose logs -f mongo

# log (app)
docker compose logs -f app

# eseguire seed admin-only (interattivo)
docker compose exec app node seed-admin.js

# seed admin-only con argomenti
docker compose exec app node seed-admin.js --username admin --password admin123

# spegnere i servizi
docker compose down
```

Nota:
- L’app legge `MONGODB_URI` già puntata al servizio `mongo`.
- I dati Mongo sono persistenti nel volume `mongodb_data`.

## 📖 Utilizzo

### Primo Accesso
1. Naviga su `http://localhost:3000`
2. Effettua il login con:
   - **Username**: `admin`
   - **Password**: `admin123`

### Gestione Prenotazioni
1. **Vista Calendario**: Usa la vista mensile o la lista settimanale su mobile
2. **Nuova Prenotazione**: 
   - Clicca su una data libera o usa il pulsante "+"
   - Compila il form con nome ospite, date e piazzola
3. **Modifica Prenotazione**: Clicca su una prenotazione esistente

### Pannello Amministrativo
Gli amministratori possono accedere al pannello admin per:
- **Gestire Utenti**: Creare, modificare, eliminare utenti e assegnare ruoli
- **Controllo Permessi**: Assegnare livelli di accesso (Visualizzatore, Operatore, Admin)
- **Gestire Operatori**: Attivare/disattivare account utente
- **Creare/modificare Categorie**: Gestione delle categorie piazzole
- **Aggiungere/rimuovere Piazzole**: Configurazione delle piazzole disponibili

## 🔧 API Endpoints

### Autenticazione
- `POST /auth/login` - Login utente
- `POST /auth/logout` - Logout utente

### Gestione Utenti (Solo Admin)
- `GET /api/users` - Lista utenti
- `POST /api/users` - Crea nuovo utente
- `PUT /api/users/:id` - Modifica utente
- `DELETE /api/users/:id` - Elimina utente
- `PUT /api/users/:id/toggle-status` - Attiva/disattiva utente

### Prenotazioni
- `POST /api/bookings` - Crea prenotazione
- `PUT /api/bookings/:bookingId` - Modifica prenotazione
- `DELETE /api/bookings/:bookingId` - Elimina prenotazione
- `GET /api/bookings/range?start=ISO&end=ISO` - Lista prenotazioni in un intervallo

### Piazzole e Categorie
- `GET /api/pitches` - Lista piazzole
- `GET /api/pitches/:id` - Dettagli piazzola
- `GET /api/categories` - Lista categorie
- `GET /api/available-pitches?categoryId=&startDate=&endDate=&excludeBookingId=` - Piazzole disponibili per periodo

### Dati Dashboard
- `GET /api/data` - Dati completi per calendario
- `GET /api/stats` - Statistiche dashboard

## 🐛 Troubleshooting

### Problemi Comuni

#### Errore di Connessione MongoDB
```bash
# Verifica che MongoDB sia avviato
sudo systemctl status mongodb
# o
mongod --version
```

#### Porte già in uso
```bash
# Cambia porta nel file .env
PORT=3001
```

#### Problemi di Permessi
```bash
# Assicurati che Node.js abbia i permessi necessari
sudo chown -R $USER:$USER /path/to/ecogarden
```

## 📝 Contributi

1. Fork del repository
2. Crea un branch per la feature (`git checkout -b feature/AmazingFeature`)
3. Commit delle modifiche (`git commit -m 'Add some AmazingFeature'`)
4. Push al branch (`git push origin feature/AmazingFeature`)
5. Apri una Pull Request

## 📄 Licenza

Al momento questo progetto non ha una licenza pubblica. Tutti i diritti sono riservati al proprietario del repository.

Se desideri adottare una licenza open source in futuro, aggiungi un file `LICENSE` alla root (ad es. MIT, Apache-2.0, GPL-3.0) e aggiorna questa sezione di conseguenza.

## 🆘 Supporto

Per supporto o domande:
- Apri un issue su GitHub
- Controlla la documentazione API
- Verifica i log dell'applicazione in `/logs` (se configurato)

## 🔄 Aggiornamenti Futuri

### Funzionalità Pianificate
- [ ] Sistema di notifiche email
- [ ] Esportazione dati in PDF/Excel
- [ ] Sistema di pagamenti integrato
- [ ] App mobile React Native
- [ ] API REST complete
- [ ] Sistema di backup automatico
- [ ] Multi-lingua (i18n)
- [ ] Reportistica avanzata
- [ ] Audit log delle azioni utente
- [ ] Sistema di permessi granulari per singole piazzole
- [ ] Integrazione con sistemi di pagamento online

---

**EcoGarden** - Sistema di Gestione Camping Moderno e Responsive 🏕️
