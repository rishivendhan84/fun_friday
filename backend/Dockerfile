FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src
COPY sql ./sql

EXPOSE 4000
USER node
CMD ["node", "src/server.js"]
