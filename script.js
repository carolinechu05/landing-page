        // Typing animation function
        function typeText(element, text, speed = 100) {
            element.textContent = ''; // Clears the text
            let i = 0;
            function type() {
                if (i < text.length) {
                    element.textContent += text.charAt(i);
                    i++;
                    setTimeout(type, speed); // Adds one character at a time with a 100ms delay
                }
            }
            type();
        }

        // Fetch JSON data and initialize carousel
        window.addEventListener('load', function() {
            fetch('prompts.json')
            .then(function(response) { // Check if the file loaded successfully. If not (!response.ok means "if response is NOT ok"), create an error message
                if (!response.ok) {
                    throw new Error('HTTP error! status: ' + response.status);
                }
                return response.json(); // Convert the loaded file from JSON format into JavaScript data
            })
            .then(function(prompts) {
                var carousel = document.querySelector('.carousel');
                var panels = document.querySelectorAll('.panel');
                var activePanel = null;

                // Loop through each panel (there are 3 panels: index 0, 1, 2)
                panels.forEach(function(panel, panelIndex) {
                    var slider = panel.querySelector('.image-slider'); // the image slideshow container
                    var slides = slider.querySelectorAll('.image-slide'); // all the individual images in the slideshow
                    var leftArrow = panel.querySelector('.arrow-left'); //  the ← button
                    var rightArrow = panel.querySelector('.arrow-right'); // the → button
                    var closeButton = panel.querySelector('.close-button'); // the × button
                    var prompt = panel.querySelector('.prompt'); // the text that appears on the panel
                    var backgroundImage = panel.querySelector('.background-image'); // the background image
                    var currentSlide = 0; // Start showing the first image (index 0)

                    // Set content from JSON
                    prompt.textContent = prompts[panelIndex].prompt;
                    backgroundImage.src = prompts[panelIndex].background;

                    slides.forEach(function(slide, slideIndex) { // Loop through each image slide in this panel
                        var img = slide.querySelector('.slider-image'); // For each slide, find the image and text elements
                        var textElement = slide.querySelector('.slider-text');
                        img.src = prompts[panelIndex].sliderImages[slideIndex]; // Set the image source from our JSON data
                        textElement.textContent = prompts[panelIndex].sliderText[slideIndex]; // Set the text content from our JSON data
                    });

                    function showSlide(index) {
                        slides.forEach(function(slide, i) {
                            slide.classList.toggle('active', i === index); // If this slide number equals the index we want, add the 'active' class Otherwise, remove the 'active' class
                            if (i === index) {
                                var textElement = slide.querySelector('.slider-text');
                                typeText(textElement, prompts[panelIndex].sliderText[i], 100);
                            }
                        });
                    }

                    // Event listeners
                    panel.addEventListener('click', function(e) {
                        e.stopPropagation();
                        if (activePanel === panel) {
                            // Close logic
                            panel.classList.remove('active');
                            slider.style.display = 'none';
                            backgroundImage.style.display = 'block';
                            prompt.style.display = 'block';
                            carousel.classList.remove('paused');
                            activePanel = null;
                        } else {
                            // Open logic
                            if (activePanel) {
                                // Close previous panel
                                activePanel.classList.remove('active');
                                activePanel.querySelector('.image-slider').style.display = 'none';
                                activePanel.querySelector('.background-image').style.display = 'block';
                                activePanel.querySelector('.prompt').style.display = 'block';
                            }
                            
                            panel.classList.add('active');
                            setTimeout(function() { // Wait 0.5 seconds for the enlargement animation
                                slider.style.display = 'block';
                                backgroundImage.style.display = 'none';
                                prompt.style.display = 'none';
                                carousel.classList.add('paused');
                                showSlide(currentSlide);
                            }, 500);
                            activePanel = panel;
                        }
                    });

                    leftArrow.addEventListener('click', function(e) {
                        e.stopPropagation();
                        currentSlide = (currentSlide - 1 + slides.length) % slides.length; // Move to previous slide (with wraparound - if at slide 0, go to last slide)
                        showSlide(currentSlide);
                    });

                    rightArrow.addEventListener('click', function(e) {
                        e.stopPropagation();
                        currentSlide = (currentSlide + 1) % slides.length; // Move to next slide (with wraparound - if at last slide, go to slide 0)
                        showSlide(currentSlide);
                    });

                    closeButton.addEventListener('click', function(e) {
                        e.stopPropagation();
                        panel.classList.remove('active');
                        slider.style.display = 'none';
                        backgroundImage.style.display = 'block';
                        prompt.style.display = 'block';
                        carousel.classList.remove('paused');
                        activePanel = null;
                    });

                    showSlide(currentSlide);
                });

                // Image error handling
                document.querySelectorAll('img').forEach(function(img) {
                    img.addEventListener('error', function() {
                        console.error('Failed to load image: ' + img.src);
                        img.style.display = 'none';
                        var placeholder = document.createElement('div');
                        placeholder.className = 'image-placeholder';
                        placeholder.textContent = 'Image Not Found';
                        img.parentNode.appendChild(placeholder);
                    });
                });
            })
            .catch(function(error) { // Error Handling for the Whole Function
                console.error('Failed to fetch prompts:', error);
                alert('Error loading carousel data. Please try again later.');
            });
        });

        // Initialize carousel after fetching data
        initCarousel();

        // Form submission
        // Sends the data to a Google Script
        const scriptURL = "https://script.google.com/macros/s/AKfycbzQe3O4KuzH21alxgwm3CzceDktRBCNcYniNfaVVo7LMbrfTnEyRzHfMJaS8Y6_lWW6Ow/exec";
        document.getElementById("waitlistForm").addEventListener("submit", async (e) => {
            e.preventDefault();
            const form = e.target;
            const formData = new FormData(form);
            try {
                await fetch(scriptURL, { method: "POST", body: formData });
                alert("You’ve been added to the waitlist!");
                form.reset();
            } catch (error) {
                console.error("Error!", error);
                alert("Something went wrong. Please try again.");
            }
        });