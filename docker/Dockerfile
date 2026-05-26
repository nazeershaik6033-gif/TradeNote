FROM node:18-alpine
RUN apk add --no-cache bash python3 make g++
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN npm run build
CMD npm start
