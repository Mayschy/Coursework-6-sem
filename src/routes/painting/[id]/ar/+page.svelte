<script>
    import { onMount, onDestroy } from 'svelte';
    import * as THREE from 'three';
    import { browser } from '$app/environment';

    // Data is not needed for this minimal test
    // export let data;

    let arCanvas; // Reference to the canvas DOM element
    let renderer, scene, camera;
    let xrSession = null;

    let isLoading = true;
    let arSupportMessage = "Checking AR support...";
    let currentStatus = "Attempting to start minimal AR...";

    onMount(async () => {
        if (!browser) {
            console.warn("AR: Not running on client, skipping AR setup.");
            arSupportMessage = "AR mode only available on devices with WebXR support.";
            isLoading = false;
            return;
        }

        // Initialize Three.js components
        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(); // Camera will be updated by XR

        // Explicitly set canvas dimensions before creating renderer
        if (arCanvas) {
            arCanvas.width = window.innerWidth * window.devicePixelRatio;
            arCanvas.height = window.innerHeight * window.devicePixelRatio;
            console.log(`AR: Canvas dimensions set to ${arCanvas.width}x${arCanvas.height}`);
        } else {
            console.error("AR: arCanvas is not available on mount. Cannot proceed with AR setup.");
            arSupportMessage = "Error: AR canvas not found.";
            isLoading = false;
            return;
        }

        renderer = new THREE.WebGLRenderer({
            alpha: true, // Crucial for AR camera feed
            preserveDrawingBuffer: true,
            canvas: arCanvas,
            antialias: true
        });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.xr.enabled = true; // Enable XR for the renderer
        renderer.setClearColor(0x000000, 0); // Transparent background
        renderer.setSize(window.innerWidth, window.innerHeight); // Set initial renderer size

        // Handle window resize
        const onWindowResize = () => {
            if (arCanvas && renderer) {
                arCanvas.width = window.innerWidth * window.devicePixelRatio;
                arCanvas.height = window.innerHeight * window.devicePixelRatio;
                renderer.setSize(window.innerWidth, window.innerHeight);
                if (camera) { // Camera aspect ratio will be set by WebXR, but good practice
                    camera.aspect = window.innerWidth / window.innerHeight;
                    camera.updateProjectionMatrix();
                }
                console.log("AR: Canvas resized.");
            }
        };
        window.addEventListener('resize', onWindowResize);
        onWindowResize(); // Call once immediately

        // Check WebXR support and try to start session directly
        await checkAndStartMinimalAr();
    });

    async function checkAndStartMinimalAr() {
        if (navigator.xr) {
            try {
                const supported = await navigator.xr.isSessionSupported('immersive-ar');
                if (supported) {
                    arSupportMessage = "AR supported! Attempting to start session...";
                    await startMinimalArSession();
                } else {
                    arSupportMessage = "Immersive AR is not supported on this device/browser.";
                    isLoading = false;
                }
            } catch (error) {
                console.error("Error checking WebXR support:", error);
                arSupportMessage = "Error checking AR support. See console.";
                isLoading = false;
            }
        } else {
            arSupportMessage = "WebXR not found. Please use a WebXR-compatible browser.";
            isLoading = false;
        }
    }

    async function startMinimalArSession() {
        if (xrSession) {
            xrSession.end();
            return;
        }

        try {
            currentStatus = "Requesting AR session (minimal)...";
            console.log("AR: Requesting WebXR session (minimal)...");
            xrSession = await navigator.xr.requestSession('immersive-ar', {
                // Minimal features, no hit-test, no dom-overlay for now
                requiredFeatures: [], // Empty for minimal test, just camera feed
                optionalFeatures: ['light-estimation'] // Still optional, doesn't hurt
            });
            console.log("AR: WebXR session obtained successfully (minimal).", xrSession);

            renderer.xr.setSession(xrSession);
            console.log("AR: Renderer session set (minimal).");

            xrSession.addEventListener('end', onSessionEnd);

            currentStatus = "AR session active. Expecting camera feed...";

            console.log("AR: Setting animation loop (minimal)...");
            renderer.setAnimationLoop(onXRFrame);
            console.log("AR: Animation loop set (minimal).");

            isLoading = false; // Hide loading spinner if session successfully started

        } catch (error) {
            console.error("AR: Error during minimal WebXR session setup:", error);
            alert(`Could not start minimal AR session: ${error.message}.`);
            currentStatus = `Minimal AR Session failed: ${error.message}`;
            isLoading = false;
            if (xrSession) {
                console.warn("AR: Attempting to end session due to setup error.");
                xrSession.end();
            }
            xrSession = null;
            renderer.setAnimationLoop(null);
        }
    }

    function onXRFrame(time, frame) {
        if (!xrSession) {
            console.error("AR: onXRFrame (minimal) - xrSession is null. Stopping loop.");
            renderer.setAnimationLoop(null);
            return;
        }
        if (!renderer || !scene || !camera) {
            console.error("AR: onXRFrame (minimal) - Missing essential Three.js components. Stopping loop.");
            renderer.setAnimationLoop(null);
            return;
        }

        if (!frame) {
            console.error("AR: onXRFrame (minimal) - 'frame' object is null/undefined. This is CRITICAL. Stopping loop.");
            renderer.setAnimationLoop(null);
            return;
        }

        if (!frame.session) {
            console.error("AR: onXRFrame (minimal) - 'frame.session' is undefined. Stopping loop.");
            renderer.setAnimationLoop(null);
            return;
        }

        // Get reference space from renderer
        const currentReferenceSpace = renderer.xr.getReferenceSpace();
        if (!currentReferenceSpace) {
            console.warn("AR: onXRFrame (minimal) - currentReferenceSpace is null. Waiting for XRManager.");
            renderer.render(scene, camera); // Still render to show camera feed if possible
            return; // Skip pose if referenceSpace not ready
        }

        const viewerPose = frame.getViewerPose(currentReferenceSpace);

        if (viewerPose) {
            // Update camera based on viewer pose
            camera.matrix.fromArray(viewerPose.transform.matrix);
            camera.updateMatrixWorld(true);
            currentStatus = "Minimal AR active. Move device to see camera feed.";
        } else {
            // console.warn("AR: onXRFrame (minimal) - No Viewer Pose in this frame.");
            currentStatus = "Minimal AR active. Waiting for camera pose.";
        }

        renderer.render(scene, camera);
    }

    function onSessionEnd(event) {
        console.log("AR: WebXR session ended (minimal).");
        xrSession = null;
        renderer.setAnimationLoop(null);
        currentStatus = "AR Session ended (minimal).";
        isLoading = false; // Allow re-attempt
    }

    onDestroy(() => {
        if (xrSession) {
            xrSession.end();
        }
        if (renderer) {
            renderer.dispose();
        }
        window.removeEventListener('resize', onWindowResize); // Clean up resize listener
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
    }

    /* Keep a minimal UI overlay just for status and a button */
    .ar-ui-overlay {
        position: relative;
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
        pointer-events: auto;
    }

    .ar-actions {
        display: flex;
        gap: 15px;
        margin-top: auto;
        pointer-events: auto;
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
                <button on:click={checkAndStartMinimalAr} class="ar-button">
                    {#if !xrSession}
                        Start Minimal AR
                    {:else}
                        Restart Minimal AR
                    {/if}
                </button>
            {/if}
            {#if xrSession}
                <button on:click={onSessionEnd} class="ar-close-button">Exit AR</button>
            {/if}
        </div>
    </div>
</div>