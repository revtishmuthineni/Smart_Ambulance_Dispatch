FROM node:20-alpine AS deps
WORKDIR /app
COPY backend/package*.json ./
RUN npm install --production

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY backend/ .
ENV NODE_ENV=production
EXPOSE 5000
CMD ["node", "server.js"]
