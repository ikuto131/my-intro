document.addEventListener('DOMContentLoaded', () => {
    // Intersection Observer for scroll animations
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.15
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                // stop observing once it's visible to keep it shown
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Select elements to animate
    const fadeElements = document.querySelectorAll('.fade-in');
    const slideElements = document.querySelectorAll('.slide-up');

    // Add them to observer
    fadeElements.forEach(el => observer.observe(el));
    slideElements.forEach(el => observer.observe(el));

    // Initially trigger visible for elements already in viewport (like hero)
    setTimeout(() => {
        fadeElements.forEach(el => {
            const rect = el.getBoundingClientRect();
            if (rect.top < window.innerHeight) {
                el.classList.add('visible');
            }
        });
    }, 100);
});
