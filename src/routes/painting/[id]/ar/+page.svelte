<script>
    import { onMount, onDestroy } from 'svelte';
    import { page } from '$app/stores';
    import * as THREE from 'three';
    import { browser } from '$app/environment';

    export let data; // Data from your +page.server.js or +layout.server.js

    let arCanvas; // Reference to the canvas DOM element
    let renderer, scene, camera;
    let xrSession = null;
    let hitTestSource = null;
    let referenceSpace = null; // We will still store this, but let Three.js update it
    let paintingMesh = null; // Our 3D model of the painting in AR
    let reticle = null; // Visual indicator for hit-test results

    let isLoading = true; // State to show loading spinner
    let arSupportMessage = "Checking AR support...";
    let currentStatus = "Loading painting...";

    // Original painting image and frame image
    let paintingImage;
    let frameImage;
    let combinedPaintingImageBitmap = null;

    // --- Start: Image Loading and Combining Logic ---

    async function setupImageLoadingAndCombining() {
        console.log("AR: Setting up image loading and combining...");
        currentStatus = "Loading painting images...";

        paintingImage = new Image();
        frameImage = new Image();

        // Load frame image first
        frameImage.src = '/frames/11429042.jpg';
        frameImage.onload = () => {
            console.log("AR: Frame image loaded.");
            if (paintingImage.complete && paintingImage.src) {
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
            const cloudinaryBasePrefix = 'https://res.cloudinary.com/dvfjsg1c6/image/upload/';
            let cloudinaryPath = data.painting.previewImage.replace(cloudinaryBasePrefix, '');
            if (data.painting.previewImage.includes('/upload/')) {
                cloudinaryPath = data.painting.previewImage.split('/upload/')[1];
            }
            paintingImage.src = `/api/proxy-image/${cloudinaryPath}`;
            console.log("AR: Proxying painting image from:", paintingImage.src);

            paintingImage.onload = () => {
                console.log("AR: Product painting image loaded (via proxy).");
                if (frameImage.complete && frameImage.src) {
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

        if (paintingImage.naturalWidth < targetWidth || paintingImage.naturalHeight < targetHeight) {
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
            isLoading = false;
            checkArSupport();
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
        if (!browser) {
            console.warn("AR: Not running on client, skipping AR setup.");
            arSupportMessage = "AR mode only available on devices with WebXR support.";
            isLoading = false;
            return;
        }

        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera();

        renderer = new THREE.WebGLRenderer({
            alpha: true, // Crucial for AR camera feed
            preserveDrawingBuffer: true,
            canvas: arCanvas,
            antialias: true
        });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.xr.enabled = true;
        renderer.setClearColor(0x000000, 0); // Explicitly set clear color to transparent black

        scene.add(new THREE.AmbientLight(0xFFFFFF, 1.0));

        const geometry = new THREE.RingGeometry(0.08, 0.1, 32).rotateX(-Math.PI / 2);
        const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
        reticle = new THREE.Mesh(geometry, material);
        reticle.matrixAutoUpdate = false;
        reticle.visible = false;
        scene.add(reticle);

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

    if (xrSession) {
        xrSession.end();
        return;
    }

    try {
        currentStatus = "Requesting AR session...";
        console.log("AR: Requesting WebXR session...");
        xrSession = await navigator.xr.requestSession('immersive-ar', {
            // Убираем 'dom-overlay' пока, чтобы исключить его как проблему
            // requiredFeatures: ['hit-test', 'dom-overlay'], // Old line
            requiredFeatures: ['hit-test'], // NEW: Removed dom-overlay
            optionalFeatures: ['light-estimation'],
            // domOverlay: { root: document.querySelector('.ar-ui-overlay') } // Old line
            // NEW: No domOverlay property if not using dom-overlay required feature
        });
        console.log("AR: WebXR session obtained successfully.", xrSession);

        renderer.xr.setSession(xrSession);
        console.log("AR: Renderer session set.");

        xrSession.addEventListener('end', onSessionEnd);

        currentStatus = "Detecting surfaces...";

        // NEW: Request hit test source directly from the xrSession
        // without pre-requesting 'viewer' space separately.
        // The space for hit test results will be relative to whatever
        // reference space Three.js XRManager internally uses.
        // This makes it simpler and relies more on Three.js's internal handling.
        hitTestSource = await xrSession.requestHitTestSource({ space: await xrSession.requestReferenceSpace('viewer') });
        console.log("AR: Hit test source obtained using 'viewer' space."); // Лог остается таким, но по факту запрос будет немного другим


        // The referenceSpace variable will be set by Three.js internally
        // during the animation loop. We'll access it there.

        console.log("AR: Setting animation loop...");
        renderer.setAnimationLoop(onXRFrame);
        console.log("AR: Animation loop set.");

        // NOTE: If we remove dom-overlay, the .ar-ui-overlay will NOT be passed to WebXR.
        // You might need to adjust your UI to be positioned over the canvas directly
        // rather than relying on WebXR's domOverlay.
        // For now, let's just test if this fixes the 'frame' issue.
        if (arCanvas) {
            arCanvas.addEventListener('touchstart', onTouchStart);
        }

    } catch (error) {
        console.error("AR: Error during WebXR session setup:", error);
        alert(`Could not start AR session: ${error.message}. Make sure your device supports AR and try again.`);
        currentStatus = `AR Session failed: ${error.message}`;
        isLoading = false;
        if (xrSession) {
            console.warn("AR: Attempting to end session due to setup error.");
            xrSession.end();
        }
        xrSession = null;
        hitTestSource = null;
        referenceSpace = null;
        renderer.setAnimationLoop(null);
    }
}

    function onXRFrame(time, frame) {
        // Updated checks for Three.js managing reference space
        if (!xrSession) {
            console.error("AR: onXRFrame - xrSession is null. Stopping loop.");
            renderer.setAnimationLoop(null);
            return;
        }
        if (!renderer || !scene || !camera || !hitTestSource || !reticle) { // Removed referenceSpace from here
            console.error("AR: onXRFrame - Missing essential Three.js/XR components (excluding referenceSpace). Stopping loop.", {
                renderer: !!renderer, scene: !!scene, camera: !!camera,
                hitTestSource: !!hitTestSource, reticle: !!reticle
            });
            renderer.setAnimationLoop(null);
            return;
        }

        // --- Step 2: Check 'frame' object ---
        if (!frame) {
            console.error("AR: onXRFrame - 'frame' object is null/undefined. This is highly unusual. Stopping loop.");
            renderer.setAnimationLoop(null);
            return;
        }

        // --- Step 3: Check 'session' property inside 'frame' ---
        if (!frame.session) {
            console.error("AR: onXRFrame - 'frame.session' is undefined. This is the root cause. Stopping loop.");
            renderer.setAnimationLoop(null);
            return;
        }
        // console.log("AR: onXRFrame - frame.session is defined.");

        // IMPORTANT: Get the reference space from the renderer's XRManager in each frame
        const currentReferenceSpace = renderer.xr.getReferenceSpace();
        if (!currentReferenceSpace) {
            console.warn("AR: onXRFrame - currentReferenceSpace is null. Waiting for XRManager to provide it.");
            // We can continue to render, but hit tests and viewer pose will be invalid
            // if we need a specific reference space for them.
            renderer.render(scene, camera); // Still render to show camera feed if possible
            return; // Skip pose and hit test if referenceSpace is not yet available
        }
        referenceSpace = currentReferenceSpace; // Update our global referenceSpace variable

        const viewerPose = frame.getViewerPose(referenceSpace); // Use the currentReferenceSpace

        if (viewerPose) {
            // console.log("AR: Viewer Pose received. Camera should be active.");
            camera.matrix.fromArray(viewerPose.transform.matrix);
            camera.updateMatrixWorld(true);

            // Hit test results are now relative to the referenceSpace
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
        } else {
             // console.warn("AR: No Viewer Pose in this frame.");
        }

        renderer.render(scene, camera);
    }

    async function onTouchStart(event) {
        // Now using the referenceSpace that is updated in onXRFrame
        if (!xrSession || !hitTestSource || !referenceSpace || paintingMesh) return;

        if (reticle && reticle.visible) {
            const hitPose = new THREE.Pose(reticle.position, reticle.quaternion);

            if (combinedPaintingImageBitmap) {
                scene.remove(reticle);
                reticle = null;

                const texture = new THREE.CanvasTexture(combinedPaintingImageBitmap);
                texture.colorSpace = THREE.SRGBColorSpace;
                texture.needsUpdate = true;

                const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide });

                let realWorldPaintingWidthMeters = 0.8;
                let realWorldPaintingHeightMeters = 1.2;

                if (data.painting && data.painting.dimensions) {
                    const dimMatch = data.painting.dimensions.match(/(\d+)x(\d+)\s*cm/i);
                    if (dimMatch) {
                        realWorldPaintingWidthMeters = parseFloat(dimMatch[1]) / 100;
                        realWorldPaintingHeightMeters = parseFloat(dimMatch[2]) / 100;
                        console.log(`AR: Using painting dimensions: ${realWorldPaintingWidthMeters}m x ${realWorldPaintingHeightMeters}m`);
                    }
                } else {
                    console.warn("AR: Painting dimensions not found in data. Using default size.");
                    const aspectRatio = combinedPaintingImageBitmap.width / combinedPaintingImageBitmap.height;
                    realWorldPaintingHeightMeters = 1.0;
                    realWorldPaintingWidthMeters = realWorldPaintingHeightMeters * aspectRatio;
                }

                const geometry = new THREE.PlaneGeometry(realWorldPaintingWidthMeters, realWorldPaintingHeightMeters);
                paintingMesh = new THREE.Mesh(geometry, material);

                paintingMesh.position.set(hitPose.position.x, hitPose.position.y, hitPose.position.z);
                paintingMesh.quaternion.set(hitPose.orientation.x, hitPose.orientation.y, hitPose.orientation.z, hitPose.orientation.w);

                const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(hitPose.orientation);
                paintingMesh.position.add(normal.multiplyScalar(0.005));

                scene.add(paintingMesh);
                currentStatus = "Painting placed! Move around to view.";
                console.log("AR: Painting placed in AR.");

                arCanvas.removeEventListener('touchstart', onTouchStart);
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
        // No longer explicitly setting referenceSpace to null here,
        // as Three.js XRManager will handle its lifecycle.
        // It will become null automatically when session ends.
        referenceSpace = null; // Explicitly nullify our variable

        renderer.setAnimationLoop(null);

        if (paintingMesh) {
            scene.remove(paintingMesh);
            if (paintingMesh.geometry) paintingMesh.geometry.dispose();
            if (paintingMesh.material) paintingMesh.material.dispose();
            paintingMesh = null;
        }
        if (reticle) {
            if (reticle.geometry) reticle.geometry.dispose();
            if (reticle.material) reticle.material.dispose();
            const geometry = new THREE.RingGeometry(0.08, 0.1, 32).rotateX(-Math.PI / 2);
            const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
            reticle = new THREE.Mesh(geometry, material);
            reticle.matrixAutoUpdate = false;
            reticle.visible = false;
            scene.add(reticle);
        }

        if (arCanvas) {
            arCanvas.removeEventListener('touchstart', onTouchStart);
        }
        currentStatus = "AR Session ended.";
        checkArSupport();
    }

    onDestroy(() => {
        if (xrSession) {
            xrSession.end();
        }
        if (renderer) {
            renderer.dispose();
        }
        if (paintingMesh) {
            if (paintingMesh.geometry) paintingMesh.geometry.dispose();
            if (paintingMesh.material) paintingMesh.material.dispose();
        }
        if (reticle) {
            if (reticle.geometry) reticle.geometry.dispose();
            if (reticle.material) reticle.material.dispose();
        }
        if (combinedPaintingImageBitmap) {
            combinedPaintingImageBitmap.close();
        }
    });

</script>

<style>
    .ar-page-container {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background-color: black;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        overflow: hidden;
        z-index: 1000;
    }

    canvas {
        display: block;
        width: 100%;
        height: 100%;
        position: absolute;
        top: 0;
        left: 0;
        /* z-index: 1; - This is not needed if canvas is the first child and alpha:true */
    }

    .ar-ui-overlay {
        position: relative; /* To make z-index work relative to the container */
        z-index: 10;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        height: 100%;
        padding: 20px;
        box-sizing: border-box;
        pointer-events: none; /* Allows clicks to pass through to canvas if needed, buttons override this */
    }

    .ar-status {
        color: white;
        background-color: rgba(0, 0, 0, 0.5);
        padding: 10px 20px;
        border-radius: 5px;
        font-size: 1.1rem;
        margin-bottom: 20px;
        pointer-events: auto; /* Allow interaction with status box */
    }

    .ar-actions {
        display: flex;
        gap: 15px;
        margin-top: auto;
        pointer-events: auto; /* Allow interaction with buttons */
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