FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production

# Install deps (tsx runs TypeScript directly — no separate build step).
COPY package.json package-lock.json* ./
RUN npm install

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src

EXPOSE 4000

# Apply the schema (idempotent) then boot the API + WS server.
CMD ["sh", "-c", "npx prisma db push --skip-generate --accept-data-loss && npm run start"]
