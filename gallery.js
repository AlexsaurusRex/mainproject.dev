// Projects swipe gallery.
// Swiping is handled by the browser (CSS scroll-snap). This file just adds
// the thumbnail previews, keeps them in sync with the current photo, and wires up the arrows.
document.querySelectorAll('.gallery').forEach(gallery => {
  const track = gallery.querySelector('.gallery-track');
  const slides = track.querySelectorAll('.gallery-slide');
  const thumbsWrap = gallery.querySelector('.gallery-thumbs');
  const prev = gallery.querySelector('.gallery-prev');
  const next = gallery.querySelector('.gallery-next');

  // One small preview per photo, built from the photos themselves
  const thumbs = Array.from(slides).map((slide, i) => {
    const thumb = document.createElement('button');
    thumb.type = 'button';
    thumb.className = 'gallery-thumb';
    thumb.setAttribute('aria-label', `Show photo ${i + 1}`);

    const img = document.createElement('img');
    img.loading = 'lazy';
    img.src = slide.src;
    img.alt = '';                       // decorative; the button label describes it
    thumb.appendChild(img);

    thumb.addEventListener('click', () => goTo(i));
    thumbsWrap.appendChild(thumb);
    return thumb;
  });

  // Which photo is showing, based on how far the track has scrolled
  function currentIndex() {
    return Math.round(track.scrollLeft / track.clientWidth);
  }

  function goTo(i) {
    track.scrollTo({ left: i * track.clientWidth, behavior: 'smooth' });
  }

  function update() {
    const i = currentIndex();
    thumbs.forEach((thumb, j) => thumb.classList.toggle('active', j === i));
    prev.disabled = i === 0;
    next.disabled = i === slides.length - 1;
  }

  prev.addEventListener('click', () => goTo(currentIndex() - 1));
  next.addEventListener('click', () => goTo(currentIndex() + 1));
  track.addEventListener('scroll', update, { passive: true });

  update();
});
