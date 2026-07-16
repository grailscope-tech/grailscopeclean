# GrailScope API (Express + live connectors). Node 22 = built-in node:sqlite.
# Installs ONLY the core + server workspaces (not the web/mobile apps) so the
# image stays small and doesn't pull React Native / Expo.
FROM node:22-alpine

WORKDIR /app

COPY . .

# Only the API's workspaces. --include=dev keeps tsx (used to run the TS server).
RUN npm install -w @grailscope/core -w @grailscope/server --include-workspace-root --include=dev

ENV NODE_ENV=production
ENV PORT=4000
ENV LIVE_CARDS=1
EXPOSE 4000

CMD ["npm", "run", "start", "--workspace", "@grailscope/server"]
