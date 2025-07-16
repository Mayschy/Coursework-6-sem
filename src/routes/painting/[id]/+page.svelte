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
    // If your frame is local (e.g., in static/frames/), use '/frames/11429042.png'
    // If your frame is also on Cloudinary, use the proxy like the paintingImage
    frameImage.src = '/frames/11429042.png'; // Assuming frame is local for now
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

function openTryOnModal() {
        showTryOnModal = true;
        wallImageBitmap = null; // Clear previous wall image bitmap

        // Ensure canvas and ctx are ready before drawing
        requestAnimationFrame(() => { // Use rAF to ensure canvasElement is bound
            if (canvasElement) {
                ctx = canvasElement.getContext('2d');

                // --- NEW LOGIC FOR INITIAL PAINTING SIZE ---
                // Set initial canvas dimensions
                const initialCanvasWidth = 800; // A reasonable default width for the modal's canvas
                const initialCanvasHeight = 500; // A reasonable default height

                canvasElement.width = initialCanvasWidth;
                canvasElement.height = initialCanvasHeight;


                if (combinedPaintingImageBitmap) {
                    // Calculate a target width for the combined image (e.g., 30-40% of canvas width)
                    let targetPaintingWidth = initialCanvasWidth * 0.35; // Start at 35% of canvas width

                    // Ensure the initial size is not larger than its natural size (if it's a very small image)
                    // and also not too large compared to its natural size to avoid huge initial zoom.
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
                    // Fallback default if combinedPaintingImageBitmap is not ready
                    paintingWidth = 200;
                    paintingHeight = 200;
                    paintingX = (initialCanvasWidth / 2) - (paintingWidth / 2);
                    paintingY = (initialCanvasHeight / 2) - (paintingHeight / 2);
                }

                drawCanvas();
            }
        });
    }

    // ... (handleWallImageUpload - unchanged, as it sets canvas width/height based on wall image)


    // Logic for resizing with mouse wheel (scaling)
    function handleMouseWheel(event) {
        if (!wallImageBitmap || !combinedPaintingImageBitmap || paintingHeight === undefined) return;
        event.preventDefault(); // Prevent page scrolling

        const scaleFactor = 1.1; // Scale coefficient
        const mousePos = getMousePos(canvasElement, event);

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