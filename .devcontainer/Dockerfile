ARG VARIANT=20
FROM mcr.microsoft.com/vscode/devcontainers/javascript-node:${VARIANT}

# Install dependencies with root
USER root

RUN apt-get update \
    && apt-get install -y zsh git curl \
    && rm -rf /var/lib/apt/lists/*

# Set pnpm global bin to a shared location on PATH
ENV PNPM_HOME=/usr/local/share/pnpm
ENV PATH="$PNPM_HOME:$PATH"

# Install Mintlify CLI
RUN corepack enable && corepack prepare pnpm@10.30.3 --activate && pnpm add -g mint@latest

# Because Jonathon likes to use ZSH
ENV ZSH=/home/node/.oh-my-zsh
RUN if [ ! -d "${ZSH}" ]; then \
      git clone https://github.com/ohmyzsh/ohmyzsh.git "${ZSH}"; \
    fi \
    && cp "${ZSH}/templates/zshrc.zsh-template" /home/node/.zshrc \
    && sed -i 's|^export ZSH=.*|export ZSH="'"${ZSH}"'"|' /home/node/.zshrc \
    && sed -i 's|^ZSH_THEME=.*|ZSH_THEME="robbyrussell"|' /home/node/.zshrc \
    && echo "alias mintdev='CHOKIDAR_USEPOLLING=true mint dev --verbose'" \
       >> /home/node/.zshrc

RUN chown -R node:node /home/node

# Revert to the non-root user for security
USER node
