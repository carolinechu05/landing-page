let typingTimeout = null;
let visibilityInterval = null;

// Typing animation function (used only for header description)
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

// Utility to append timestamp to image URLs
function getImageUrlWithTimestamp(url) {
    return url ? `${url}?${new Date().getTime()}` : '';
}

// Function to shuffle and select 3 unique prompts
function getRandomPrompts(prompts, count = 3) {
    const validPrompts = prompts.filter(p => 
        p.prompt && p.background && 
        Array.isArray(p.sliderImages) && p.sliderImages.length > 0 && 
        Array.isArray(p.sliderText) && p.sliderText.length > 0
    );
    const shuffled = [...validPrompts].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, validPrompts.length));
}

// Track carousel rotation angle
let currentRotation = 0;
let animationStartTime = Date.now();
const rotationSpeed = 360 / 30000;

// Function to check if panel is facing backward and adjust visibility
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
            // Active panels should always be fully visible
            if (promptEl) {
                promptEl.style.opacity = 1;
                promptEl.style.pointerEvents = 'auto';
            }
            if (backgroundImage) {
                backgroundImage.style.opacity = 0.7;
                backgroundImage.style.pointerEvents = 'auto';
            }
            panel.style.pointerEvents = 'auto';
            return;
        }
        
        const baseRotation = index * 120;
        const totalRotation = (baseRotation + currentRotation) % 360;
        
        let opacity = 1;
        if (isMobile) {
            if (totalRotation >= 90 && totalRotation <= 270) {
                opacity = 0;
            }
        } else {
            if (totalRotation >= 70 && totalRotation <= 110) {
                opacity = Math.max(0, (110 - totalRotation) / 40);
            } else if (totalRotation > 110 && totalRotation < 250) {
                opacity = 0;
            } else if (totalRotation >= 250 && totalRotation <= 290) {
                opacity = Math.max(0, (totalRotation - 250) / 40);
            }
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

// Function to wait for images to load
async function waitForImages(panels) {
    const imagePromises = [];
    panels.forEach(panel => {
        const backgroundImage = panel.querySelector('.background-image');
        if (backgroundImage && backgroundImage.src) {
            imagePromises.push(new Promise(resolve => {
                if (backgroundImage.complete) {
                    resolve();
                } else {
                    backgroundImage.onload = resolve;
                    backgroundImage.onerror = () => {
                        console.error('Failed to load image: ' + backgroundImage.src);
                        resolve(); // Resolve even on error to avoid blocking
                    };
                }
            }));
        }
    });
    await Promise.all(imagePromises);
}

// Function to update panels with new prompts
async function updatePanels(panels, selectedPrompts, carousel, activePanel) {
    const isMobile = window.innerWidth <= 768;
    
    // Clear existing visibility interval to prevent premature updates
    if (visibilityInterval) {
        clearInterval(visibilityInterval);
    }
    
    panels.forEach((panel, panelIndex) => {
        const slider = panel.querySelector('.image-slider');
        const promptEl = panel.querySelector('.prompt');
        const imgEl = panel.querySelector('.slider-image');
        const textEl = panel.querySelector('.slider-text');
        const backgroundImage = panel.querySelector('.background-image');

        if (panel.classList.contains('active')) {
            panel.classList.remove('active');
            slider.style.display = 'none';
            promptEl.style.display = 'block';
            backgroundImage.style.display = 'block';
            textEl.classList.remove('fade-in');
            textEl.classList.remove('scrolled');
            carousel.classList.remove('paused');
        }

        const data = selectedPrompts[panelIndex] || {};
        promptEl.textContent = data.prompt || 'Prompt not available';
        promptEl.style.opacity = '1'; // Force immediate visibility
        promptEl.style.transition = 'none'; // Remove any transitions
        imgEl.src = getImageUrlWithTimestamp(data.sliderImages ? data.sliderImages[0] : '');
        let sliderText = data.sliderText ? data.sliderText[0] : '';
        if (isMobile && sliderText.length > 80) {
            sliderText = sliderText.substring(0, 77) + '...';
        }
        textEl.textContent = sliderText;
        backgroundImage.src = getImageUrlWithTimestamp(data.background || '');
        
        // Force reflow to ensure transition reset takes effect
        void promptEl.offsetWidth;
        promptEl.style.transition = '';
    });
    
    // Wait for images to load before updating visibility
    await waitForImages(panels);
    
    // Reset carousel state and restart animation
    animationStartTime = Date.now();
    currentRotation = 0;
    
    // Remove and re-add animation to reset it
    carousel.style.animation = 'none';
    void carousel.offsetWidth; // Force reflow
    carousel.style.animation = '';
    
    // Update visibility immediately and resume interval
    updatePanelVisibility();
    visibilityInterval = setInterval(updatePanelVisibility, 50);
    
    return null;
}

// Fetch JSON and initialize carousel
window.addEventListener('load', async function() {
    const headerDesc = document.querySelector('.intro-section p');
    if (headerDesc) {
        typeText(headerDesc, headerDesc.innerHTML, 50);
    }

    try {
        const response = await fetch('prompts.json');
        if (!response.ok) throw new Error('HTTP error! status: ' + response.status);
        const prompts = await response.json();

        // Preload all images
        prompts.forEach(p => {
            if (p.background) {
                const bgImg = new Image();
                bgImg.src = getImageUrlWithTimestamp(p.background);
            }
            if (Array.isArray(p.sliderImages)) {
                p.sliderImages.forEach(si => {
                    const sliderImg = new Image();
                    sliderImg.src = getImageUrlWithTimestamp(si);
                });
            }
        });

        const carousel = document.querySelector('.carousel');
        const panels = document.querySelectorAll('.panel');
        let activePanel = null;

        let selectedPrompts = getRandomPrompts(prompts);
        await updatePanels(panels, selectedPrompts, carousel, activePanel);

        visibilityInterval = setInterval(updatePanelVisibility, 50);

        panels.forEach((panel, panelIndex) => {
            const slider = panel.querySelector('.image-slider');
            const closeButton = panel.querySelector('.close-button');
            const promptEl = panel.querySelector('.prompt');
            const imgEl = panel.querySelector('.slider-image');
            const textEl = panel.querySelector('.slider-text');
            const backgroundImage = panel.querySelector('.background-image');

            const imageScroll = panel.querySelector('.image-scroll');
            imageScroll.addEventListener('scroll', () => {
                if (panel.classList.contains('active')) {
                    if (imageScroll.scrollTop > 50) {
                        textEl.classList.remove('fade-in');
                        textEl.classList.add('scrolled');
                    } else {
                        textEl.classList.add('fade-in');
                        textEl.classList.remove('scrolled');
                    }
                }
            });

            panel.addEventListener('click', (e) => {
                // Only allow clicks on panels that are facing forward
                const baseRotation = panelIndex * 120;
                const totalRotation = (baseRotation + currentRotation) % 360;
                const isFacingForward = (totalRotation >= 315 || totalRotation <= 45);
                
                if (!isFacingForward && !panel.classList.contains('active')) {
                    return; // Ignore clicks on panels facing away
                }
                
                e.stopPropagation();
                if (activePanel === panel) {
                    panel.classList.remove('active');
                    slider.style.display = 'none';
                    promptEl.style.display = 'block';
                    backgroundImage.style.display = 'block';
                    textEl.classList.remove('fade-in');
                    textEl.classList.remove('scrolled');
                    carousel.classList.remove('paused');
                    animationStartTime = Date.now() - (currentRotation / rotationSpeed);
                    activePanel = null;
                } else {
                    if (activePanel) {
                        activePanel.classList.remove('active');
                        activePanel.querySelector('.image-slider').style.display = 'none';
                        activePanel.querySelector('.prompt').style.display = 'block';
                        activePanel.querySelector('.background-image').style.display = 'block';
                        activePanel.querySelector('.slider-text').classList.remove('fade-in');
                        activePanel.querySelector('.slider-text').classList.remove('scrolled');
                    }

                    panel.classList.add('active');
                    setTimeout(() => {
                        slider.style.display = 'flex';
                        promptEl.style.display = 'none';
                        backgroundImage.style.display = 'none';
                        textEl.style.opacity = '0';
                        textEl.classList.remove('scrolled');
                        textEl.classList.add('fade-in');
                        carousel.classList.add('paused');
                    }, 500);
                    activePanel = panel;
                }
            });

            closeButton.addEventListener('click', (e) => {
                e.stopPropagation();
                panel.classList.remove('active');
                slider.style.display = 'none';
                promptEl.style.display = 'block';
                backgroundImage.style.display = 'block';
                textEl.classList.remove('fade-in');
                textEl.classList.remove('scrolled');
                carousel.classList.remove('paused');
                animationStartTime = Date.now() - (currentRotation / rotationSpeed);
                activePanel = null;
            });
        });

        const reshuffleButton = document.querySelector('#reshuffleButton');
        if (reshuffleButton) {
            reshuffleButton.addEventListener('click', async () => {
                selectedPrompts = getRandomPrompts(prompts);
                activePanel = await updatePanels(panels, selectedPrompts, carousel, activePanel);
            });
        }

        document.querySelectorAll('img').forEach(img => {
            img.addEventListener('error', () => {
                console.error('Failed to load image: ' + img.src);
                img.style.display = 'none';
                const placeholder = document.createElement('div');
                placeholder.className = 'image-placeholder';
                placeholder.textContent = 'Image Not Found';
                img.parentNode.appendChild(placeholder);
            });
        });
    } catch (error) {
        console.error('Failed to fetch prompts:', error);
        alert('Error loading carousel data. Please try again later.');
    }

    const scriptURL = "https://script.google.com/macros/s/AKfycbzQe3O4KuzH21alxgwm3CzceDktRBCNcYniNfaVVo7LMbrfTnEyRzHfMJaS8Y6_lWW6Ow/exec";
    document.getElementById("waitlistForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);
        try {
            await fetch(scriptURL, { method: "POST", body: formData });
            alert("You've been added to the waitlist!");
            form.reset();
        } catch (error) {
            console.error("Error!", error);
            alert("Something went wrong. Please try again.");
        }
    });
});