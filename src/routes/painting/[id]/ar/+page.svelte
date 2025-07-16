<script>
    import { onMount, onDestroy } from 'svelte';
    import { page } from '$app/stores';
    import * as THREE from 'three';

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

    // Original painting image and frame image (similar to your existing +page.svelte)
    let paintingImage = new Image();
    let frameImage = new Image();
    let combinedPaintingImageBitmap = null;

    // --- Start: Image Loading and Combining Logic (similar to +page.svelte) ---

    // Load frame image first
    // !!! IMPORTANT: Update this path to your frame image !!!
    // Assuming frame is local in static/frames/
    frameImage.src = '/frames/11429042.png';
    frameImage.onload = () => {
        console.log("AR: Frame image loaded.");
        if (paintingImage.complete) {
            combinePaintingAndFrame();
        }
    };
    frameImage.onerror = (e) => {
        console.error("AR: Failed to load frame image. Check path:", frameImage.src, e);
        arSupportMessage = "Error loading frame image. Check console.";
        isLoading = false;
    };

    // Load painting image via proxy
    $: {
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
                if (frameImage.complete) {
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

        const frameCanvas = document.createElement('canvas');
        const frameCtx = frameCanvas.getContext('2d');

        frameCanvas.width = frameImage.naturalWidth;
        frameCanvas.height = frameImage.naturalHeight;

        frameCtx.drawImage(frameImage, 0, 0, frameCanvas.width, frameCanvas.height);

        const innerFrameX = 200;
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

        if (paintingImage.naturalWidth < targetWidth || paintingImage.naturalHeight < targetHeight) {
            if (paintingImage.naturalWidth <= innerFrameWidth && paintingImage.naturalHeight <= innerFrameHeight) {
                 drawWidth = Math.min(targetWidth, paintingImage.naturalWidth);
                 drawHeight = Math.min(targetHeight, paintingImage.naturalHeight);
            } else {
                 drawWidth = targetWidth;
                 drawHeight = targetHeight;
            }
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
             frameCanvas.width = 0;
             frameCanvas.height = 0;
        }
    }

    // --- End: Image Loading and Combining Logic ---


    // --- Start: WebXR and Three.js Setup ---

    onMount(async () => {
        // Basic Three.js setup (renderer, scene, camera)
        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(); // WebXR will handle camera updates

        renderer = new THREE.WebGLRenderer({
            alpha: true,
            preserveDrawingBuffer: true,
            canvas: arCanvas,
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

        // checkArSupport() will be called after combinedPaintingImageBitmap is ready
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
                // domOverlay: { root: document.querySelector('.ar-ui-overlay') } // If you need a full DOM overlay
            });

            renderer.xr.setSession(xrSession);
            xrSession.addEventListener('end', onSessionEnd);

            currentStatus = "Detecting surfaces...";

            // Request a reference space for tracking
            const referenceSpace = await xrSession.requestReferenceSpace('local-floor'); // Or 'viewer' for simpler setup
            hitTestSource = await session.requestHitTestSource({ space: referenceSpace });

            // Start the AR frame loop
            renderer.setAnimationLoop(onXRFrame);

            // Add touch listener for placing object
            arCanvas.addEventListener('touchstart', onTouchStart);

        } catch (error) {
            console.error("Error starting WebXR session:", error);
            alert(`Could not start AR session: ${error.message}. Make sure your device supports AR and try again.`);
            currentStatus = `AR Session failed: ${error.message}`;
            isLoading = false;
        }
    }

    function onXRFrame(time, frame) {
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

        const referenceSpace = renderer.xr.getReferenceSpace();
        const frame = xrSession.requestAnimationFrame(onXRFrame); // Request a frame to get hit test result
        const hitTestResults = frame.getHitTestResults(hitTestSource);

        if (hitTestResults.length > 0) {
            const hitPose = hitTestResults[0].getPose(referenceSpace);
            if (hitPose && combinedPaintingImageBitmap) {
                // Remove reticle once painting is placed
                scene.remove(reticle);
                reticle.dispose(); // Clean up reticle resources
                reticle = null;


                // Create and place the painting mesh
                const texture = new THREE.CanvasTexture(combinedPaintingImageBitmap);
                const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide });

                // Scale for AR: Decide how large 1 pixel of your combined image should be in meters
                // Let's assume a standard painting might be around 0.8 meters tall in real life
                // You might get painting dimensions from data.painting.dimensions and convert
                const realWorldPaintingHeightMeters = 0.8; // Example: 80cm tall
                const aspectRatio = combinedPaintingImageBitmap.width / combinedPaintingImageBitmap.height;
                const realWorldPaintingWidthMeters = realWorldPaintingHeightMeters * aspectRatio;

                const geometry = new THREE.PlaneGeometry(realWorldPaintingWidthMeters, realWorldPaintingHeightMeters);
                paintingMesh = new THREE.Mesh(geometry, material);

                // Position the mesh using the hit-test result
                paintingMesh.position.set(hitPose.transform.position.x, hitPose.transform.position.y, hitPose.transform.position.z);
                // Orient the painting to align with the detected surface normal
                paintingMesh.quaternion.set(hitPose.transform.orientation.x, hitPose.transform.orientation.y, hitPose.transform.orientation.z, hitPose.transform.orientation.w);

                // Adjust rotation slightly if it's not perfectly flush with the wall
                // paintingMesh.rotateX(Math.PI / 2); // If your plane is created standing up

                // Small offset to prevent z-fighting with the real wall
                const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(hitPose.transform.orientation);
                paintingMesh.position.add(normal.multiplyScalar(0.005)); // Move 0.5 cm off the wall

                scene.add(paintingMesh);
                currentStatus = "Painting placed! Move around to view.";
                console.log("AR: Painting placed in AR.");

                // Remove the touch listener once placed (or adjust for moving/scaling)
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
             scene.add(reticle);
             reticle.visible = false;
        }

        arCanvas.removeEventListener('touchstart', onTouchStart);
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
        if (paintingMesh) {
            paintingMesh.geometry.dispose();
            paintingMesh.material.dispose();
        }
        if (reticle) {
            reticle.geometry.dispose();
            reticle.material.dispose();
        }
        if (combinedPaintingImageBitmap) {
            combinedPaintingImageBitmap.close(); // Release bitmap memory
        }
    });

    // --- End: WebXR and Three.js Setup ---

</script>

<style>
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
                <p>{currentStatus}</p>
            {/if}
        </div>

        <div class="ar-actions">
            {#if !xrSession}
                <button on:click={startArSession} class="ar-button">Start AR</button>
            {:else}
                <button on:click={onSessionEnd} class="ar-close-button">Exit AR</button>
                {/if}
        </div>
    </div>
</div>