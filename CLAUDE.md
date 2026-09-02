# Trado

## Antes de hacer nada

**Lee [CONTEXTO.md](CONTEXTO.md) completo.** Es el mapa del proyecto: modelo de
negocio, comisiones, trampas del sistema, estado real de producción, errores ya
cometidos y decisiones pendientes. Está escrito justamente para que no tengas
que redescubrir todo eso, y varias de esas trampas cuestan horas si las
encuentras por las malas.

**Corre `git fetch` antes de analizar o concluir cualquier cosa.** El clon local
ya estuvo 13 commits atrasado sin que se notara, y todo el análisis hecho sobre
esa base fue inválido.

## Reglas de este proyecto

**Los números de dinero se leen del código, nunca de memoria ni de esta
documentación.** La fuente de verdad de la comisión es `calculateFee` en
`src/lib/utils.ts`. Ya se le pasó a un cliente empresarial una cifra equivocada
por citarla de memoria.

**Mantén CONTEXTO.md al día.** Si cambias comisiones, crons, autenticación de
Edge Functions, medios de pago, límites o el estado de producción, actualiza la
sección correspondiente **en el mismo commit**. Un mapa desactualizado hace
tomar decisiones con datos falsos.

**Verifica, no asumas.** Esto mueve dinero de terceros. Si arreglaste un cron,
compruébalo con una corrida real; si desplegaste una función, llámala. Cuando no
puedas verificar algo, dilo explícitamente en vez de darlo por hecho.

**No fuerces pushes ni sobrescribas `main`.** Un push rechazado ya salvó dos
meses de trabajo.

## Comandos

```bash
npm run dev
npm test
npm run build
npx tsc --noEmit -p tsconfig.app.json
```

Supabase: proyecto `aekzrackrijuxvopqfbp`, cuenta **contacto@trado.cl**. El
`npx supabase login` hay que correrlo desde una terminal real (la CLI rechaza
entornos sin TTY). Si aparecen 403 en cadena, la sesión se cayó: volver a
autenticar.
