export function createCircleMarker(color: string) {
  const el = document.createElement("div");

  el.style.width = "32px";
  el.style.height = "32px";
  el.style.borderRadius = "50%";
  el.style.background = color;
  el.style.border = "3px solid white";
  el.style.boxShadow = "0 2px 8px rgba(0,0,0,0.3)";

  return el;
}
