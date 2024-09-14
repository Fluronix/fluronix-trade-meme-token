FROM node:18-alpine

WORKDIR /fluronix-trade-meme-token

COPY package*.json ./

RUN npm install

COPY . .

RUN npm install -g typescript

RUN tsc

# CMD ["sh", "-c", "node src/histmanage.js & node src/main.js "]