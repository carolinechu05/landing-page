let typingTimeout = null;
let visibilityInterval = null;

function typeText(element, text, speed = 100) {
  if (typingTimeout) clearTimeout(typingTimeout);

  const parser = new DOMParser();
  const doc = parser.parseFromString(text, 'text/html');
  const cleanText = doc.body.textContent || text;
  const textWithBreaks = cleanText.replace(/\n/g, '\n');

  element.textContent = textWithBreaks;
  element.style.visibility = 'hidden';
  const height = element.offsetHeight;
  element.style.minHeight = `${height}px`;
  element.style.visibility = 'visible';
  element.textContent = '';

  let i = 0;
  function type() {
    if (i < textWithBreaks.length) {
      element.textContent += textWithBreaks[i];
      i++;
      typingTimeout = setTimeout(type, speed);
    } else {
      typingTimeout = null;
      element.style.minHeight = 'auto';
      element.innerHTML = text;
    }
  }
  type();
}

function getImageUrlWithTimestamp(url) {
  return url ? `${url}?${new Date().getTime()}` : '';
}

// Keep this since it's used initially (but not for reshuffle)
function getRandomPrompts(prompts, count = 3) {
  const validPrompts = prompts.filter(p =>
    p.prompt && p.background &&
    Array.isArray(p.sliderImages) && p.sliderImages.length > 0 &&
    Array.isArray(p.sliderText) && p.sliderText.length > 0
  );
  const shuffled = [...validPrompts].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, validPrompts.length));
}

let currentRotation = 0;
let animationStartTime = Date.now();
const rotationSpeed = 360 / 30000;

function updatePanelVisibility() {
  const carousel = document.querySelector('.carousel');
  const panels = document.querySelectorAll('.panel');
  const isPaused = carousel.classList.contains('paused');
  const isMobile = window.innerWidth <= 768;

  if (!isPaused) {
    const elapsed = Date.now() - animationStartTime;
    currentRotation = (elapsed * rotationSpeed) % 360;
  }

  panels.forEach((panel, index) => {
    const promptEl = panel.querySelector('.prompt');
    const backgroundImage = panel.querySelector('.background-image');

    if (panel.classList.contains('active')) {
      if (promptEl) promptEl.style.opacity = 1;
      if (backgroundImage) backgroundImage.style.opacity = 0.7;
      panel.style.pointerEvents = 'auto';
      return;
    }

    const baseRotation = index * 120;
    const totalRotation = (baseRotation + currentRotation) % 360;

    let opacity = 1;
    if (isMobile) {
      if (totalRotation >= 90 && totalRotation <= 270) opacity = 0;
    } else {
      if (totalRotation >= 70 && totalRotation <= 110) opacity = Math.max(0, (110 - totalRotation) / 40);
      else if (totalRotation > 110 && totalRotation < 250) opacity = 0;
      else if (totalRotation >= 250 && totalRotation <= 290) opacity = Math.max(0, (totalRotation - 250) / 40);
    }

    if (promptEl) {
      promptEl.style.opacity = opacity;
      promptEl.style.pointerEvents = opacity > 0.1 ? 'auto' : 'none';
    }
    if (backgroundImage) {
      backgroundImage.style.opacity = opacity * 0.7;
      backgroundImage.style.pointerEvents = opacity > 0.1 ? 'auto' : 'none';
    }
    panel.style.pointerEvents = opacity > 0.1 ? 'auto' : 'none';
  });
}

async function waitForImages(panels) {
  const imagePromises = [];
  panels.forEach(panel => {
    const backgroundImage = panel.querySelector('.background-image');
    if (backgroundImage && backgroundImage.src) {
      imagePromises.push(new Promise(resolve => {
        if (backgroundImage.complete) resolve();
        else {
          backgroundImage.onload = resolve;
          backgroundImage.onerror = resolve;
        }
      }));
    }
  });
  await Promise.all(imagePromises);
}

async function updatePanels(panels, selectedPrompts, carousel, activePanel) {
  const isMobile = window.innerWidth <= 768;

  if (visibilityInterval) clearInterval(visibilityInterval);

  panels.forEach((panel, panelIndex) => {
    const slider = panel.querySelector('.image-slider');
    const promptEl = panel.querySelector('.prompt');
    const imgEl = panel.querySelector('.slider-image');
    const textEl = panel.querySelector('.slider-text');
    const backgroundImage = panel.querySelector('.background-image');

    panel.classList.remove('active');
    slider.style.display = 'none';
    promptEl.style.display = 'block';
    backgroundImage.style.display = 'block';
    textEl.classList.remove('fade-in', 'scrolled');
    carousel.classList.remove('paused');

    const data = selectedPrompts[panelIndex] || {};
    promptEl.textContent = data.prompt || 'Prompt not available';
    promptEl.style.opacity = '1';
    imgEl.src = getImageUrlWithTimestamp(data.sliderImages ? data.sliderImages[0] : '');
    let sliderText = data.sliderText ? data.sliderText[0] : '';
    if (isMobile && sliderText.length > 80) sliderText = sliderText.substring(0, 77) + '...';
    textEl.textContent = sliderText;
    backgroundImage.src = getImageUrlWithTimestamp(data.background || '');
  });

  await waitForImages(panels);
  animationStartTime = Date.now();
  currentRotation = 0;

  carousel.style.animation = 'none';
  void carousel.offsetWidth;
  carousel.style.animation = 'rotate 30s infinite linear';

  updatePanelVisibility();
  visibilityInterval = setInterval(updatePanelVisibility, 50);
  return null;
}

window.addEventListener('load', async function () {
  const headerDesc = document.querySelector('.intro-section p');
  if (headerDesc) typeText(headerDesc, headerDesc.innerHTML, 50);

  try {
    const response = await fetch('prompts.json');
    if (!response.ok) throw new Error('HTTP error! status: ' + response.status);
    const prompts = await response.json();

    const carousel = document.querySelector('.carousel');
    const panels = document.querySelectorAll('.panel');
    let activePanel = null;

    const backdrop = document.createElement('div');
    backdrop.className = 'panel-backdrop';
    document.body.appendChild(backdrop);

    let selectedPrompts = getRandomPrompts(prompts);
    await updatePanels(panels, selectedPrompts, carousel, activePanel);

    visibilityInterval = setInterval(updatePanelVisibility, 50);

    // Create the overlay only once, outside the panel loop
    const overlay = document.createElement('div');
    overlay.className = 'panel-overlay';
    overlay.innerHTML = `
    <div class="overlay-content">
        <button class="overlay-close">×</button>
        <div class="overlay-body"></div>
    </div>
    `;
    document.body.appendChild(overlay);

    const overlayBody = overlay.querySelector('.overlay-body');
    const overlayClose = overlay.querySelector('.overlay-close');

    // Set up panel event listeners
// Set up panel event listeners
    panels.forEach(panel => {
    const slider = panel.querySelector('.image-slider');
    const closeButton = panel.querySelector('.close-button');
    const promptEl = panel.querySelector('.prompt');
    const textEl = panel.querySelector('.slider-text');
    const backgroundImage = panel.querySelector('.background-image');
    const imgEl = panel.querySelector('.slider-image');
    const imageScroll = panel.querySelector('.image-scroll');

    imageScroll.addEventListener('scroll', () => {
        if (!panel.classList.contains('active')) return;
        if (imageScroll.scrollTop > 50) {
        textEl.classList.remove('fade-in');
        textEl.classList.add('scrolled');
        } else {
        textEl.classList.add('fade-in');
        textEl.classList.remove('scrolled');
        }
    });

    // Open overlay with clicked panel's content
    panel.addEventListener('click', (e) => {
        e.stopPropagation();
        carousel.classList.add('paused'); // pause rotation

        const promptText = promptEl.textContent.trim();
        const sliderText = textEl.textContent.trim();

        // Avoid showing duplicate text if they're the same
        const finalText = promptText === sliderText ? '' : sliderText;

        overlayBody.innerHTML = `
        <div class="overlay-prompt">${promptText}</div>
        <img src="${imgEl.src}" alt="" class="overlay-bg">
        ${finalText ? `<p class="overlay-text">${finalText}</p>` : ''}
        `;


        overlay.classList.add('active');
    });

    // Add click handler to slider image for enlargement
    imgEl.addEventListener('click', (e) => {
        e.stopPropagation();
        const promptText = promptEl.textContent.trim();
        const sliderText = textEl.textContent.trim();
        const finalText = promptText === sliderText ? '' : sliderText;

        overlayBody.innerHTML = `
        <div class="overlay-prompt">${promptText}</div>
        <img src="${imgEl.src}" alt="" class="overlay-bg">
        ${finalText ? `<p class="overlay-text">${finalText}</p>` : ''}
        `;

        overlay.classList.add('active');
    });

    // optional: close button on panel (if still needed)
    closeButton.addEventListener('click', (e) => {
        e.stopPropagation();
        overlay.classList.remove('active');
        carousel.classList.remove('paused');
    });
    });

    // Close overlay logic
    overlayClose.addEventListener('click', () => {
    overlay.classList.remove('active');
    carousel.classList.remove('paused');
    });

    overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
        overlay.classList.remove('active');
        carousel.classList.remove('paused');
    }
    });


    backdrop.addEventListener('click', () => {
      if (!activePanel) return;
      activePanel.classList.remove('active');
      backdrop.classList.remove('active');
      activePanel.querySelector('.image-slider').style.display = 'none';
      activePanel.querySelector('.prompt').style.display = 'block';
      activePanel.querySelector('.background-image').style.display = 'block';
      carousel.classList.remove('paused');
      activePanel = null;
    });

  } catch (error) {
    console.error('Failed to fetch prompts:', error);
    alert('Error loading carousel data. Please try again later.');
  }
});
