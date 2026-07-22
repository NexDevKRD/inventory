FROM node:20-alpine
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci

COPY . .
RUN npx prisma generate --schema apps/api/prisma/schema.prisma

WORKDIR /app/apps/api
EXPOSE 4000

CMD ["sh", "-c", "npx prisma migrate deploy && npx tsx prisma/seed.ts && npx tsx watch src/server.ts"]
