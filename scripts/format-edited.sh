#!/bin/bash
# PostToolUse hook: formatea con Prettier el archivo que el agente acaba de editar.
# Nunca bloquea al agente; si Prettier falla, lo registra en .claude/hooks.log.
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0

FILE=$(node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{console.log(JSON.parse(s).tool_input?.file_path ?? '')}catch{console.log('')}})")
[ -z "$FILE" ] && exit 0

if ! pnpm exec prettier --write --ignore-unknown "$FILE" > /dev/null 2> /tmp/format-edited.err; then
  echo "$(node -e "console.log(new Date().toISOString())") prettier falló en $FILE: $(head -1 /tmp/format-edited.err)" >> .claude/hooks.log
fi
exit 0
