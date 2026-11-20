export const buzz = (p = 40) => {
  try { if (navigator.vibrate) navigator.vibrate(p) } catch (e) {}
}
