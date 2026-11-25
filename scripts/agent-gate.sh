#!/bin/bash
# Stop hook: no deja terminar al agente con verify en rojo (máximo 3 intentos).
# Si el agente escala con [NEEDS-USER], lo deja terminar y lo registra.
INPUT=$(cat)

field() {
  echo "$INPUT" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{const v=JSON.parse(s)[process.argv[1]];console.log(v ?? '')}catch{console.log('')}})" "$1"
}
now() { node -e "console.log(new Date().toISOString())"; }

SESSION=$(field session_id)
if [ -z "$SESSION" ]; then
  echo "agent-gate: no pude leer session_id del input del hook" >&2
  exit 1
fi

ROOT="${CLAUDE_PROJECT_DIR:-.}"
COUNTER="/tmp/agent-gate-$SESSION"
LOG="/tmp/verify-$SESSION.log"
ATTEMPTS=$(cat "$COUNTER" 2>/dev/null || echo 0)
MAX=3

LAST=$(field last_assistant_message)
if echo "$LAST" | grep -q '\[NEEDS-USER\]'; then
  echo "$(now) $SESSION escalated" >> "$ROOT/.claude/escalations.log"
  rm -f "$COUNTER"
  exit 0
fi

cd "$ROOT" || exit 1

if pnpm verify > "$LOG" 2>&1; then
  rm -f "$COUNTER" "$LOG"
  exit 0
fi

if [ "$ATTEMPTS" -ge "$MAX" ]; then
  rm -f "$COUNTER" "$LOG"
  exit 0   # Se rinde el gate local; CI sigue bloqueando el merge
fi

echo $((ATTEMPTS + 1)) > "$COUNTER"
tail -50 "$LOG" >&2
echo "verify falló (intento $((ATTEMPTS + 1))/$MAX). Corrige antes de terminar." >&2
exit 2
