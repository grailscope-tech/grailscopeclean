# GrailScope API (Express + live connectors). Builds the whole workspace so the
# server can import @grailscope/core directly. Node 22 = built-in node:sqlite.
FROM node:22-alpine

WORKDIR /app

# Install all workspace deps (dev deps included — server runs via tsx).
COPY package.json ./
COPY packages/core/package.json packages/core/
COPY server/package.json server/
COPY apps/web/package.json apps/web/
COPY apps/mobile/package.json apps/mobile/
RUN npm install --workspaces --include-workspace-root || npm install

# Copy sources.
COPY . .

ENV NODE_ENV=production
ENV PORT=4000
ENV LIVE_CARDS=1
EXPOSE 4000

# tsx runs the TypeScript entrypoint directly.
CMD ["npm", "run", "start", "--workspace", "@grailscope/server"]
