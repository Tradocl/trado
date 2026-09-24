# Logo Trado — Guía de implementación

## Concepto

Logo wordmark minimalista. La palabra "trado" en lowercase con gradiente índigo→violeta es la marca completa. Se usa el mismo wordmark en TODOS los contextos: header, favicon, app icon, redes sociales. Sin isotipos separados — máxima consistencia.

## Paleta oficial

```css
:root {
  --trado-indigo: #1F25C1;        /* Color dominante, alma de la marca */
  --trado-violet: #7B46D8;        /* Final del gradiente */
  --trado-emerald: #11A770;       /* Solo para estados de éxito en la app */
  --trado-foreground: #131924;    /* Texto principal (negro azulado) */
  --trado-background: #FFFFFF;
  --trado-muted: #EEEEF6;

  /* Gradiente de marca */
  --trado-gradient: linear-gradient(90deg, #1F25C1 0%, #7B46D8 100%);
  --trado-gradient-hero: linear-gradient(135deg, #1225A8 0%, #3D4BCE 50%, #7B46D8 100%);
}
```

## Archivos incluidos

| Archivo | Uso |
|---------|-----|
| `trado-logo.svg` | **Versión principal** — wordmark con gradiente sobre fondo claro |
| `trado-logo-indigo.svg` | Color sólido — para casos donde el gradiente no funciona |
| `trado-logo-white.svg` | Sobre fondos oscuros o el gradiente hero |
| `trado-logo-black.svg` | Monocromo para impresión/documentos |
| `trado-icon.svg` | Idéntico al logo principal (para redes sociales, OG image) |
| `favicon.svg` | Idéntico al logo principal (para pestaña del navegador) |
| `Logo.tsx` | Componente React reutilizable |

## Instalación en proyecto Next.js / Vite / React

### 1. Copia los SVG a tu proyecto

```bash
mkdir -p public/brand
mkdir -p src/components

cp trado-logo.svg public/brand/
cp trado-logo-indigo.svg public/brand/
cp trado-logo-white.svg public/brand/
cp trado-logo-black.svg public/brand/
cp trado-icon.svg public/brand/
cp favicon.svg public/

cp Logo.tsx src/components/
```

### 2. Configura el favicon (Next.js)

En `app/layout.tsx`:

```tsx
export const metadata = {
  title: 'Trado',
  icons: {
    icon: '/favicon.svg',
    apple: '/brand/trado-icon.svg',
  },
};
```

### 3. Usa el componente

```tsx
import { Logo } from '@/components/Logo';

// Header con logo principal (gradiente)
<Logo height={32} />

// Logo blanco sobre fondo morado/oscuro
<Logo variant="white" height={32} />

// Logo sólido (sin gradiente, para documentos)
<Logo variant="solid" height={32} />

// Logo monocromo negro
<Logo variant="black" height={32} />
```

### 4. O usa los SVG directamente

```tsx
import Image from 'next/image';

<Image src="/brand/trado-logo.svg" alt="Trado" width={120} height={32} priority />
```

## Reglas de uso

### Versión principal
Siempre prefiere `trado-logo.svg` (con gradiente) sobre fondo blanco o claro. Es la versión que mejor representa la marca.

### Espacio de seguridad
Deja al menos un espacio igual a la altura de la "t" alrededor del logo. No coloques texto ni elementos dentro de esa zona.

### Tamaño mínimo
- Web/digital: 80px de ancho mínimo
- Impreso: 20mm de ancho mínimo

### Qué NO hacer
- No deformes las proporciones
- No cambies los colores fuera de la paleta
- No agregues sombras, brillos ni efectos
- No rotes el logo
- No uses el gradiente sobre fondos de color (ahí va el blanco o el sólido)
- No agregues el verde esmeralda al logo (solo va en estados de éxito de la app)
- No conviertas la "t" en mayúscula — el logo siempre es lowercase

## Tipografía recomendada para la app

Para coherencia con el wordmark, usa una de estas fuentes en headers/UI:

```css
font-family: 'Inter', -apple-system, 'SF Pro Display', system-ui, sans-serif;
```

Alternativas: **Geist**, **Söhne**, **Manrope**.

Para body usa la misma familia con weight 400-500. Para headers usa weight 600 con letter-spacing -0.02em (igual que el logo).
