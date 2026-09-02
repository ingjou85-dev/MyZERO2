/**
 * Formatea un nombre de persona a formato legible (Title Case).
 * Ejemplo: "JHOEL TORREGROSA" -> "Jhoel Torregrosa"
 * Resuelve identificadores de usuario o credenciales comunes a su nombre correspondiente.
 */
export function formatPersonName(name?: string, fallbackUser?: string): string {
  const raw = (name || fallbackUser || '').trim();
  if (!raw) return '';

  const upper = raw.toUpperCase();

  // Mapeos específicos de credenciales de usuario conocidas
  if (upper === 'DDUVAN') return 'Duván';
  if (upper === 'JTORREGROSA') return 'Jhoel Torregrosa';
  if (upper === 'JNAVARRO') return 'Juan Navarro';
  if (upper === 'AALFARO') return 'Alexandra Alfaro';

  // Si ya viene con mayúsculas y minúsculas bien formateadas (ej: "Jhoel Torregrosa"), respetarlo
  const hasLower = /[a-z]/.test(raw);
  const hasUpper = /[A-Z]/.test(raw);
  if (hasLower && hasUpper && !raw.includes('  ')) {
    // Si no está todo en mayúsculas, verificar si empieza con mayúscula
    return raw
      .split(/\s+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  // Convertir todo a Title Case elegante
  return raw
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      // Manejar preposiciones o partículas cortas si aplica
      if (['de', 'del', 'la', 'los', 'las', 'y'].includes(word)) {
        return word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}
