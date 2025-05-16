ARG VARIANT=20
FROM mcr.microsoft.com/vscode/devcontainers/javascript-node:${VARIANT}

# Install Mintlify CLI
USER root
RUN npm install -g @mintlify/cli

USER node
