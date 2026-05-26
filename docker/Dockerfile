FROM node:18-alpine
RUN apk add bash
WORKDIR /app
ADD ./ .
RUN npm install
RUN npm run build
CMD npm start
