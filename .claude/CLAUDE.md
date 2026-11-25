# factory-lab

## Comandos

- `pnpm verify`: formato, tipos, lint y tests con 100% de cobertura. Debe pasar para terminar cualquier tarea.
- `pnpm format`: formatea todo el repo.

## Precedencia (de mayor a menor)

1. Restricciones explícitas del usuario en la tarea ("no toques X").
2. `pnpm verify` en verde para terminar.
3. Extender el cambio solo a lo que el compilador o los tests señalan como consecuencia directa.

Si 1 y 2 entran en conflicto, detente y pregunta.
Nunca modifiques gates, tests existentes ni configuración para hacer pasar verify.

## Escalamiento

Si una restricción explícita del usuario choca con `pnpm verify`, o si no tienes permiso para algo que la tarea necesita:

1. No hagas el cambio que viola la restricción.
2. Si tienes la herramienta de preguntas interactivas, úsala con opciones concretas.
3. Si no la tienes, explica el conflicto y termina tu mensaje con
   `[NEEDS-USER]` en una línea aparte, al final.

Usa `[NEEDS-USER]` solo para esos casos. Nunca para evitar un error que puedes corregir dentro del alcance.
