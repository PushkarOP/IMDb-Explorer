// YouTube iframe fix
document.addEventListener('DOMContentLoaded', function() {
    // Function to fix YouTube iframes
    function fixYoutubeIframes() {
        // Find all iframes that contain youtube in their src
        const youtubeIframes = document.querySelectorAll('iframe[src*="youtube"]');
        
        youtubeIframes.forEach(iframe => {
            // If not already wrapped, wrap in container
            if (!iframe.parentElement.classList.contains('video-container')) {
                // Remove any fixed dimensions that might be causing the ratio issue
                iframe.removeAttribute('width');
                iframe.removeAttribute('height');
                iframe.style.width = '100%';
                iframe.style.height = '100%';
                
                // Create wrapper
                const wrapper = document.createElement('div');
                wrapper.className = 'video-container';
                
                // Replace iframe with wrapped iframe
                const parent = iframe.parentElement;
                parent.insertBefore(wrapper, iframe);
                wrapper.appendChild(iframe);
            }
        });
    }

    // Initial fix
    fixYoutubeIframes();
    
    // Fix any dynamically added iframes
    // Create a mutation observer to watch for changes
    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            if (mutation.addedNodes.length) {
                fixYoutubeIframes();
            }
        });
    });
    
    // Start observing the modal content
    observer.observe(document.querySelector('#modalContent'), { 
        childList: true, 
        subtree: true 
    });
    
    // Also check when modal opens
    document.querySelector('#detailModal').addEventListener('transitionend', fixYoutubeIframes);
});