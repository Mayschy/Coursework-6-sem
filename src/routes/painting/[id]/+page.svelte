<script>
    import { invalidateAll } from '$app/navigation';
    import { fly } from 'svelte/transition'; // Assuming you use this for modal transition

    export let data; // Data from your +page.server.js

    let showModal = false; // For "Add to cart" modal
    let successMessage = '';
    let errorMessage = '';

    // New variables for the "Try on wall" modal
    let showTryOnModal = false;
    let canvasElement; // Reference to the HTML canvas element
    let ctx; // 2D drawing context for canvas

    // Use ImageBitmap for wallImage for security
    let wallImageBitmap = null; // Will store ImageBitmap for the uploaded wall

    // Image object for the frame
    let frameImage = new Image();
    // !!! IMPORTANT: Update this path to your frame image !!!
    // Assuming frame is local in static/frames/
    frameImage.src = '/frames/11429042.png'; // Make sure this path is correct for your project
    // frameImage.crossOrigin = "anonymous"; // Not needed for local files
    frameImage.onload = () => {
        console.log("Frame image loaded.");
        // If painting is already loaded, combine them
        if (paintingImage.complete) {
            combinePaintingAndFrame();
        }
    };
    frameImage.onerror = (e) => {
        console.error("Failed to load frame image. Check path:", frameImage.src, e);
        // You might want a user-facing error here too
    };


    // Combined painting (painting inside the frame)
    let combinedPaintingImageBitmap = null; // Store ImageBitmap of combined image

    // Original painting image (used to generate the combined image)
    let paintingImage = new Image();
    // No need for crossOrigin here, as it will go through our proxy
    // paintingImage.crossOrigin = "anonymous"; // No longer needed directly on this Image object
    // Load the original painting image when the component mounts or data changes
    $: {
        if (data.painting && data.painting.previewImage) {
            // Transform Cloudinary URL to our proxy URL
            const cloudinaryBasePrefix = 'https://res.cloudinary.com/dvfjsg1c6/image/upload/'; // !!! Match your cloud name !!!
            let cloudinaryPath = data.painting.previewImage.replace(cloudinaryBasePrefix, '');
            if (data.painting.previewImage.includes('/upload/')) {
                cloudinaryPath = data.painting.previewImage.split('/upload/')[1];
            }

            paintingImage.src = `/api/proxy-image/${cloudinaryPath}`;
            console.log("Proxying painting image from:", paintingImage.src);

            paintingImage.onload = () => {
                console.log("Product painting image loaded (via proxy).");
                // If frame is also loaded, combine them
                if (frameImage.complete) {
                    combinePaintingAndFrame();
                }
            };
            paintingImage.onerror = (e) => {
                console.error("Failed to load product painting image (via proxy). Check server logs:", paintingImage.src, e);
                // You might want a user-facing error here too
            };
        }
    }


    // Position and size of the *combined painting (with frame)* on the wall
    let paintingX = 50; // Initial X-position
    let paintingY = 50; // Initial Y-position
    let paintingWidth = 300; // Initial width of the combined image (arbitrary for now, will be scaled)
    let paintingHeight; // Will be calculated based on combined image aspect ratio

    let isDragging = false;
    let startX, startY;
    let offsetX, offsetY;

    // --- Add to Cart Logic (unchanged) ---
    async function addToCart() {
        errorMessage = '';
        successMessage = '';
        try {
            const res = await fetch('/api/cart', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ paintingId: data.painting._id })
            });

            if (res.ok) {
                successMessage = 'Painting added to cart!';
                showModal = true;
                await invalidateAll();
            } else {
                const errData = await res.json();
                errorMessage = errData.message || 'Error adding to cart.';
                showModal = true;
            }
        } catch (e) {
            errorMessage = 'Network error when adding to cart.';
            showModal = true;
            console.error(e);
        }
    }

    // --- Logic for "Try on Wall" feature ---

    function openTryOnModal() {
        // Only open if the combined image is ready
        if (!combinedPaintingImageBitmap) {
            alert("Painting with frame is still loading. Please wait a moment.");
            return;
        }

        showTryOnModal = true;
        wallImageBitmap = null; // Clear previous wall image bitmap

        // Ensure canvas and ctx are ready before drawing
        requestAnimationFrame(() => { // Use rAF to ensure canvasElement is bound
            if (canvasElement) {
                ctx = canvasElement.getContext('2d');

                // --- NEW LOGIC FOR INITIAL PAINTING SIZE ---
                // Set initial canvas dimensions to fit the modal
                const initialCanvasWidth = 800; // A reasonable default width for the modal's canvas
                const initialCanvasHeight = 500; // A reasonable default height

                canvasElement.width = initialCanvasWidth;
                canvasElement.height = initialCanvasHeight;


                if (combinedPaintingImageBitmap) {
                    // Calculate a target width for the combined image (e.g., 30-40% of canvas width)
                    let targetPaintingWidth = initialCanvasWidth * 0.35; // Start at 35% of canvas width

                    // Ensure the initial size is not larger than its natural size (if it's a very small image)
                    targetPaintingWidth = Math.min(targetPaintingWidth, combinedPaintingImageBitmap.width);

                    // Maintain aspect ratio for height
                    paintingWidth = targetPaintingWidth;
                    paintingHeight = paintingWidth * (combinedPaintingImageBitmap.height / combinedPaintingImageBitmap.width);

                    // Center the painting initially
                    paintingX = (initialCanvasWidth / 2) - (paintingWidth / 2);
                    paintingY = (initialCanvasHeight / 2) - (paintingHeight / 2);

                    // Ensure painting fits on screen initially if it somehow becomes too big due to initial calculations
                    if (paintingHeight > initialCanvasHeight) {
                        paintingHeight = initialCanvasHeight * 0.8; // Fit to 80% of canvas height
                        paintingWidth = paintingHeight / (combinedPaintingImageBitmap.height / combinedPaintingImageBitmap.width);
                        paintingX = (initialCanvasWidth / 2) - (paintingWidth / 2);
                        paintingY = (initialCanvasHeight / 2) - (paintingHeight / 2);
                    }
                } else {
                    // Fallback default if combinedPaintingImageBitmap is not ready (should be checked above)
                    paintingWidth = 200;
                    paintingHeight = 200;
                    paintingX = (initialCanvasWidth / 2) - (paintingWidth / 2);
                    paintingY = (initialCanvasHeight / 2) - (paintingHeight / 2);
                }

                drawCanvas();
            }
        });
    }

    function closeTryOnModal() {
        showTryOnModal = false;
        isDragging = false; // Ensure dragging state is reset
        // Release ImageBitmaps to free memory
        if (wallImageBitmap) {
            wallImageBitmap.close();
            wallImageBitmap = null;
        }
        // combinedPaintingImageBitmap might be reused, so don't close it unless absolutely necessary
        // combinedPaintingImageBitmap.close(); // Only if you never need it again until full reload
    }

    // Function to combine the painting with the frame
    async function combinePaintingAndFrame() {
        if (!paintingImage.complete || !frameImage.complete) {
            console.log("Waiting for painting or frame to load before combining.");
            return; // Wait for both to be loaded
        }
        if (paintingImage.naturalWidth === 0 || paintingImage.naturalHeight === 0 ||
            frameImage.naturalWidth === 0 || frameImage.naturalHeight === 0) {
            console.warn("Painting or frame image failed to load with dimensions. Cannot combine.");
            return;
        }


        const frameCanvas = document.createElement('canvas');
        const frameCtx = frameCanvas.getContext('2d');

        // Set frame canvas size to frame image size
        frameCanvas.width = frameImage.naturalWidth;
        frameCanvas.height = frameImage.naturalHeight;

        // Draw the frame first
        frameCtx.drawImage(frameImage, 0, 0, frameCanvas.width, frameCanvas.height);

        // --- Calculate where to draw the painting inside the frame ---
        // THESE VALUES ARE CRITICAL. Double-check them for your specific PNG frame.
        // If your PNG frame has different transparent area, adjust these.
        // For 11429042.png (3328x4864) with 200px border:
        const innerFrameX = 200; // X-coordinate of the top-left corner of the inner frame area
        const innerFrameY = 200; // Y-coordinate of the top-left corner of the inner frame area
        const innerFrameWidth = frameImage.naturalWidth - (innerFrameX * 2); // Width of the inner frame area
        const innerFrameHeight = frameImage.naturalHeight - (innerFrameY * 2); // Height of the inner frame area

        // Log calculated inner frame dimensions for debugging
        console.log(`Inner Frame Area: X=${innerFrameX}, Y=${innerFrameY}, W=${innerFrameWidth}, H=${innerFrameHeight}`);

        // Calculate aspect ratios
        const paintingAspectRatio = paintingImage.naturalWidth / paintingImage.naturalHeight;
        const innerFrameAspectRatio = innerFrameWidth / innerFrameHeight;

        let targetWidth, targetHeight;

        // Scale painting to fit *within* the inner frame area while maintaining aspect ratio
        // This is the "contain" logic.
        if (paintingAspectRatio > innerFrameAspectRatio) {
            // Painting is wider (or more landscape) than the inner frame's aspect ratio.
            // Fit by width: painting's width will be innerFrameWidth, height will be calculated.
            targetWidth = innerFrameWidth;
            targetHeight = targetWidth / paintingAspectRatio;
        } else {
            // Painting is taller (or more portrait) than the inner frame's aspect ratio.
            // Fit by height: painting's height will be innerFrameHeight, width will be calculated.
            targetHeight = innerFrameHeight;
            targetWidth = targetHeight * paintingAspectRatio;
        }

        // --- Optional: Prevent upscaling if the painting is smaller than the target size ---
        // This prevents very small images from becoming blurry when stretched.
        let drawWidth = targetWidth;
        let drawHeight = targetHeight;

        // Check if the painting's natural dimensions are smaller than the calculated target dimensions
        if (paintingImage.naturalWidth < targetWidth || paintingImage.naturalHeight < targetHeight) {
            console.log("Painting is smaller than the inner frame area. Limiting upscaling.");
            if (paintingImage.naturalWidth <= innerFrameWidth && paintingImage.naturalHeight <= innerFrameHeight) {
                // If the natural size fits within the frame, use it if it's smaller than the calculated target size
                // Otherwise, use the calculated target size (which would be a downscale)
                drawWidth = Math.min(targetWidth, paintingImage.naturalWidth);
                drawHeight = Math.min(targetHeight, paintingImage.naturalHeight);
            } else {
                // If the painting is larger than the inner frame area in one dimension,
                // it will be downscaled anyway. Just use the calculated targetWidth/Height.
                drawWidth = targetWidth;
                drawHeight = targetHeight;
            }
        }


        // Center the painting within the inner frame area
        const drawX = innerFrameX + (innerFrameWidth - drawWidth) / 2;
        const drawY = innerFrameY + (innerFrameHeight - drawHeight) / 2;

        // Log calculated drawing dimensions for debugging
        console.log(`Painting Draw Area: X=${drawX}, Y=${drawY}, W=${drawWidth}, H=${drawHeight}`);

        // Draw the painting over the frame
        frameCtx.drawImage(paintingImage, drawX, drawY, drawWidth, drawHeight);

        // Convert the combined image on the temporary canvas to an ImageBitmap
        try {
            combinedPaintingImageBitmap = await createImageBitmap(frameCanvas);
            console.log("Combined painting and frame successfully into ImageBitmap.");
            // If the modal is already open (e.g., user opened it while images were loading), redraw
            if (showTryOnModal) {
                openTryOnModal(); // Re-run initial sizing and drawing to use the new bitmap
            }

        } catch (e) {
            console.error("Error creating ImageBitmap from combined canvas (tainted?):", e);
            alert("Error combining painting with frame. Check browser console for CORS issues.");
            combinedPaintingImageBitmap = null; // Reset to ensure no partial state
        } finally {
             // Clean up temporary canvas
             frameCanvas.width = 0; // Clear memory
             frameCanvas.height = 0;
        }
    }


    // Changed to use createImageBitmap for wall image
    async function handleWallImageUpload(event) {
        const file = event.target.files[0];
        if (file) {
            try {
                // Use createImageBitmap directly from the File object
                wallImageBitmap = await createImageBitmap(file);
                console.log("Wall image loaded as ImageBitmap.");

                // Adjust canvas dimensions to fit the wall image while maintaining aspect ratio
                const maxCanvasWidth = 1000; // Max width for the canvas
                const maxCanvasHeight = 600; // Max height for the canvas

                let canvasW = wallImageBitmap.width;
                let canvasH = wallImageBitmap.height;

                // Scale down if image is larger than maxCanvasWidth
                if (canvasW > maxCanvasWidth) {
                    canvasH = (maxCanvasWidth / canvasW) * canvasH;
                    canvasW = maxCanvasWidth;
                }
                // Scale down if image is larger than maxCanvasHeight (after width scaling)
                if (canvasH > maxCanvasHeight) {
                    canvasW = (maxCanvasHeight / canvasH) * canvasW;
                    canvasH = maxCanvasHeight;
                }

                canvasElement.width = canvasW;
                canvasElement.height = canvasH;

                // Reset painting position relative to the new canvas size
                if (combinedPaintingImageBitmap) { // Only if combined image is ready
                    // Recalculate painting size based on new wall canvas dimensions
                    let targetPaintingWidth = canvasW * 0.35; // Start at 35% of new canvas width

                    // Ensure the initial size is not larger than its natural size (if it's a very small image)
                    targetPaintingWidth = Math.min(targetPaintingWidth, combinedPaintingImageBitmap.width);

                    paintingWidth = targetPaintingWidth;
                    paintingHeight = paintingWidth * (combinedPaintingImageBitmap.height / combinedPaintingImageBitmap.width);

                    paintingX = (canvasW / 2) - (paintingWidth / 2);
                    paintingY = (canvasH / 2) - (paintingHeight / 2);

                    // Ensure painting fits on screen initially if it somehow becomes too big due to initial calculations
                    if (paintingHeight > canvasH) {
                        paintingHeight = canvasH * 0.8; // Fit to 80% of canvas height
                        paintingWidth = paintingHeight / (combinedPaintingImageBitmap.height / combinedPaintingImageBitmap.width);
                        paintingX = (canvasW / 2) - (paintingWidth / 2);
                        paintingY = (canvasH / 2) - (paintingHeight / 2);
                    }
                }
                drawCanvas();
            } catch (e) {
                console.error("Failed to load wall image as ImageBitmap:", e);
                alert("Error loading wall image. Please try another image (could be corrupted).");
                wallImageBitmap = null; // Reset if error occurs
            }
        }
    }

    function drawCanvas() {
        if (!ctx) {
            console.warn("Canvas context not initialized. Attempting to re-initialize.");
            if (canvasElement) {
                ctx = canvasElement.getContext('2d');
            } else {
                console.error("Canvas element not available for drawing.");
                return;
            }
        }

        // Clear the entire canvas
        ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);

        // 1. Draw the wall image (using ImageBitmap)
        if (wallImageBitmap) {
            ctx.drawImage(wallImageBitmap, 0, 0, canvasElement.width, canvasElement.height);
        } else {
            // If no wall image, draw a placeholder background
            ctx.fillStyle = '#f0f0f0';
            ctx.fillRect(0, 0, canvasElement.width, canvasElement.height);
            ctx.fillStyle = '#666';
            ctx.font = '24px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('Upload your wall photo', canvasElement.width / 2, canvasElement.height / 2);
        }

        // 2. Draw the *combined* painting (with frame) *on top* of the wall image (using ImageBitmap)
        if (combinedPaintingImageBitmap && paintingHeight !== undefined) {
            ctx.drawImage(combinedPaintingImageBitmap, paintingX, paintingY, paintingWidth, paintingHeight);
        }
    }

    // Helper to get mouse position relative to canvas
    function getMousePos(canvas, evt) {
        const rect = canvas.getBoundingClientRect();
        // Scale mouse coordinates from CSS pixels to canvas pixels
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return {
            x: (evt.clientX - rect.left) * scaleX,
            y: (evt.clientY - rect.top) * scaleY
        };
    }

    // Touch events for mobile compatibility (for "Try on Wall" modal on Desktop)
    function getTouchPos(canvas, touch) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return {
            x: (touch.clientX - rect.left) * scaleX,
            y: (touch.clientY - rect.top) * scaleY
        };
    }

    function handleMouseDown(event) {
        // Only allow dragging if wall image is present and combined painting is loaded
        if (!wallImageBitmap || !combinedPaintingImageBitmap || paintingHeight === undefined) return;
        event.preventDefault(); // Prevent default browser drag behavior

        const clientX = event.clientX;
        const clientY = event.clientY;

        const mousePos = getMousePos(canvasElement, event);
        // Check if mouse clicked on the painting
        if (mousePos.x >= paintingX && mousePos.x <= paintingX + paintingWidth &&
            mousePos.y >= paintingY && mousePos.y <= paintingY + paintingHeight) {
            isDragging = true;
            startX = clientX; // Store client coordinates for mouse
            startY = clientY;
            offsetX = mousePos.x - paintingX;
            offsetY = mousePos.y - paintingY;
            canvasElement.style.cursor = 'grabbing';
        }
    }

    function handleMouseMove(event) {
        if (!isDragging) return;
        event.preventDefault(); // Prevent text selection etc.

        const clientX = event.clientX;
        const clientY = event.clientY;

        const deltaX = clientX - startX;
        const deltaY = clientY - startY;

        const rect = canvasElement.getBoundingClientRect();
        const scaleX = canvasElement.width / rect.width;
        const scaleY = canvasElement.height / rect.height;

        paintingX += deltaX * scaleX;
        paintingY += deltaY * scaleY;

        startX = clientX;
        startY = clientY;

        drawCanvas();
    }

    function handleMouseUp() {
        isDragging = false;
        if (canvasElement) { // Check if canvasElement exists before trying to set cursor
            canvasElement.style.cursor = 'grab';
        }
    }

    // Logic for resizing with mouse wheel (scaling)
    function handleMouseWheel(event) {
        if (!wallImageBitmap || !combinedPaintingImageBitmap || paintingHeight === undefined) return;
        event.preventDefault(); // Prevent page scrolling

        const scaleFactor = 1.1; // Scale coefficient
        const mousePos = getMousePos(canvasElement, event);

        // Check if cursor is over the painting
        if (mousePos.x >= paintingX && mousePos.x <= paintingX + paintingWidth &&
            mousePos.y >= paintingY && mousePos.y <= paintingY + paintingHeight) {

            // --- NEW LOGIC FOR MIN/MAX PAINTING SIZE RELATIVE TO CANVAS ---
            // Minimum width: e.g., 5% of canvas width, but no smaller than 20px
            const minPaintingWidthOnCanvas = Math.max(20, canvasElement.width * 0.05);
            // Maximum width: e.g., 150% of canvas width
            const maxPaintingWidthOnCanvas = canvasElement.width * 1.5;

            let newWidth, newHeight;
            if (event.deltaY < 0) { // Mouse wheel up (zoom in)
                newWidth = paintingWidth * scaleFactor;
            } else { // Mouse wheel down (zoom out)
                newWidth = paintingWidth / scaleFactor;
            }

            // Apply limits relative to the canvas size
            newWidth = Math.max(minPaintingWidthOnCanvas, Math.min(newWidth, maxPaintingWidthOnCanvas));

            // Maintain aspect ratio
            const currentAspectRatio = combinedPaintingImageBitmap.height / combinedPaintingImageBitmap.width;
            newHeight = newWidth * currentAspectRatio;

            // Center scaling relative to the cursor position
            paintingX = mousePos.x - (newWidth / paintingWidth) * (mousePos.x - paintingX);
            paintingY = mousePos.y - (newHeight / paintingHeight) * (mousePos.y - paintingY);

            paintingWidth = newWidth;
            paintingHeight = newHeight;
            drawCanvas();
        }
    }

    // Touch handlers for "Try on Wall" modal (desktop version on touch-enabled screens)
    let initialPinchDistance = null;
    let lastTouchX = null;
    let lastTouchY = null;

    function handleTouchStart(event) {
        if (!wallImageBitmap || !combinedPaintingImageBitmap || paintingHeight === undefined) return;
        event.preventDefault(); // Prevent scrolling/zooming

        if (event.touches.length === 1) {
            // One finger touch for dragging
            isDragging = true;
            const touchPos = getTouchPos(canvasElement, event.touches[0]);
            if (touchPos.x >= paintingX && touchPos.x <= paintingX + paintingWidth &&
                touchPos.y >= paintingY && touchPos.y <= paintingY + paintingHeight) {
                lastTouchX = event.touches[0].clientX;
                lastTouchY = event.touches[0].clientY;
                offsetX = touchPos.x - paintingX;
                offsetY = touchPos.y - paintingY;
            } else {
                isDragging = false; // Not touching the painting
            }
        } else if (event.touches.length === 2) {
            // Two fingers for pinching (scaling)
            isDragging = false; // Disable dragging
            initialPinchDistance = getDistanceBetweenTouches(event.touches[0], event.touches[1]);
        }
    }

    function handleTouchMove(event) {
        if (!wallImageBitmap || !combinedPaintingImageBitmap || paintingHeight === undefined) return;
        event.preventDefault();

        if (event.touches.length === 1 && isDragging) {
            // One finger dragging
            const currentTouchX = event.touches[0].clientX;
            const currentTouchY = event.touches[0].clientY;

            const deltaX = currentTouchX - lastTouchX;
            const deltaY = currentTouchY - lastTouchY;

            const rect = canvasElement.getBoundingClientRect();
            const scaleX = canvasElement.width / rect.width;
            const scaleY = canvasElement.height / rect.height;

            paintingX += deltaX * scaleX;
            paintingY += deltaY * scaleY;

            lastTouchX = currentTouchX;
            lastTouchY = currentTouchY;

            drawCanvas();
        } else if (event.touches.length === 2 && initialPinchDistance !== null) {
            // Two fingers pinching
            const currentPinchDistance = getDistanceBetweenTouches(event.touches[0], event.touches[1]);
            if (currentPinchDistance === 0) return; // Avoid division by zero

            const scaleFactor = currentPinchDistance / initialPinchDistance;

            // --- Apply limits similar to mouse wheel ---
            const minPaintingWidthOnCanvas = Math.max(20, canvasElement.width * 0.05);
            const maxPaintingWidthOnCanvas = canvasElement.width * 1.5;

            let newWidth = paintingWidth * scaleFactor;
            newWidth = Math.max(minPaintingWidthOnCanvas, Math.min(newWidth, maxPaintingWidthOnCanvas));

            const currentAspectRatio = combinedPaintingImageBitmap.height / combinedPaintingImageBitmap.width;
            let newHeight = newWidth * currentAspectRatio;

            // Center scaling around the midpoint of the two touches
            const touch1Pos = getTouchPos(canvasElement, event.touches[0]);
            const touch2Pos = getTouchPos(canvasElement, event.touches[1]);
            const midpointX = (touch1Pos.x + touch2Pos.x) / 2;
            const midpointY = (touch1Pos.y + touch2Pos.y) / 2;

            paintingX = midpointX - (newWidth / paintingWidth) * (midpointX - paintingX);
            paintingY = midpointY - (newHeight / paintingHeight) * (midpointY - paintingY);

            paintingWidth = newWidth;
            paintingHeight = newHeight;

            initialPinchDistance = currentPinchDistance; // Update initial distance for continuous scaling
            drawCanvas();
        }
    }

    function handleTouchEnd() {
        isDragging = false;
        initialPinchDistance = null;
        lastTouchX = null;
        lastTouchY = null;
    }

    function getDistanceBetweenTouches(touch1, touch2) {
        const dx = touch1.clientX - touch2.clientX;
        const dy = touch1.clientY - touch2.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    // Save the image (temporarily disabled for CORS reasons, re-enable when ready)
    function savePreviewImage() {
        alert("Saving is temporarily disabled for testing. Please check console for errors.");
        // Re-enable this block once you confirm preview works and CORS is handled for all images.
        /*
        if (!canvasElement || !wallImageBitmap) {
            alert('Please upload a wall photo first and place the painting!');
            return;
        }
        if (!combinedPaintingImageBitmap || paintingHeight === undefined) {
            alert('Painting with frame not fully loaded. Please wait and try again!');
            return;
        }

        try {
            // Using a timeout to ensure canvas is rendered
            setTimeout(() => {
                const dataURL = canvasElement.toDataURL('image/png');
                const link = document.createElement('a');
                const sanitizedTitle = data.painting.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
                link.download = `preview_${sanitizedTitle}_framed.png`;
                link.href = dataURL;

                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }, 50);
        } catch (e) {
            console.error("Error saving image:", e);
            alert("Could not save image. This is likely a CORS issue. Please check console for details.");
        }
        */
    }
</script>

<style>
    /* Your existing styles, make sure to include the new ones I added for the modal and canvas */
    .painting-detail {
        display: flex;
        gap: 2rem;
        max-width: 1000px;
        margin: 2rem auto;
        background: #fff;
        padding: 2rem;
        border-radius: 10px;
        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
    }

    .painting-image {
        flex: 1;
        min-width: 300px;
    }

    .painting-image img {
        max-width: 100%;
        height: auto;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .painting-info {
        flex: 1;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
    }

    .painting-info h1 {
        font-size: 2.5rem;
        color: #333;
        margin-bottom: 1rem;
    }

    .painting-info p {
        font-size: 1.1rem;
        color: #666;
        margin-bottom: 0.5rem;
        line-height: 1.6;
    }

    .painting-info .price {
        font-size: 2rem;
        color: #007bff;
        font-weight: bold;
        margin-top: 1.5rem;
        margin-bottom: 1.5rem;
    }

    .actions {
        display: flex;
        gap: 1rem;
        margin-top: 1.5rem;
        flex-wrap: wrap; /* For buttons on small screens */
    }

    .add-to-cart-btn, .try-on-btn, .download-btn {
        padding: 1rem 2rem;
        border: none;
        border-radius: 8px;
        font-size: 1.2rem;
        font-weight: bold;
        cursor: pointer;
        transition: background-color 0.3s ease, transform 0.2s ease;
    }

    .add-to-cart-btn {
        background-color: #28a745;
        color: white;
    }
    .add-to-cart-btn:hover {
        background-color: #218838;
        transform: translateY(-2px);
    }

    .try-on-btn {
        background-color: #007bff;
        color: white;
    }
    .try-on-btn:hover {
        background-color: #0056b3;
        transform: translateY(-2px);
    }

    .download-btn {
        background-color: #6c757d; /* Grey color for save button */
        color: white;
    }
    .download-btn:hover {
        background-color: #5a6268;
        transform: translateY(-2px);
    }

    /* Modal overlays */
    .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.6);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
        padding: 1rem; /* Padding for small screens */
        box-sizing: border-box; /* Include padding in element's total width and height */
    }

    .modal-content {
        background: white;
        padding: 2rem;
        border-radius: 10px;
        text-align: center;
        box-shadow: 0 5px 20px rgba(0, 0, 0, 0.2);
        max-width: 90%; /* Max width for general modal */
        max-height: 90%; /* Max height for general modal */
        overflow-y: auto; /* Scroll if content overflows */
        min-width: 300px;
        display: flex;
        flex-direction: column;
        align-items: center;
    }

    .modal-content h3 {
        margin-bottom: 1rem;
        color: #333;
    }

    .modal-content .success-text {
        color: #28a745;
    }

    .modal-content .error-text {
        color: #dc3545;
    }

    .modal-content button { /* Buttons inside the modal */
        margin-top: 1.5rem;
        padding: 0.8rem 1.5rem;
        background-color: #007bff;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        transition: background-color 0.3s ease;
    }

    .modal-content button:hover {
        background-color: #0056b3;
    }

    /* Styles for the "Try on wall" modal */
    .try-on-modal-content {
        max-width: 1200px; /* Wider for the canvas */
        width: 100%;
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
    }

    .try-on-modal-content input[type="file"] {
        margin-bottom: 1rem;
    }

    .try-on-canvas-container {
        width: 100%;
        /* Max height to keep the canvas from being too tall */
        max-height: 600px;
        overflow: auto; /* Scroll if wall image is very large */
        border: 1px solid #ddd;
        border-radius: 8px;
        box-shadow: inset 0 0 5px rgba(0,0,0,0.05);
        display: flex; /* For centering canvas inside */
        justify-content: center;
        align-items: center;
        background-color: #e9e9e9;
        cursor: grab; /* Cursor for dragging */
        /* Set a min-height so it's visible before image loads */
        min-height: 300px;
    }

    canvas {
        display: block; /* Remove extra spacing */
        background-color: white; /* Canvas background */
        max-width: 100%; /* Ensure canvas fits in container */
        height: auto; /* Maintain aspect ratio */
    }

    /* Responsive styles */
    @media (max-width: 768px) {
        .painting-detail {
            flex-direction: column;
            margin: 1rem;
            padding: 1rem;
        }
        .actions {
            flex-direction: column;
            gap: 0.8rem;
        }
        .add-to-cart-btn, .download-btn, .try-on-btn {
            width: 100%;
        }
        .modal-content {
            padding: 1rem;
        }
        .try-on-modal-content {
            padding: 1rem;
        }
    }

    /* Existing gallery styles */
    .detail-images-gallery {
        margin-top: 2rem;
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 1rem;
    }

    .detail-images-gallery img {
        width: 100%;
        height: auto;
        border-radius: 8px;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
        object-fit: cover;
    }
</style>

<div class="painting-detail">
    <div class="painting-image">
        <img src={data.painting.previewImage} alt={data.painting.title} />
    </div>
    <div class="painting-info">
        <div>
            <h1>{data.painting.title}</h1>
            <p>{data.painting.description}</p>
            <p>Dimensions: {data.painting.dimensions}</p>
            <p class="price">{data.painting.price} $</p>
        </div>

        {#if data.painting.detailImages && data.painting.detailImages.length > 0}
            <div class="detail-images-gallery">
                {#each data.painting.detailImages as imageUrl}
                    <img src={imageUrl} alt={`Detail image of ${data.painting.title}`} />
                {/each}
            </div>
        {/if}
        <div class="actions">
            <button on:click={addToCart} class="add-to-cart-btn">Add to Cart</button>
            <button on:click={openTryOnModal} class="try-on-btn">Try on Wall</button>
        </div>
    </div>
</div>

{#if showModal}
    <div class="modal-overlay" on:click={() => (showModal = false)}>
        <div class="modal-content" on:click|stopPropagation>
            {#if successMessage}
                <h3 class="success-text">Success!</h3>
                <p>{successMessage}</p>
            {:else if errorMessage}
                <h3 class="error-text">Error!</h3>
                <p>{errorMessage}</p>
            {/if}
            <button on:click={() => (showModal = false)}>Close</button>
        </div>
    </div>
{/if}

{#if showTryOnModal}
    <div class="modal-overlay" on:click={closeTryOnModal}>
        <div class="modal-content try-on-modal-content" on:click|stopPropagation>
            <h3>Try Painting on Your Wall</h3>
            <p>Upload your wall photo, then drag and resize the framed painting.</p>
            <input type="file" accept="image/*" on:change={handleWallImageUpload} />

            <div class="try-on-canvas-container">
                <canvas
                    bind:this={canvasElement}
                    on:mousedown={handleMouseDown}
                    on:mousemove={handleMouseMove}
                    on:mouseup={handleMouseUp}
                    on:wheel={handleMouseWheel}
                    on:touchstart={handleTouchStart}
                    on:touchmove={handleTouchMove}
                    on:touchend={handleTouchEnd}
                ></canvas>
            </div>
            <div class="try-on-buttons">
                <button class="download-btn" on:click={savePreviewImage}>Save Preview</button>
                <button class="close-modal-btn" on:click={closeTryOnModal}>Close</button>
            </div>
        </div>
    </div>
{/if}