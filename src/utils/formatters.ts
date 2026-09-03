/**
 * Formatea el nombre completo de una persona en MAYÚSCULAS.
 * Ejemplo: "Jhoel Torregrosa" -> "JHOEL TORREGROSA"
 * "Duván" -> "DUVÁN"
 * Resuelve identificadores de usuario o credenciales comunes a su nombre correspondiente.
 */
export function formatFullNameUpper(name?: string, fallbackUser?: string): string {
  const raw = (name || fallbackUser || '').trim();
  if (!raw) return '';

  const upper = raw.toUpperCase();

  // Mapeos específicos de credenciales de usuario conocidas
  if (upper === 'DDUVAN') return 'DUVÁN';
  if (upper === 'JTORREGROSA') return 'JHOEL TORREGROSA';
  if (upper === 'JNAVARRO') return 'JUAN NAVARRO';
  if (upper === 'AALFARO') return 'ALEXANDRA ALFARO';

  return upper;
}

/**
 * Obtiene únicamente el PRIMER NOMBRE de la persona en MAYÚSCULAS.
 * Ejemplo: "JHOEL TORREGROSA" -> "JHOEL"
 * "Alexandra Alfaro" -> "ALEXANDRA"
 * "Duván" -> "DUVÁN"
 */
export function formatFirstNameUpper(name?: string, fallbackUser?: string): string {
  const full = formatFullNameUpper(name, fallbackUser);
  if (!full) return '';

  const parts = full.split(/\s+/).filter(Boolean);
  return parts[0] || '';
}

/**
 * Mantiene compatibilidad con cualquier import de formatPersonName,
 * retornando el nombre completo en MAYÚSCULAS de acuerdo al requerimiento.
 */
export function formatPersonName(name?: string, fallbackUser?: string): string {
  return formatFullNameUpper(name, fallbackUser);
}

