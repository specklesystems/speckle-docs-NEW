HISTFILE=$HOME/.zsh_history
HISTSIZE=10000
SAVEHIST=10000

setopt INC_APPEND_HISTORY
setopt SHARE_HISTORY

# Uses package.json "dev" (mint on port 3333). Polling helps file watch in containers.
alias mintdev='CHOKIDAR_USEPOLLING=true pnpm dev'
