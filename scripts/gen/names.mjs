// Conversión y validación de nombres para el generador.

const KEBAB = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

export function assertKebab(value, label) {
  if (!value || !KEBAB.test(value)) {
    throw new Error(
      `${label} debe estar en kebab-case (por ejemplo "orders-list"). Recibido: "${value ?? ""}"`,
    );
  }
}

export function pascal(kebab) {
  return kebab
    .split("-")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join("");
}

export function constant(kebab) {
  return kebab.toUpperCase().replaceAll("-", "_");
}

export function title(kebab) {
  const words = kebab.split("-").join(" ");
  return words[0].toUpperCase() + words.slice(1);
}
