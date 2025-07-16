<script>
    import { onMount, onDestroy } from 'svelte';
    import { page } from '$app/stores';
    import * as THREE from 'three';
    import { browser } from '$app/environment'; // Import browser flag for conditional execution

    export let data; // Data from your +page.server.js or +layout.server.js

    let arCanvas; // Reference to the canvas DOM element
    let renderer, scene, camera;
    let xrSession = null;
    let hitTestSource = null;
    let paintingMesh = null; // Our 3D model of the painting in AR
    let reticle = null; // Visual indicator for hit-test results

    let isLoading = true; // State to show loading spinner
    let arSupportMessage = "Checking AR support...";
    let currentStatus = "Loading painting...";

    // Original painting image and frame image
    // Initialize these within onMount, or ensure their usage is within onMount
    let paintingImage;
    let frameImage;
    let combinedPaintingImageBitmap = null;

    // --- Start: Image Loading and Combining Logic ---

    // This block will now be entirely within onMount
    async function setupImageLoadingAndCombining() {
        console.log("AR: Setting up image loading and combining...");
        currentStatus = "Loading painting images...";

        paintingImage = new Image();
        frameImage = new Image();

        // Load frame image first
        // !!! IMPORTANT: Update this path to your frame image !!!
        // Assuming frame is local in static/frames/
        frameImage.src = '/frames/11429042.png'; // Ensure this path is correct
        frameImage.onload = () => {
            console.log("AR: Frame image loaded.");
            if (paintingImage.complete && paintingImage.src) { // Check paintingImage.src to ensure it was set
                combinePaintingAndFrame();
            }
        };
        frameImage.onerror = (e) => {
            console.error("AR: Failed to load frame image. Check path:", frameImage.src, e);
            arSupportMessage = "Error loading frame image. Check console.";
            isLoading = false;
        };

        // Load painting image via proxy
        if (data.painting && data.painting.previewImage) {
            const cloudinaryBasePrefix = 'https://res.cloudinary.com/dvfjsg1c6/image/upload/'; // !!! Match your cloud name !!!
            let cloudinaryPath = data.painting.previewImage.replace(cloudinaryBasePrefix, '');
            if (data.painting.previewImage.includes('/upload/')) {
                cloudinaryPath = data.painting.previewImage.split('/upload/')[1];
            }
            paintingImage.src = `/api/proxy-image/${cloudinaryPath}`;
            console.log("AR: Proxying painting image from:", paintingImage.src);

            paintingImage.onload = () => {
                console.log("AR: Product painting image loaded (via proxy).");
                if (frameImage.complete && frameImage.src) { // Check frameImage.src
                    combinePaintingAndFrame();
                }
            };
            paintingImage.onerror = (e) => {
                console.error("AR: Failed to load product painting image (via proxy). Check server logs:", paintingImage.src, e);
                arSupportMessage = "Error loading product image. Check console and server logs.";
                isLoading = false;
            };
        } else {
            console.warn("AR: No painting data or previewImage available.");
            arSupportMessage = "No painting image to display. Go back and select a painting.";
            isLoading = false;
        }
    }

    // Function to combine the painting with the frame (similar to +page.svelte)
    async function combinePaintingAndFrame() {
        if (!paintingImage.complete || !frameImage.complete) {
            console.log("AR: Waiting for painting or frame to load before combining.");
            return;
        }
        if (paintingImage.naturalWidth === 0 || paintingImage.naturalHeight === 0 ||
            frameImage.naturalWidth === 0 || frameImage.naturalHeight === 0) {
            console.warn("AR: Painting or frame image failed to load with dimensions. Cannot combine.");
            arSupportMessage = "Image dimensions invalid. Cannot combine.";
            isLoading = false;
            return;
        }

        // These DOM operations must be in a browser environment
        const frameCanvas = document.createElement('canvas');
        const frameCtx = frameCanvas.getContext('2d');

        frameCanvas.width = frameImage.naturalWidth;
        frameCanvas.height = frameImage.naturalHeight;

        frameCtx.drawImage(frameImage, 0, 0, frameCanvas.width, frameCanvas.height);

        const innerFrameX = 200; // These values might need tuning based on your frame image
        const innerFrameY = 200;
        const innerFrameWidth = frameImage.naturalWidth - (innerFrameX * 2);
        const innerFrameHeight = frameImage.naturalHeight - (innerFrameY * 2);

        const paintingAspectRatio = paintingImage.naturalWidth / paintingImage.naturalHeight;
        const innerFrameAspectRatio = innerFrameWidth / innerFrameHeight;

        let targetWidth, targetHeight;
        if (paintingAspectRatio > innerFrameAspectRatio) {
            targetWidth = innerFrameWidth;
            targetHeight = targetWidth / paintingAspectRatio;
        } else {
            targetHeight = innerFrameHeight;
            targetWidth = targetHeight * paintingAspectRatio;
        }

        let drawWidth = targetWidth;
        let drawHeight = targetHeight;

        // This block tries to prevent upscaling small images too much, but ensure they fit
        if (paintingImage.naturalWidth < targetWidth || paintingImage.naturalHeight < targetHeight) {
            // If painting is smaller than target, fit it within target while maintaining aspect ratio
            const scaleFactor = Math.min(targetWidth / paintingImage.naturalWidth, targetHeight / paintingImage.naturalHeight);
            drawWidth = paintingImage.naturalWidth * scaleFactor;
            drawHeight = paintingImage.naturalHeight * scaleFactor;
        }


        const drawX = innerFrameX + (innerFrameWidth - drawWidth) / 2;
        const drawY = innerFrameY + (innerFrameHeight - drawHeight) / 2;

        frameCtx.drawImage(paintingImage, drawX, drawY, drawWidth, drawHeight);

        try {
            combinedPaintingImageBitmap = await createImageBitmap(frameCanvas);
            console.log("AR: Combined painting and frame successfully into ImageBitmap.");
            isLoading = false; // Finished loading and combining
            checkArSupport(); // Now check AR support
        } catch (e) {
            console.error("AR: Error creating ImageBitmap from combined canvas:", e);
            arSupportMessage = "Error combining painting. Check console.";
            isLoading = false;
        } finally {
             // Clear canvas dimensions to free memory, as ImageBitmap is created
             frameCanvas.width = 0;
             frameCanvas.height = 0;
        }
    }

    // --- End: Image Loading and Combining Logic ---


    // --- Start: WebXR and Three.js Setup ---

    onMount(async () => {
        // Ensure this code only runs in the browser
        if (!browser) {
            console.warn("AR: Not running on client, skipping AR setup.");
            arSupportMessage = "AR mode only available on devices with WebXR support.";
            isLoading = false;
            return;
        }

        // Basic Three.js setup (renderer, scene, camera)
        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(); // WebXR will handle camera updates

        renderer = new THREE.WebGLRenderer({
            alpha: true,
            preserveDrawingBuffer: true,
            canvas: arCanvas, // arCanvas is bound to the actual DOM element
            antialias: true // For smoother edges
        });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.xr.enabled = true; // Enable WebXR module for the renderer

        // Add ambient light for better visibility
        scene.add(new THREE.AmbientLight(0xFFFFFF, 1.0)); // Soft white light

        // Create a reticle (the little circle that indicates where hit-test is happening)
        const geometry = new THREE.RingGeometry(0.08, 0.1, 32).rotateX(-Math.PI / 2);
        const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
        reticle = new THREE.Mesh(geometry, material);
        reticle.matrixAutoUpdate = false; // We'll update its matrix manually
        reticle.visible = false; // Hide until a hit-test is successful
        scene.add(reticle);

        // Initiate image loading and combining now that we are in the browser
        setupImageLoadingAndCombining();
    });

    async function checkArSupport() {
        if (!combinedPaintingImageBitmap) {
            arSupportMessage = "Still loading painting. Please wait.";
            return;
        }

        if (navigator.xr) {
            try {
                const supported = await navigator.xr.isSessionSupported('immersive-ar');
                if (supported) {
                    arSupportMessage = "AR supported! Click 'Start AR' to begin.";
                } else {
                    arSupportMessage = "Immersive AR is not supported on this device/browser.";
                }
            } catch (error) {
                console.error("Error checking WebXR support:", error);
                arSupportMessage = "Error checking AR support. See console.";
            }
        } else {
            arSupportMessage = "WebXR not found. Please use a WebXR-compatible browser (e.g., Chrome on Android, Safari on iOS 17+).";
        }
    }

    async function startArSession() {
        if (!combinedPaintingImageBitmap) {
            alert("Painting is still loading or failed to combine. Please wait or refresh.");
            return;
        }

        if (xrSession) { // If session is already active, end it first
            xrSession.end();
            return;
        }

        try {
            currentStatus = "Requesting AR session...";
            xrSession = await navigator.xr.requestSession('immersive-ar', {
                requiredFeatures: ['hit-test', 'dom-overlay'], // dom-overlay needed for UI buttons over AR
                optionalFeatures: ['light-estimation'], // For better realism
                 domOverlay: { root: document.querySelector('.ar-ui-overlay') } // IMPORTANT: Link your UI overlay
            });

            renderer.xr.setSession(xrSession);
            xrSession.addEventListener('end', onSessionEnd);

            currentStatus = "Detecting surfaces...";

            // Request a reference space for tracking
            const referenceSpace = await xrSession.requestReferenceSpace('local-floor'); // Or 'viewer' for simpler setup
            // Corrected: hitTestSource needs to be created on the session, not global 'session' variable
            hitTestSource = await xrSession.requestHitTestSource({ space: referenceSpace });


            // Start the AR frame loop
            renderer.setAnimationLoop(onXRFrame);

            // Add touch listener for placing object
            // Ensure arCanvas is available before adding listener
            if (arCanvas) {
                arCanvas.addEventListener('touchstart', onTouchStart);
            }


        } catch (error) {
            console.error("Error starting WebXR session:", error);
            alert(`Could not start AR session: ${error.message}. Make sure your device supports AR and try again.`);
            currentStatus = `AR Session failed: ${error.message}`;
            isLoading = false;
        }
    }

    function onXRFrame(time, frame) {
        if (!renderer || !scene || !camera || !hitTestSource || !reticle) {
            // If something is not initialized, stop processing frames
            console.warn("AR: Essential WebXR components not ready in onXRFrame.");
            return;
        }

        const referenceSpace = renderer.xr.getReferenceSpace();
        const session = frame.session;

        // Get viewer pose (camera position/orientation)
        const viewerPose = frame.getViewerPose(referenceSpace);

        if (viewerPose) {
            // Update Three.js camera from XR camera pose
            camera.matrix.fromArray(viewerPose.transform.matrix);
            camera.updateMatrixWorld(true); // Ensure matrix is updated

            // Perform hit test for placing the object
            const hitTestResults = frame.getHitTestResults(hitTestSource);

            if (hitTestResults.length > 0) {
                const hitPose = hitTestResults[0].getPose(referenceSpace);
                if (hitPose) {
                    reticle.matrix.fromArray(hitPose.transform.matrix);
                    reticle.visible = true;
                    currentStatus = "Tap to place painting.";
                }
            } else {
                reticle.visible = false;
                currentStatus = "Move around to find a surface.";
            }
        }

        // Render the scene
        renderer.render(scene, camera);
    }

    async function onTouchStart(event) {
        if (!xrSession || !hitTestSource || paintingMesh) return; // Only allow placing once

        // Get the touch event from the DOM overlay
        // Note: When using dom-overlay, touch events might be on the document or canvas
        // For simplicity, we assume the first touch is for placement
        // In a real app, you'd want to use `xrSession.inputSources` and `frame.getPose`
        // to get the exact touch position in XR space.
        // For hit-testing, we'll use the reticle's current position if visible.

        if (reticle && reticle.visible) {
            // Use the reticle's last known hit pose for placement
            // This assumes the reticle correctly tracks a surface
            const hitPose = new THREE.Pose(reticle.position, reticle.quaternion);

            if (combinedPaintingImageBitmap) {
                // Remove reticle once painting is placed
                scene.remove(reticle);
                // reticle.geometry.dispose(); // Geometries/materials should be disposed in onDestroy or onSessionEnd
                // reticle.material.dispose();
                reticle = null;


                // Create and place the painting mesh
                const texture = new THREE.CanvasTexture(combinedPaintingImageBitmap);
                texture.colorSpace = THREE.SRGBColorSpace; // Most images are sRGB
                texture.needsUpdate = true; // Ensure texture updates

                const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide });

                // Scale for AR: Decide how large 1 pixel of your combined image should be in meters
                // You might get painting dimensions from data.painting.dimensions and convert
                // Example: If data.painting.dimensions is "120x80 cm"
                let realWorldPaintingWidthMeters = 0.8; // Default to 80cm wide
                let realWorldPaintingHeightMeters = 1.2; // Default to 120cm tall

                if (data.painting && data.painting.dimensions) {
                    // Assuming dimensions are like "W x H cm"
                    const dimMatch = data.painting.dimensions.match(/(\d+)x(\d+)\s*cm/i);
                    if (dimMatch) {
                        realWorldPaintingWidthMeters = parseFloat(dimMatch[1]) / 100; // Convert cm to meters
                        realWorldPaintingHeightMeters = parseFloat(dimMatch[2]) / 100;
                        console.log(`AR: Using painting dimensions: ${realWorldPaintingWidthMeters}m x ${realWorldPaintingHeightMeters}m`);
                    }
                } else {
                    console.warn("AR: Painting dimensions not found in data. Using default size.");
                    // Fallback to aspect ratio from combined image if no dimensions data
                    const aspectRatio = combinedPaintingImageBitmap.width / combinedPaintingImageBitmap.height;
                    realWorldPaintingHeightMeters = 1.0; // Assume 1 meter height if no data
                    realWorldPaintingWidthMeters = realWorldPaintingHeightMeters * aspectRatio;
                }

                const geometry = new THREE.PlaneGeometry(realWorldPaintingWidthMeters, realWorldPaintingHeightMeters);
                paintingMesh = new THREE.Mesh(geometry, material);

                // Position the mesh using the hit-test result
                paintingMesh.position.set(hitPose.position.x, hitPose.position.y, hitPose.position.z);
                // Orient the painting to align with the detected surface normal
                paintingMesh.quaternion.set(hitPose.orientation.x, hitPose.orientation.y, hitPose.orientation.z, hitPose.orientation.w);

                // Adjust rotation slightly if it's not perfectly flush with the wall
                // paintingMesh.rotateX(Math.PI / 2); // If your plane is created standing up

                // Small offset to prevent z-fighting with the real wall
                const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(hitPose.orientation);
                paintingMesh.position.add(normal.multiplyScalar(0.005)); // Move 0.5 cm off the wall

                scene.add(paintingMesh);
                currentStatus = "Painting placed! Move around to view.";
                console.log("AR: Painting placed in AR.");

                // Remove the touch listener once placed (or adjust for moving/scaling)
                // If you want to allow re-placing or moving, modify this.
                arCanvas.removeEventListener('touchstart', onTouchStart);

                // TODO: Add logic for moving/scaling the painting after it's placed.
                // This would involve more advanced touch listeners and raycasting in Three.js.
            }
        }
    }

    function onSessionEnd(event) {
        console.log("AR: WebXR session ended.");
        xrSession = null;
        if (hitTestSource) {
            hitTestSource.cancel();
            hitTestSource = null;
        }
        renderer.setAnimationLoop(null); // Stop the animation loop

        // Clean up 3D objects
        if (paintingMesh) {
            scene.remove(paintingMesh);
            paintingMesh.geometry.dispose();
            paintingMesh.material.dispose();
            paintingMesh = null;
        }
        if (reticle) { // Re-add reticle if session ends for next potential session
            // Dispose existing reticle if it exists before recreating
            if (reticle.geometry) reticle.geometry.dispose();
            if (reticle.material) reticle.material.dispose();

            // Recreate reticle to ensure it's in a clean state for next session
            const geometry = new THREE.RingGeometry(0.08, 0.1, 32).rotateX(-Math.PI / 2);
            const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
            reticle = new THREE.Mesh(geometry, material);
            reticle.matrixAutoUpdate = false;
            reticle.visible = false;
            scene.add(reticle);
        }

        if (arCanvas) { // Check if canvas exists before removing listener
            arCanvas.removeEventListener('touchstart', onTouchStart);
        }
        currentStatus = "AR Session ended.";
        checkArSupport(); // Re-check support for next time
    }

    onDestroy(() => {
        if (xrSession) {
            xrSession.end();
        }
        if (renderer) {
            renderer.dispose();
        }
        // Dispose geometries and materials only if they exist
        if (paintingMesh) {
            if (paintingMesh.geometry) paintingMesh.geometry.dispose();
            if (paintingMesh.material) paintingMesh.material.dispose();
        }
        if (reticle) {
            if (reticle.geometry) reticle.geometry.dispose();
            if (reticle.material) reticle.material.dispose();
        }
        if (combinedPaintingImageBitmap) {
            combinedPaintingImageBitmap.close(); // Release bitmap memory
        }
    });

    // --- End: WebXR and Three.js Setup ---

</script>

<style>
    /* Your existing styles are fine */
    .ar-page-container {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background-color: black; /* Black background behind AR content */
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        overflow: hidden; /* Prevent scrolling */
        z-index: 1000;
    }

    canvas {
        display: block;
        width: 100%;
        height: 100%;
        /* Make canvas fill container, AR will show through */
        position: absolute;
        top: 0;
        left: 0;
    }

    .ar-ui-overlay {
        position: relative; /* Positioned relative to .ar-page-container, but layered above canvas */
        z-index: 10;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        height: 100%;
        padding: 20px;
        box-sizing: border-box;
        pointer-events: none; /* Allow touch events to pass through to canvas by default */
    }

    .ar-status {
        color: white;
        background-color: rgba(0, 0, 0, 0.5);
        padding: 10px 20px;
        border-radius: 5px;
        font-size: 1.1rem;
        margin-bottom: 20px;
        pointer-events: auto; /* Allow interaction */
    }

    .ar-actions {
        display: flex;
        gap: 15px;
        margin-top: auto; /* Push to bottom */
        pointer-events: auto; /* Allow interaction */
    }

    .ar-button, .ar-close-button {
        padding: 15px 25px;
        background-color: #007bff;
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 1.1rem;
        cursor: pointer;
        transition: background-color 0.3s ease;
    }

    .ar-button:hover, .ar-close-button:hover {
        background-color: #0056b3;
    }

    .ar-close-button {
        background-color: #dc3545;
    }
    .ar-close-button:hover {
        background-color: #c82333;
    }

    /* Loading spinner */
    .spinner {
        border: 4px solid rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        border-top: 4px solid #fff;
        width: 40px;
        height: 40px;
        -webkit-animation: spin 1s linear infinite;
        animation: spin 1s linear infinite;
        margin-bottom: 20px;
    }

    @-webkit-keyframes spin {
        0% { -webkit-transform: rotate(0deg); }
        100% { -webkit-transform: rotate(360deg); }
    }

    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
</style>

<div class="ar-page-container">
    <canvas bind:this={arCanvas}></canvas>
    <div class="ar-ui-overlay">
        <div class="ar-status">
            {#if isLoading}
                <div class="spinner"></div>
                <p>{currentStatus}</p>
            {:else}
                <p>{arSupportMessage}</p>
                {#if xrSession}
                <p>{currentStatus}</p>
                {/if}
            {/if}
        </div>

        <div class="ar-actions">
            {#if !isLoading && arSupportMessage.includes("AR supported")}
                <button on:click={startArSession} class="ar-button">
                    {#if !xrSession}
                        Start AR
                    {:else}
                        Restart AR (Debugging)
                    {/if}
                </button>
            {/if}
            {#if xrSession}
                <button on:click={onSessionEnd} class="ar-close-button">Exit AR</button>
            {/if}
        </div>
    </div>
</div>