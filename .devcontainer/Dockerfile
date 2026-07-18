ARG VARIANT=22
FROM mcr.microsoft.com/vscode/devcontainers/javascript-node:${VARIANT}

USER root

# Match package.json packageManager; project mint comes from pnpm install
ENV PNPM_HOME=/usr/local/share/pnpm
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@10.30.3 --activate

USER node
