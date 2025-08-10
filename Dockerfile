FROM node:20-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
ENV NODE_ENV=production
RUN npm ci --only=production || npm ci

# Bundle app source
COPY . .

# Expose port
EXPOSE 3000

# Start the app
CMD ["node", "index.js"]
