ARG VARIANT=22
FROM mcr.microsoft.com/vscode/devcontainers/javascript-node:${VARIANT}

USER root

RUN apt-get update \
    && apt-get install -y zsh git curl \
    && rm -rf /var/lib/apt/lists/*

# Match package.json packageManager (corepack); project mint comes from pnpm install
ENV PNPM_HOME=/usr/local/share/pnpm
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@10.30.3 --activate

ENV ZSH=/home/node/.oh-my-zsh
RUN if [ ! -d "${ZSH}" ]; then \
      git clone https://github.com/ohmyzsh/ohmyzsh.git "${ZSH}"; \
    fi \
    && cp "${ZSH}/templates/zshrc.zsh-template" /home/node/.zshrc \
    && sed -i 's|^export ZSH=.*|export ZSH="'"${ZSH}"'"|' /home/node/.zshrc \
    && sed -i 's|^ZSH_THEME=.*|ZSH_THEME="robbyrussell"|' /home/node/.zshrc

COPY .zshrc /tmp/devcontainer.zshrc
RUN cat /tmp/devcontainer.zshrc >> /home/node/.zshrc \
    && rm /tmp/devcontainer.zshrc \
    && chown -R node:node /home/node

USER node
