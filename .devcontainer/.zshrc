HISTFILE=$HOME/.zsh_history
HISTSIZE=10000
SAVEHIST=10000

setopt INC_APPEND_HISTORY   # write each command as you go
setopt SHARE_HISTORY        # pull in commands from other sessions

alias mintdev='CHOKIDAR_USEPOLLING=true mint dev --verbose'