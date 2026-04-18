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
    <div class="hf-navigation-puck__pulse" aria-hidden="true"></div>
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
        inset: -2px;
        border-radius: 9999px;
        background: radial-gradient(
          circle,
          rgba(16, 185, 129, 0.28) 0%,
          rgba(16, 185, 129, 0.18) 48%,
          rgba(16, 185, 129, 0.04) 72%,
          rgba(16, 185, 129, 0) 100%
        );
        filter: blur(6px);
        opacity: 0.95;
        transform-origin: center;
      }

      .hf-navigation-puck__pulse {
        position: absolute;
        inset: -1px;
        border-radius: 9999px;
        border: 2px solid rgba(16, 185, 129, 0.34);
        animation: hf-navigation-puck-pulse 1.9s ease-in-out infinite;
        transform-origin: center;
        pointer-events: none;
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
          0 6px 16px rgba(0, 0, 0, 0.2),
          0 1px 4px rgba(0, 0, 0, 0.12),
          0 0 0 1px rgba(255, 255, 255, 0.35) inset;
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
          opacity: 0.5;
        }
        60% {
          transform: scale(1.28);
          opacity: 0;
        }
        100% {
          transform: scale(1.28);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }

  return el;
}
