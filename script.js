let typingTimeout = null;

// Typing animation function (used only for header description)
function typeText(element, text, speed = 100) {
    if (typingTimeout) clearTimeout(typingTimeout);
    
    // Normalize text: remove HTML tags and preserve line breaks
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'text/html');
    const cleanText = doc.body.textContent || text;
    const textWithBreaks = cleanText.replace(/\n/g, '\n');
    
    // Set full text temporarily to calculate height
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
        // Set pointer-events on the panel to disable clicks on back panels
        panel.style.pointerEvents = opacity > 0.1 ? 'auto' : 'none';
    });
}

// Function to update panels with new prompts
function updatePanels(panels, selectedPrompts, carousel, activePanel) {
    const isMobile = window.innerWidth <= 768;
    const timestamp = new Date().getTime(); // Timestamp to force image reload
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
        imgEl.src = data.sliderImages ? `${data.sliderImages[0]}?${timestamp}` : '';
        let sliderText = data.sliderText ? data.sliderText[0] : '';
        if (isMobile && sliderText.length > 80) {
            sliderText = sliderText.substring(0, 77) + '...';
        }
        textEl.textContent = sliderText;
        backgroundImage.src = data.background ? `${data.background}?${timestamp}` : '';
    });
    
    animationStartTime = Date.now();
    currentRotation = 0;
    updatePanelVisibility(); // Immediately update visibility after reshuffle
    
    return null;
}

// Fetch JSON and initialize carousel
window.addEventListener('load', function() {
    const headerDesc = document.querySelector('.intro-section p');
    if (headerDesc) {
        typeText(headerDesc, headerDesc.innerHTML, 50);
    }

    fetch('prompts.json')
        .then(response => {
            if (!response.ok) throw new Error('HTTP error! status: ' + response.status);
            return response.json();
        })
        .then(prompts => {
            // Preload all images to prevent loading issues
            prompts.forEach(p => {
                if (p.background) {
                    const bgImg = new Image();
                    bgImg.src = p.background;
                }
                if (Array.isArray(p.sliderImages)) {
                    p.sliderImages.forEach(si => {
                        const sliderImg = new Image();
                        sliderImg.src = si;
                    });
                }
            });

            const carousel = document.querySelector('.carousel');
            const panels = document.querySelectorAll('.panel');
            let activePanel = null;

            let selectedPrompts = getRandomPrompts(prompts);
            updatePanels(panels, selectedPrompts, carousel, activePanel);

            setInterval(updatePanelVisibility, 50); // Keep interval but consider increasing to 100 for optimization if needed

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
                reshuffleButton.addEventListener('click', () => {
                    selectedPrompts = getRandomPrompts(prompts);
                    activePanel = updatePanels(panels, selectedPrompts, carousel, activePanel);
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
        })
        .catch(error => {
            console.error('Failed to fetch prompts:', error);
            alert('Error loading carousel data. Please try again later.');
        });

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