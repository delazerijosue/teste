# Gerador de Artes

Sistema web local (estilo editor tipo Figma) para gerar automaticamente artes
visuais a partir de regras fixas + inputs do usuário — foto do usuário,
etiqueta padrão (PNG) e tagline padrão (SVG, 2 variantes), posicionadas em um
artboard com margens calculadas automaticamente. Exporta em **PDF** (vetorial)
e **PNG** (150 DPI).

Implementado conforme a especificação técnica do projeto (regras de margem,
posicionamento de etiqueta/tagline, exceção de "etiqueta larga", ajuste de
foto com zoom mínimo travado, etc). Sem login, sem persistência — tudo vive
na sessão do navegador e é perdido ao recarregar a página.

## Rodando localmente

```bash
npm install
npm run dev
```

Abra o endereço mostrado no terminal (por padrão `http://localhost:5173`).

## Build de produção

```bash
npm run build
npm run preview
```

## Stack

- React + TypeScript + Vite
- Zustand (estado de sessão, sem persistência)
- jsPDF + svg2pdf.js (exportação PDF vetorial)
- Canvas 2D (exportação PNG a 150 DPI)

## Estrutura

- `src/lib/layout.ts` — motor de regras de geração (margens, etiqueta, tagline,
  exceção de etiqueta larga) para frames verticais e horizontais.
- `src/lib/photo.ts` — matemática de fit/zoom/pan da foto (cobertura mínima
  travada).
- `src/lib/export.ts` — exportação PDF (vetorial via SVG) e PNG (150 DPI).
- `src/components/` — Canvas (pan/zoom estilo Figma), FrameView, PhotoLayer,
  painéis de controle esquerdo/direito.
- `public/assets/` — assets fixos do sistema: etiqueta (`etiqueta-frente.png`
  + `etiqueta-sombra.png`, a sombra desenhada atrás em modo *multiply*) e as
  duas variantes de tagline (SVG). O desconto de borda da etiqueta (usado só
  no cálculo de posição/tamanho, não no desenho) fica em
  `ETIQUETA_INSET` (`src/lib/assets.ts`).
- Cada frame também pode ter etiqueta/tagline **personalizadas** (upload
  PNG/JPG/SVG só para aquele frame, veja o painel de ajustes), além de
  **desfazer/refazer** (Cmd/Ctrl+Z) para as principais ações.
