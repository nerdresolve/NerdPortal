import brand from "../brand.config";

/**
 * Turns config/brand.config.js into CSS custom properties.
 *
 * Rendered once in _app.js, before any page. Because it emits a plain
 * <style> tag during SSR, the brand colors are correct on first paint —
 * there is no flash of the fallback palette.
 */
/** "#7C3AED" -> "124, 58, 237" so tints can use rgba(var(--token), alpha). */
function toRgbChannels(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}

export default function BrandStyles() {
  const c = brand.colors;
  const primaryRgb = toRgbChannels(c.primary);
  const accentRgb = toRgbChannels(c.accent);
  const css = `:root{
--color-primary:${c.primary};
${primaryRgb ? `--color-primary-rgb:${primaryRgb};` : ""}
${accentRgb ? `--color-accent-rgb:${accentRgb};` : ""}
--color-primary-light:${c.primaryLight};
--color-primary-dark:${c.primaryDark};
--color-accent:${c.accent};
--color-accent-light:${c.accentLight};
--color-success:${c.success};
--color-error:${c.error};
--color-warning:${c.warning};
--color-text:${c.text};
--color-text-muted:${c.textMuted};
--color-bg:${c.background};
--color-bg-alt:${c.backgroundAlt};
--color-border:${c.border};
--font-primary:${brand.fonts.primary};
--font-mono:${brand.fonts.mono};
}`;
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
