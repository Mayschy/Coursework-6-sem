<script>
    import { invalidateAll } from '$app/navigation';

    export let data;

    let showModal = false; // For "Add to cart" modal
    let successMessage = '';
    let errorMessage = '';

    // New variables for the "Try on wall" modal
    let showTryOnModal = false;
    let canvasElement; // Reference to the HTML canvas element
    let ctx; // 2D drawing context for canvas

    // Use ImageBitmap for wallImage for security
    let wallImageBitmap = null; // Will store ImageBitmap for the uploaded wall

    // NEW: Image object for the frame
    let frameImage = new Image();
    // !!! IMPORTANT: Update this path to your frame image !!!
    // If your frame is local (e.g., in static/frames/), use '/frames/11429042.jpg'
    // If your frame is also on Cloudinary, use the proxy like the paintingImage
    frameImage.src = '/frames/11429042.jpg'; // Assuming frame is local for now
    // frameImage.crossOrigin = "anonymous"; // No need for local files
    frameImage.onload = () => {
        console.log("Frame image loaded.");
        // If painting is already loaded, combine them
        if (paintingImage.complete) {
            combinePaintingAndFrame();
        }
    };
    frameImage.onerror = (e) => {
        console.error("Failed to load frame image. Check path:", frameImage.src, e);
        alert("Error loading frame image. Please check console for details.");
    };


    // NEW: Combined painting (painting inside the frame)
    let combinedPaintingImageBitmap = null; // Store ImageBitmap of combined image

    // Original painting image (used to generate the combined image)
    let paintingImage = new Image();
    // No need for crossOrigin here, as it will go through our proxy
    // paintingImage.crossOrigin = "anonymous"; // No longer needed directly on this Image object
    // Load the original painting image when the component mounts or data changes
    $: {
        if (data.painting && data.painting.previewImage) {
            // Transform Cloudinary URL to our proxy URL
            // Example: "https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v12345/my_image.jpg"
            // becomes "/api/proxy-image/v12345/my_image.jpg"

            // Get the path part of the Cloudinary URL.
            // This is a simplified example. You might need a more robust parsing
            // depending on the exact structure of your Cloudinary URLs.
            const cloudinaryBasePrefix = 'https://res.cloudinary.com/dvfjsg1c6/image/upload/'; // !!! Match your cloud name !!!
            let cloudinaryPath = data.painting.previewImage.replace(cloudinaryBasePrefix, '');
            // Handle cases where previewImage might include transformations like /f_auto,q_auto/
            // You might need to adjust this depending on your exact Cloudinary URL structure.
            // For example, if your original path is always after '/upload/',
            // you might split by '/upload/' and take the second part.
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
                alert("Error loading product image. Please check console and server logs.");
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
        showTryOnModal = true;
        // Reset state when opening the modal
        wallImageBitmap = null; // Clear previous wall image bitmap
        // Reset painting position and size for the *combined* image
        if (combinedPaintingImageBitmap) { // Use combinedPaintingImageBitmap here
            paintingWidth = 300; // Reset to an initial size
            paintingHeight = paintingWidth * (combinedPaintingImageBitmap.height / combinedPaintingImageBitmap.width);
            paintingX = 50;
            paintingY = 50;
        } else {
            paintingWidth = 300; // Fallback default
            paintingHeight = 300;
            paintingX = 50;
            paintingY = 50;
        }


        // Initial draw when modal opens (will be empty or show placeholder)
        // Ensure canvas and ctx are ready before drawing
        requestAnimationFrame(() => { // Use rAF to ensure canvasElement is bound
            if (canvasElement) {
                ctx = canvasElement.getContext('2d');
                drawCanvas();
            }
        });
    }

    function closeTryOnModal() {
        showTryOnModal = false;
        isDragging = false; // Ensure dragging state is reset
    }

    // NEW: Function to combine the painting with the frame
    async function combinePaintingAndFrame() {
        if (!paintingImage.complete || !frameImage.complete) {
            console.log("Waiting for painting or frame to load before combining.");
            return; // Wait for both to be loaded
        }
        if (paintingImage.naturalWidth === 0 || frameImage.naturalWidth === 0) {
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
        // These values are based on the analysis of your 11429042.jpg frame (3328x4864)
        // Adjust these if your frame or its inner transparent area changes significantly
        const innerFrameX = 200;
        const innerFrameY = 200;
        const innerFrameWidth = frameCanvas.width - (innerFrameX * 2); // 3328 - 200 - 200 = 2928
        const innerFrameHeight = frameCanvas.height - (innerFrameY * 2); // 4864 - 200 - 200 = 4464


        // Calculate aspect ratios
        const paintingAspectRatio = paintingImage.naturalWidth / paintingImage.naturalHeight;
        const innerFrameAspectRatio = innerFrameWidth / innerFrameHeight;

        let drawWidth, drawHeight, drawX, drawY;

        // Scale painting to fit *within* the inner frame area while maintaining aspect ratio
        if (paintingAspectRatio > innerFrameAspectRatio) {
            // Painting is wider than the frame's inner area (relative to height)
            drawWidth = innerFrameWidth;
            drawHeight = innerFrameWidth / paintingAspectRatio;
        } else {
            // Painting is taller than the frame's inner area (relative to width)
            drawHeight = innerFrameHeight;
            drawWidth = innerFrameHeight * paintingAspectRatio;
        }

        // Center the painting within the inner frame area
        drawX = innerFrameX + (innerFrameWidth - drawWidth) / 2;
        drawY = innerFrameY + (innerFrameHeight - drawHeight) / 2;

        // Draw the painting over the frame
        frameCtx.drawImage(paintingImage, drawX, drawY, drawWidth, drawHeight);

        // Convert the combined image on the temporary canvas to an ImageBitmap
        try {
            combinedPaintingImageBitmap = await createImageBitmap(frameCanvas);
            console.log("Combined painting and frame successfully into ImageBitmap.");
            // Recalculate initial paintingHeight based on combined image bitmap
            paintingHeight = paintingWidth * (combinedPaintingImageBitmap.height / combinedPaintingImageBitmap.width);
            drawCanvas(); // Redraw main canvas if modal is open
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

                if (canvasW > maxCanvasWidth) {
                    canvasH = (maxCanvasWidth / canvasW) * canvasH;
                    canvasW = maxCanvasWidth;
                }
                if (canvasH > maxCanvasHeight) {
                    canvasW = (maxCanvasHeight / canvasH) * canvasW;
                    canvasH = maxCanvasHeight;
                }

                canvasElement.width = canvasW;
                canvasElement.height = canvasH;

                // Reset painting position relative to the new canvas size
                if (combinedPaintingImageBitmap) { // Only if combined image is ready
                    paintingX = (canvasW / 2) - (paintingWidth / 2);
                    paintingY = (canvasH / 2) - (paintingHeight / 2);
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
            // This should not happen often if openTryOnModal uses rAF correctly
            console.warn("Canvas context not initialized. Re-initializing.");
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

    function handleMouseDown(event) {
        // Only allow dragging if wall image is present and combined painting is loaded
        if (!wallImageBitmap || !combinedPaintingImageBitmap || paintingHeight === undefined) return;
        event.preventDefault(); // Prevent default browser drag behavior

        const mousePos = getMousePos(canvasElement, event);
        // Check if mouse clicked on the painting
        if (mousePos.x >= paintingX && mousePos.x <= paintingX + paintingWidth &&
            mousePos.y >= paintingY && mousePos.y <= paintingY + paintingHeight) {
            isDragging = true;
            startX = mousePos.x;
            startY = mousePos.y;
            offsetX = mousePos.x - paintingX;
            offsetY = mousePos.y - paintingY;
            canvasElement.style.cursor = 'grabbing';
        }
    }

    function handleMouseMove(event) {
        if (!isDragging) return;
        event.preventDefault(); // Prevent text selection etc.
        const mousePos = getMousePos(canvasElement, event);
        paintingX = mousePos.x - offsetX;
        paintingY = mousePos.y - offsetY;
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

            let newWidth, newHeight;
            if (event.deltaY < 0) { // Mouse wheel up (zoom in)
                newWidth = paintingWidth * scaleFactor;
            } else { // Mouse wheel down (zoom out)
                newWidth = paintingWidth / scaleFactor;
            }

            // Limit min/max size based on canvas size and combined painting's natural size
            newWidth = Math.max(combinedPaintingImageBitmap.width * 0.1, Math.min(newWidth, canvasElement.width * 1.5)); // Allow larger than canvas for detailed view if needed

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

    // Save the image (temporarily disabled)
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
                    on:mouseleave={handleMouseUp}
                    on:wheel={handleMouseWheel}
                ></canvas>
            </div>

            <div class="actions" style="margin-top: 0; justify-content: center;">
                <button on:click={savePreviewImage} class="download-btn">Save Result</button>
                <button on:click={closeTryOnModal}>Close</button>
            </div>
        </div>
    </div>
{/if}