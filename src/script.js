const bgVideo = document.getElementById('bgVideo');
const screenVideo = document.getElementById('screenVideo');
const liveClock = document.getElementById('liveClock');

const tasterButtons = document.querySelectorAll('.taster-btn:not(.taster-btn-link)');
const filmPanel = document.getElementById('filmPanel');
const filmScroll = document.getElementById('filmScroll');
const filmText = document.getElementById('filmText');
const filmClose = document.getElementById('filmClose');

const modalLinks = document.querySelectorAll('[data-modal-source]');
const infoModal = document.getElementById('infoModal');
const infoModalContent = document.getElementById('infoModalContent');
const infoModalClose = document.getElementById('infoModalClose');
const infoModalBackdrop = document.getElementById('infoModalBackdrop');

const DAY_VIDEO_SRC = 'videos/day-screen.mp4';
const NIGHT_VIDEO_SRC = 'videos/night-screen.mp4';

function makeSeamlessLoop(video) {
  if (!video) return;

  video.addEventListener('ended', () => {
    video.currentTime = 0.01;
    video.play().catch(() => {});
  });
}

function getTimeBasedVideoSrc() {
  const now = new Date();
  const hour = now.getHours();
  return hour >= 10 ? DAY_VIDEO_SRC : NIGHT_VIDEO_SRC;
}

function setTimeBasedScreenVideo() {
  if (!screenVideo) return;

  const targetSrc = getTimeBasedVideoSrc();
  const currentSrc = screenVideo.getAttribute('src');

  if (currentSrc !== targetSrc) {
    screenVideo.src = targetSrc;
    screenVideo.load();
    screenVideo.play().catch(() => {});
  }
}

function updateLiveClock() {
  if (!liveClock) return;

  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  liveClock.textContent = `${hours}:${minutes}`;
}

function resetFilmScroll() {
  if (!filmScroll) return;

  filmScroll.scrollTop = 0;

  requestAnimationFrame(() => {
    filmScroll.scrollTop = 0;

    requestAnimationFrame(() => {
      filmScroll.scrollTop = 0;
    });
  });
}

function openFilm(content) {
  if (filmText) {
    filmText.innerHTML = content;
  }

  if (filmPanel) {
    filmPanel.classList.add('is-open');
    filmPanel.setAttribute('aria-hidden', 'false');
  }

  document.body.classList.add('panel-open');
  resetFilmScroll();
}

function closeFilm() {
  if (filmPanel) {
    filmPanel.classList.remove('is-open');
    filmPanel.setAttribute('aria-hidden', 'true');
  }

  document.body.classList.remove('panel-open');
}

function openInfoModal(content) {
  if (infoModalContent) {
    infoModalContent.innerHTML = content;
  }

  if (infoModal) {
    infoModal.classList.add('is-open');
    infoModal.setAttribute('aria-hidden', 'false');
  }
}

function closeInfoModal() {
  if (infoModal) {
    infoModal.classList.remove('is-open');
    infoModal.setAttribute('aria-hidden', 'true');
  }
}

tasterButtons.forEach((button) => {
  button.addEventListener('pointerdown', () => button.classList.add('is-pressed'));
  button.addEventListener('pointerup', () => button.classList.remove('is-pressed'));
  button.addEventListener('pointerleave', () => button.classList.remove('is-pressed'));
  button.addEventListener('pointercancel', () => button.classList.remove('is-pressed'));

  button.addEventListener('click', () => {
    const sourceId = button.dataset.filmSource;

    if (sourceId) {
      const sourceNode = document.getElementById(sourceId);
      openFilm(sourceNode ? sourceNode.innerHTML : '');
      return;
    }

    openFilm(button.dataset.filmText || '');
  });
});

if (filmText) {
  filmText.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-open-film]');
    if (!trigger) return;

    event.preventDefault();

    if (trigger.dataset.openFilm === 'concept') {
      const sourceNode = document.getElementById('conceptContent');
      openFilm(sourceNode ? sourceNode.innerHTML : '');
    }
  });
}

modalLinks.forEach((link) => {
  link.addEventListener('click', () => {
    const sourceId = link.dataset.modalSource;
    const sourceNode = document.getElementById(sourceId);
    openInfoModal(sourceNode ? sourceNode.innerHTML : '');
  });
});

if (filmClose) {
  filmClose.addEventListener('click', closeFilm);
}

if (infoModalClose) {
  infoModalClose.addEventListener('click', closeInfoModal);
}

if (infoModalBackdrop) {
  infoModalBackdrop.addEventListener('click', closeInfoModal);
}

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeFilm();
    closeInfoModal();
  }
});

makeSeamlessLoop(bgVideo);
makeSeamlessLoop(screenVideo);

setTimeBasedScreenVideo();
updateLiveClock();

setInterval(setTimeBasedScreenVideo, 60 * 1000);
setInterval(updateLiveClock, 1000);