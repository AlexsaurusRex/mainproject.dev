// Moving between sections, shared by desktop and phones.
// The page itself never scrolls: <main> is pinned to the screen (see style.css)
// and the sections slide up and down inside it. Only the buttons and menus move
// it, so touch tricks and pinch-zoom can't knock the formations out of line.
// script.js / mobile.js read pageY instead of window.scrollY.
const pageTrack = document.querySelector('main');
let pageY = 0;              // how far down the page we are, in px
let pageSection = 'hero';   // section we're on (or heading to)
let pageAnim = null;        // the running slide, if any

// Screen size that ignores pinch-zoom (window.innerWidth/innerHeight shrink
// while zoomed in on iPhones, which used to resize the formations)
function viewW() { return document.documentElement.clientWidth; }
function viewH() { return document.documentElement.clientHeight; }

function setPageY(y) {
  pageY = y;
  pageTrack.style.transform = `translate3d(0, ${-y}px, 0)`;
}

// Slide to a section, shared by nav links and "continue" buttons
function smoothScrollTo(targetId, duration) {
  const targetSection = document.getElementById(targetId);
  if (!targetSection) return;
  if (pageAnim) cancelAnimationFrame(pageAnim);   // a new tap replaces a slide already running
  pageSection = targetId;

  const targetY = targetSection.offsetTop;
  const startY = pageY;
  const distance = targetY - startY;
  let startTime = null;

  function scrollStep(timestamp) {
    if (!startTime) startTime = timestamp;
    const elapsed = timestamp - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Ease in-out
    const ease = progress < 0.5
      ? 2 * progress * progress
      : -1 + (4 - 2 * progress) * progress;

    setPageY(startY + distance * ease);

    pageAnim = progress < 1 ? requestAnimationFrame(scrollStep) : null;
  }

  pageAnim = requestAnimationFrame(scrollStep);
}

// Jump straight to a section, no slide
function jumpTo(targetId) {
  const targetSection = document.getElementById(targetId);
  if (!targetSection) return;
  if (pageAnim) cancelAnimationFrame(pageAnim);
  pageAnim = null;
  pageSection = targetId;
  setPageY(targetSection.offsetTop);
}

// Screen size changed (sections are one screen tall): stay lined up on the same section.
// Pinch-zoom doesn't change the page's size, so it's skipped.
let lastViewW = viewW(), lastViewH = viewH();
window.addEventListener('resize', () => {
  if (viewW() === lastViewW && viewH() === lastViewH) return;
  lastViewW = viewW(); lastViewH = viewH();
  if (!pageAnim) jumpTo(pageSection);
});

// Opened with a section in the link (e.g. mainproject.dev/#dog): start there
window.addEventListener('load', () => {
  const id = location.hash.slice(1);
  if (id && document.getElementById(id)?.parentElement === pageTrack) jumpTo(id);
});

// Keyboard (Tab) moving to a link in another section: bring that section on screen
pageTrack.addEventListener('focusin', e => {
  const section = e.target.closest('main > section');
  if (section && section.id !== pageSection) smoothScrollTo(section.id, 300);
});
