# Alazab application colors

Approved palette:

| Role | HEX |
| --- | --- |
| Brand and primary buttons | `#ffb900` |
| Text on yellow buttons | `#030957` |
| Dark background | `#030957` |
| Dark cards | `#030957` |
| Light background | `#f8f8f8` |
| Light cards | `#ffffff` |

The palette is defined as equivalent OKLCH brand variables in `src/styles.css`
and `web/src/index.css`, then mapped to semantic surface, button and sidebar
variables. Yellow button fills and navy button labels remain the same in both
modes. Dark cards share the page's navy surface; borders provide separation.

Use `text-brand-text` for standalone brand text and links: navy in light mode,
yellow in dark mode. Use `bg-primary text-primary-foreground` for yellow buttons.
This keeps text readable on white surfaces without changing the brand yellow.
Secondary surfaces, borders, hover states and muted text derive from the approved
colors. Existing error/status colors and other chart series retain their distinct
semantic roles.

Conversation borders use theme tokens rather than white-only borders. Composer
focus glow uses a valid `color-mix` shadow instead of passing an OKLCH color into
`rgba()`. The standalone error page uses the same light palette.
