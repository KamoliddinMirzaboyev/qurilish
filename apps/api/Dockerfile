FROM node:20-alpine AS base
RUN apk add --no-cache openssl
WORKDIR /repo

FROM base AS deps
COPY package.json package-lock.json* ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/api/package.json apps/api/package.json
RUN npm install --workspace=@buildscience/shared --workspace=@buildscience/api --include-workspace-root

FROM deps AS build
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN npm run build --workspace=@buildscience/shared \
  && npm run db:generate --workspace=@buildscience/api \
  && npm run build --workspace=@buildscience/api

FROM base AS runner
ENV NODE_ENV=production
COPY --from=build /repo/package.json /repo/package.json
COPY --from=build /repo/node_modules /repo/node_modules
COPY --from=build /repo/packages/shared /repo/packages/shared
COPY --from=build /repo/apps/api/dist /repo/apps/api/dist
COPY --from=build /repo/apps/api/prisma /repo/apps/api/prisma
COPY --from=build /repo/apps/api/package.json /repo/apps/api/package.json

WORKDIR /repo/apps/api
RUN mkdir -p uploads && chown -R node:node /repo
USER node
EXPOSE 4000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
