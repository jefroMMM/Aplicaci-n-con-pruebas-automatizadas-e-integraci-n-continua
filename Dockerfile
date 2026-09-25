FROM node:22-alpine
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY tsconfig.json tsconfig.ui.json ./
COPY src ./src
COPY migrations ./migrations
COPY public ./public
EXPOSE 3000
CMD ["sh", "-c", "pnpm migrate && pnpm start"]
