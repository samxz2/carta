import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(ScrollTrigger, SplitText);

// Evita saltos de layout en móvil al aparecer/desaparecer la barra del navegador.
ScrollTrigger.config({ ignoreMobileResize: true });

// Avisa al Layout de que GSAP ya tomó el control (desactiva el fallback).
(window as unknown as { __gsapReady: boolean }).__gsapReady = true;

const root = document.documentElement;
const prefersReduced = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;

root.dataset.animReady = "1";

const $ = <T extends Element>(sel: string) => document.querySelector<T>(sel);
const $$ = <T extends Element>(sel: string) =>
  gsap.utils.toArray<T>(sel);

let opened = false;
let idleTween: gsap.core.Tween | null = null;

init();

function init() {
  buildIntro();
  // Dejamos el contenido oculto (lo controla el CSS con .js) hasta abrir el sobre.
  document.body.style.overflow = "hidden";
}

/* ==========================================================================
   INTRO: el sobre se abre y da paso a la carta
   ========================================================================== */
function buildIntro() {
  const intro = $("#intro");
  const openBtn = $("#open-btn");
  const envelope = $(".envelope");

  if (!intro) return;

  if (!prefersReduced && envelope) {
    idleTween = gsap.to(envelope, {
      y: -8,
      duration: 3,
      yoyo: true,
      repeat: -1,
      ease: "sine.inOut",
    });
    gsap.to(".intro__hint", {
      opacity: 0.4,
      duration: 1.4,
      yoyo: true,
      repeat: -1,
      ease: "sine.inOut",
    });
  }

  const open = () => {
    if (opened) return;
    opened = true;
    idleTween?.kill();
    document.body.style.overflow = "";

    // Sin animaciones: mostrar la carta al instante.
    if (prefersReduced) {
      revealContent();
      gsap.set(intro, { autoAlpha: 0, display: "none" });
      ScrollTrigger.refresh();
      return;
    }

    const tl = gsap.timeline({
      defaults: { ease: "power3.inOut" },
      onComplete() {
        intro.style.display = "none";
        intro.classList.add("is-hidden");
        ScrollTrigger.refresh();
      },
    });

    tl.to(".envelope__seal", {
      scale: 0.12,
      opacity: 0,
      rotate: -50,
      duration: 0.5,
      ease: "back.in(1.8)",
    })
      .to(".envelope__flap", { rotateX: -180, duration: 0.85 }, "-=0.15")
      .set(".envelope__flap", { zIndex: 1 })
      .to(
        ".envelope__paper",
        { y: "-62%", duration: 0.95, ease: "power4.out" },
        "-=0.45",
      )
      .to(".envelope", { scale: 1.06, duration: 0.95 }, "<")
      .to(
        ".envelope__shadow",
        { opacity: 0.32, scaleX: 1.12, duration: 0.95 },
        "<",
      )
      .to("[data-intro-item]", { opacity: 0, y: -12, duration: 0.4 }, "<")
      // La carta aparece mientras el sobre se disuelve.
      .add(revealContent, "-=0.3")
      .to(
        ".envelope",
        { y: "-26%", scale: 1, opacity: 0, duration: 0.8, ease: "power2.in" },
        "-=0.15",
      )
      .to(intro, { autoAlpha: 0, duration: 0.8, ease: "power2.inOut" }, "<0.05");
  };

  openBtn?.addEventListener("click", open);
  intro.addEventListener("click", open); // clic en cualquier parte del overlay
  window.addEventListener("keydown", (e) => {
    if (opened) return;
    if (e.key === "Enter" || e.key === " " || e.key === "Escape") open();
  });
}

/* ==========================================================================
   REVELADO DEL CONTENIDO
   ========================================================================== */
function revealContent() {
  // Neutraliza el estado oculto del CSS.
  $$<HTMLElement>("[data-anim]").forEach((el) => gsap.set(el, { opacity: 1 }));

  if (prefersReduced) return;

  // 1) La hoja entra como si se apoyara sobre la mesa.
  const paper = $<HTMLElement>(".paper");
  if (paper) {
    gsap.from(paper, {
      y: 46,
      rotateX: 7,
      opacity: 0,
      transformPerspective: 900,
      transformOrigin: "50% 0%",
      duration: 1.3,
      ease: "power3.out",
    });
  }

  // 2) Párrafos: revelado línea por línea con máscara.
  //    autoSplit re-divide el texto al redimensionar (responsive).
  $$<HTMLElement>("[data-split]").forEach((el) => {
    SplitText.create(el, {
      type: "lines",
      mask: "lines",
      autoSplit: true,
      onSplit(self) {
        return gsap.from(self.lines, {
          yPercent: 100,
          opacity: 0,
          filter: "blur(8px)",
          duration: 1,
          ease: "power3.out",
          stagger: 0.14,
          scrollTrigger: { trigger: el, start: "top 86%", once: true },
        });
      },
    });
  });

  // 3) Firma manuscrita: revelado por caracteres.
  const sig = $<HTMLElement>("[data-signature]");
  if (sig) {
    SplitText.create(sig, {
      type: "chars",
      autoSplit: true,
      onSplit(self) {
        return gsap.from(self.chars, {
          opacity: 0,
          y: 18,
          rotate: -7,
          duration: 0.55,
          ease: "power2.out",
          stagger: 0.055,
          scrollTrigger: { trigger: sig, start: "top 94%", once: true },
        });
      },
    });
  }

  // 4) Resto de elementos con data-anim (el ornamento superior).
  $$<HTMLElement>("[data-anim]").forEach((el) => {
    if (el.matches("[data-split]") || el.matches("[data-signature]")) return;
    if (el.classList.contains("paper")) return;

    gsap.from(el, {
      y: 22,
      opacity: 0,
      duration: 1,
      ease: "power3.out",
      scrollTrigger: { trigger: el, start: "top 90%", once: true },
    });
  });

  document.fonts?.ready
    .then(() => ScrollTrigger.refresh())
    .catch(() => {});
}
