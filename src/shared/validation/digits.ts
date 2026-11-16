const PERSIAN_ZERO = 0x06f0;
const ARABIC_ZERO = 0x0660;

/** Converts Persian (۰-۹) and Arabic-Indic (٠-٩) digits to ASCII so codes and numbers typed on a Persian keyboard validate. */
export function toAsciiDigits(value: string): string {
  return value.replace(/[۰-۹٠-٩]/g, (char) => {
    const code = char.charCodeAt(0);
    return String(code >= PERSIAN_ZERO ? code - PERSIAN_ZERO : code - ARABIC_ZERO);
  });
}
