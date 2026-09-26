// Collapsible ☰ nav, shared by desktop and mobile
const navToggle = document.getElementById('nav-toggle');
const navLinks = document.getElementById('nav-links');

// True on phone-sized screens (same 768px cutoff as the rest of the site)
function isMobileWidth() {
  return window.innerWidth < 768;
}

navToggle.addEventListener('click', () => {
  navLinks.classList.toggle('open');
});

// On phones, close the menu after a link is tapped. On desktop, leave it open.
navLinks.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    if (isMobileWidth()) navLinks.classList.remove('open');
  });
});

// Same for the continue buttons
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (isMobileWidth()) navLinks.classList.remove('open');
  });
});

// Phones: Skills groups marked "collapse-on-phones" in index.html can be opened
// and closed by tapping the heading. They start collapsed, unless also marked
// "start-open". The sign on the right shows + when closed and − when open.
if (isMobileWidth()) {
  document.querySelectorAll('.skills-group.collapse-on-phones').forEach(group => {
    const heading = group.querySelector('.skills-heading');
    const list = group.querySelector('.skills-items');
    const startOpen = group.classList.contains('start-open');

    if (!startOpen) group.classList.add('collapsed');
    heading.setAttribute('role', 'button');
    heading.setAttribute('tabindex', '0');
    heading.setAttribute('aria-expanded', String(startOpen));
    heading.insertAdjacentHTML('beforeend',
      `<span class="skills-toggle" aria-hidden="true">${startOpen ? '−' : '+'}</span>`);
    const sign = heading.querySelector('.skills-toggle');

    function toggle() {
      const opening = group.classList.contains('collapsed');
      if (opening) {
        group.classList.remove('collapsed');
        list.style.maxHeight = list.scrollHeight + 'px';            // slide open to the list's real height
      } else {
        list.style.maxHeight = list.scrollHeight + 'px';            // start the slide from the current height
        void list.offsetHeight;
        group.classList.add('collapsed');
        list.style.maxHeight = '';                                  // ...down to 0 (from style.css)
      }
      heading.setAttribute('aria-expanded', String(opening));
      sign.textContent = opening ? '−' : '+';
    }

    // once fully open, drop the fixed height so the list can reflow freely
    list.addEventListener('transitionend', e => {
      if (e.propertyName === 'max-height' && !group.classList.contains('collapsed')) list.style.maxHeight = '';
    });
    heading.addEventListener('click', toggle);
    heading.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
    });
  });
}

// The About and Skills "continue" buttons start greyed out when there's more
// text to scroll, and turn white once the reader reaches the end. They always work.
// Re-checked whenever the layout can change (screen size, fonts finishing
// loading), so it also turns white if the text ends up fitting without scrolling.
function dimUntilScrolled(sectionId, boxSelector) {
  const box = document.querySelector(`#${sectionId} ${boxSelector}`);
  const btn = document.querySelector(`#${sectionId} .nav-btn`);
  const reachedEnd = () => box.scrollTop + box.clientHeight >= box.scrollHeight - 4;

  if (reachedEnd()) return;                      // all the text already fits
  btn.classList.add('dim');

  const check = () => {
    if (!reachedEnd()) return;
    btn.classList.remove('dim');                 // stays white after that
    box.removeEventListener('scroll', check);
    window.removeEventListener('resize', check);
    observer.disconnect();
  };
  const observer = new ResizeObserver(check);    // box or text changes size
  observer.observe(box);
  [...box.children].forEach(child => observer.observe(child));
  box.addEventListener('scroll', check, { passive: true });
  window.addEventListener('resize', check);
  if (document.fonts) document.fonts.ready.then(check);
}

// Edge fades on the About / Skills scroll areas (see style.css): only fade the
// top once the reader has scrolled down, and drop the bottom fade at the end
function trackEdgeFades(box) {
  const update = () => {
    box.classList.toggle('scrolled-down', box.scrollTop > 2);
    box.classList.toggle('at-end', box.scrollTop + box.clientHeight >= box.scrollHeight - 2);
  };
  box.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  box.addEventListener('transitionend', update);   // collapsible Skills groups change the height
  update();
}

// Wait for fonts and photos so the text height is final
window.addEventListener('load', () => {
  dimUntilScrolled('about', '.about-content');
  dimUntilScrolled('skills', '.skills-content');
  trackEdgeFades(document.querySelector('#about .about-content'));
  trackEdgeFades(document.querySelector('#skills .skills-content'));
});

// ☰ button at the end of the page: snaps back to the home screen and opens the menu
// (same quick scroll the old "Begin Again" button used; smoothScrollTo is in script.js / mobile.js)
document.getElementById('menu-btn').addEventListener('click', () => {
  navLinks.classList.add('open');
  smoothScrollTo('hero', 300); // ms — lower for a faster snap
});

// "choose your own adventure": the button fades out and a section menu
// fades in in its place (desktop and phones)
const selfGuidedButton = document.getElementById('self-guided-btn');
const heroMenu = document.getElementById('hero-menu');

heroMenu.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    smoothScrollTo(link.getAttribute('href').slice(1), 500);   // same scroll as the ☰ menu links
  });
});

selfGuidedButton.addEventListener('click', () => {
  // Desktop: also open the ☰ menu at the top. It stays open while visitors move
  // around (on desktop, links and continue buttons don't close it).
  if (!isMobileWidth()) navLinks.classList.add('open');

  selfGuidedButton.classList.add('fade-out');
  setTimeout(() => {
    selfGuidedButton.hidden = true;
    heroMenu.hidden = false;
  }, 150);   // match the fade-out in style.css
});

// Phones held sideways see a "turn your phone upright" screen (style.css).
// If the page was opened sideways, it loaded its desktop version, so reload
// once when the phone is turned upright to get the phone version.
const sidewaysPhone = window.matchMedia('(orientation: landscape) and (max-height: 500px) and (pointer: coarse)');
if (sidewaysPhone.matches) {
  sidewaysPhone.addEventListener('change', e => {
    if (!e.matches) location.reload();
  });
}
