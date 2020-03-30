export function translate(str) {
  if (window._t && typeof str === "string") {
    return window._t(str);
  }
  return str;
}
