export function createNavigationPuck() {
  const el = document.createElement("div");

  let currentRotation = 0;
  (el as any).__setRotation = (deg: number) => {
    if (!Number.isFinite(deg)) return;

    const normalized = ((deg % 360) + 360) % 360;
    let delta = normalized - currentRotation;

    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;

    currentRotation += delta;
    el.style.transform = `rotate(${currentRotation}deg)`;
  };

  el.className = "hf-navigation-puck";

  el.innerHTML = `
    <div class="hf-navigation-puck__glow" aria-hidden="true"></div>
    <div class="hf-navigation-puck__core" aria-hidden="true">
      <span class="hf-navigation-puck__dot"></span>
    </div>
    <div class="hf-navigation-puck__nose" aria-hidden="true"></div>
  `;

  if (typeof document !== "undefined" && !document.getElementById("hf-navigation-puck-styles")) {
    const style = document.createElement("style");
    style.id = "hf-navigation-puck-styles";
    style.textContent = `
      .hf-navigation-puck {
        position: relative;
        width: 28px;
        height: 28px;
        pointer-events: none;
        transform-origin: center;
        transition: none;
      }

      .hf-navigation-puck__glow {
        position: absolute;
        inset: 2px;
        border-radius: 9999px;
        background: rgba(16, 185, 129, 0.18);
        filter: blur(4px);
        animation: none;
        transform-origin: center;
      }

      .hf-navigation-puck__core {
        position: relative;
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 9999px;
        background: rgba(255, 255, 255, 0.97);
        border: 3px solid rgba(16, 185, 129, 0.94);
        box-shadow:
          0 4px 12px rgba(0, 0, 0, 0.18),
          0 1px 4px rgba(0, 0, 0, 0.1);
        box-sizing: border-box;
      }

      .hf-navigation-puck__dot {
        width: 6px;
        height: 6px;
        border-radius: 9999px;
        background: rgba(5, 150, 105, 0.98);
        box-shadow: 0 0 0 1px rgba(16, 185, 129, 0.08);
      }

      .hf-navigation-puck__nose {
        position: absolute;
        left: 50%;
        top: -4px;
        width: 0;
        height: 0;
        transform: translateX(-50%);
        border-left: 5px solid transparent;
        border-right: 5px solid transparent;
        border-bottom: 9px solid rgba(16, 185, 129, 0.96);
        filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.14));
      }

      @keyframes hf-navigation-puck-pulse {
        0% {
          transform: scale(1);
          opacity: 0.52;
        }
        50% {
          transform: scale(1.16);
          opacity: 0.18;
        }
        100% {
          transform: scale(1);
          opacity: 0.52;
        }
      }
    `;
    document.head.appendChild(style);
  }

  return el;
}
