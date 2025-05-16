ARG VARIANT=20
FROM mcr.microsoft.com/vscode/devcontainers/javascript-node:${VARIANT}

# Install dependencies with root
USER root

RUN apt-get update \
    && apt-get install -y zsh git curl \
    && rm -rf /var/lib/apt/lists/*

# Install Oh My Zsh for the 'node' user
RUN sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" --unattended \
    && chsh -s /usr/bin/zsh node

# Install Mintlify CLI
RUN npm install -g @mintlify/cli

# Revert to the non-root user for security
USER node
