<script>
    import { onMount } from 'svelte';
    import { invalidateAll } from '$app/navigation';

    // --- Variables for adding/editing painting (consolidated) ---
    let showFormModal = false; // Controls visibility of the main form modal (add/edit)
    let isEditing = false; // True if we are editing, false if adding new
    let currentPaintingId = null; // ID of the painting being edited

    let title = '';
    let description = '';
    let price = '';
    let dimensions = '';
    let previewImageFile = null;
    let hoverPreviewImageFile = null;
    let detailImageFiles = [];
    let saleFile = null; // Changed from saleFileUrl to File object

    let formError = ''; // Error message for the add/edit form
    let formSuccess = ''; // Success message for the add/edit form
    let isSubmitting = false; // Loading state for form submission

    // Local URLs for previewing images before upload
    let localPreviewImageUrl = '';
    let localHoverPreviewImageUrl = '';
    let localDetailImageUrls = [];
    // No local URL for saleFile as it's not an image for direct preview

    // Existing Cloudinary URLs for images when editing
    let existingPreviewImageUrl = '';
    let existingHoverPreviewImageUrl = '';
    let existingDetailImageUrls = [];
    let existingSaleFileUrl = ''; // To store the existing Dropbox URL when editing


    // --- Variables for managing painting list and deletion ---
    let paintings = [];
    let isFetchingPaintings = true;
    let deleteError = '';
    let deleteSuccess = '';
    let showDeleteConfirmModal = false;
    let paintingToDelete = null;
    let isDeleting = false;


    function updateLocalImagePreview(file, type) {
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                if (typeof e.target.result === 'string') {
                    if (type === 'preview') localPreviewImageUrl = e.target.result;
                    if (type === 'hover') localHoverPreviewImageUrl = e.target.result;
                } else {
                    console.warn(`FileReader for ${type} did not return a string.`);
                }
            };
            reader.readAsDataURL(file);
        } else {
            if (type === 'preview') localPreviewImageUrl = '';
            if (type === 'hover') localHoverPreviewImageUrl = '';
        }
    }

    function handleDetailImagesChange(event) {
        detailImageFiles = Array.from(event.target.files);
        localDetailImageUrls = detailImageFiles.map(file => URL.createObjectURL(file));
    }

    function removeExistingDetailImage(urlToRemove) {
        existingDetailImageUrls = existingDetailImageUrls.filter(url => url !== urlToRemove);
    }

    // --- NEW: Function to handle file input change for sale file ---
    function handleSaleFileChange(event) {
        const target = event.target;
        if (target instanceof HTMLInputElement && target.files && target.files.length > 0) {
            saleFile = target.files[0];
        } else {
            saleFile = null;
        }
    }


    async function uploadFileToCloudinary(file, folder) {
        if (!file) return null;

        const formData = new FormData();
        formData.append('image', file);
        formData.append('folder', folder);

        try {
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            const data = await res.json();

            if (data.error) {
                throw new Error(data.error);
            }
            return data.url;
        } catch (e) {
            console.error(`Error uploading ${file.name} to Cloudinary:`, e);
            formError = `Error uploading image "${file.name}": ${e.message}`;
            return null;
        }
    }

    // --- NEW: Function to upload sale file to Dropbox ---
    async function uploadFileToDropbox(file) {
        if (!file) return null;

        const formData = new FormData();
        formData.append('file', file); // 'file' - это имя, которое ожидает бэкенд
        // Опционально, можно передать путь или папку
        // formData.append('path', 'some_specific_folder'); 

        try {
            const res = await fetch('/api/upload-dropbox', { // Новый API-маршрут
                method: 'POST',
                body: formData
            });

            const data = await res.json();

            if (data.error) {
                throw new Error(data.error);
            }
            return data.url;
        } catch (e) {
            console.error(`Error uploading ${file.name} to Dropbox:`, e);
            formError = `Error uploading sale file "${file.name}": ${e.message}`;
            return null;
        }
    }


    async function handleSubmitPainting() {
        formError = '';
        formSuccess = '';
        isSubmitting = true;

        localPreviewImageUrl = '';
        localHoverPreviewImageUrl = '';
        localDetailImageUrls = [];

        let uploadedPreviewUrl = existingPreviewImageUrl;
        let uploadedHoverPreviewUrl = existingHoverPreviewImageUrl;
        let uploadedDetailImageUrls = [...existingDetailImageUrls];
        let uploadedSaleFileUrl = existingSaleFileUrl; // Initialize with existing URL

        try {
            // Upload main preview image
            if (previewImageFile) {
                uploadedPreviewUrl = await uploadFileToCloudinary(previewImageFile, 'artstore_previews');
                if (!uploadedPreviewUrl) {
                    isSubmitting = false;
                    return;
                }
            } else if (!existingPreviewImageUrl && !isEditing) {
                 formError = 'Please select a main preview image.';
                 isSubmitting = false;
                 return;
            }


            // Upload hover preview image
            if (hoverPreviewImageFile) {
                uploadedHoverPreviewUrl = await uploadFileToCloudinary(hoverPreviewImageFile, 'artstore_hover_previews');
                if (!uploadedHoverPreviewUrl) {
                    isSubmitting = false;
                    return;
                }
            }


            // Upload detail images
            for (const file of detailImageFiles) {
                const url = await uploadFileToCloudinary(file, 'artstore_details');
                if (url) {
                    uploadedDetailImageUrls.push(url);
                } else {
                    isSubmitting = false;
                    return;
                }
            }

            // --- NEW: Upload sale file to Dropbox ---
            if (saleFile) {
                uploadedSaleFileUrl = await uploadFileToDropbox(saleFile);
                if (!uploadedSaleFileUrl) {
                    isSubmitting = false;
                    return;
                }
            } else if (!existingSaleFileUrl && !isEditing) { // Check if required for new additions
                formError = 'Please select a sale file.';
                isSubmitting = false;
                return;
            }

            // Validation after all uploads (if images or files are conditionally required)
            if (!uploadedPreviewUrl) {
                formError = 'Main preview is required.';
                isSubmitting = false;
                return;
            }
            if (!uploadedHoverPreviewUrl) {
                formError = 'Hover preview is required.';
                isSubmitting = false;
                return;
            }
            if (uploadedDetailImageUrls.length === 0) {
                 formError = 'At least one detail image is required.';
                 isSubmitting = false;
                 return;
            }
            if (!uploadedSaleFileUrl) {
                formError = 'Sale file is required.';
                isSubmitting = false;
                return;
            }


            const paintingData = {
                title,
                description,
                price: parseFloat(price),
                dimensions,
                previewImage: uploadedPreviewUrl,
                hoverPreviewImage: uploadedHoverPreviewUrl,
                detailImages: uploadedDetailImageUrls,
                saleFileUrl: uploadedSaleFileUrl, // Use the URL from Dropbox
            };

            let res;
            if (isEditing) {
                res = await fetch(`/api/paintings/${currentPaintingId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(paintingData)
                });
            } else {
                paintingData.createdAt = new Date().toISOString();
                res = await fetch('/api/paintings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(paintingData)
                });
            }

            const data = await res.json();

            if (!res.ok) {
                formError = data.error || `Error ${isEditing ? 'updating' : 'saving'} painting`;
            } else {
                formSuccess = `Painting successfully ${isEditing ? 'updated' : 'added'}!`;
                await fetchPaintings();
                setTimeout(() => {
                    showFormModal = false;
                    formSuccess = '';
                    resetForm();
                }, 2000);
            }
        } catch (e) {
            formError = e.message || 'An unexpected error occurred';
            console.error(e);
        } finally {
            isSubmitting = false;
        }
    }

    function resetForm() {
        title = '';
        description = '';
        price = '';
        dimensions = '';
        previewImageFile = null;
        hoverPreviewImageFile = null;
        detailImageFiles = [];
        saleFile = null; // Reset saleFile to null
        formError = '';
        formSuccess = '';
        isSubmitting = false;
        localPreviewImageUrl = '';
        localHoverPreviewImageUrl = '';
        localDetailImageUrls = [];
        existingPreviewImageUrl = '';
        existingHoverPreviewImageUrl = '';
        existingDetailImageUrls = [];
        existingSaleFileUrl = ''; // Reset existingSaleFileUrl
        isEditing = false;
        currentPaintingId = null;
    }

    function closeOnEscape(event) {
        if (event.key === 'Escape') {
            showFormModal = false;
            showDeleteConfirmModal = false;
        }
    }

    $: if (showFormModal || showDeleteConfirmModal) {
        window.addEventListener('keydown', closeOnEscape);
    } else {
        window.removeEventListener('keydown', closeOnEscape);
    }


    async function fetchPaintings() {
        isFetchingPaintings = true;
        try {
            const res = await fetch('/api/paintings');
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Error fetching paintings');
            }
            paintings = await res.json();
        } catch (e) {
            console.error('Error fetching paintings:', e);
            deleteError = e.message;
        } finally {
            isFetchingPaintings = false;
        }
    }

    function confirmDelete(painting) {
        paintingToDelete = painting;
        showDeleteConfirmModal = true;
        deleteError = '';
        deleteSuccess = '';
    }

    async function executeDelete() {
        if (!paintingToDelete) return;

        isDeleting = true;
        deleteError = '';
        deleteSuccess = '';

        try {
            const res = await fetch(`/api/paintings/${paintingToDelete._id}`, {
                method: 'DELETE'
            });

            const result = await res.json();

            if (!res.ok) {
                throw new Error(result.error || 'Error deleting painting');
            }
            deleteSuccess = result.message;
            await fetchPaintings();
            setTimeout(() => {
                showDeleteConfirmModal = false;
                paintingToDelete = null;
                deleteSuccess = '';
            }, 2000);
        } catch (e) {
            deleteError = e.message;
            console.error('Error deleting painting:', e);
        } finally {
            isDeleting = false;
        }
    }

    onMount(() => {
        fetchPaintings();
    });

    async function openEditModal(painting) {
        resetForm();
        isEditing = true;
        currentPaintingId = painting._id;

        title = painting.title;
        description = painting.description || '';
        price = painting.price.toString();
        dimensions = painting.dimensions;
        existingSaleFileUrl = painting.saleFileUrl || ''; // Load existing Dropbox URL

        existingPreviewImageUrl = painting.previewImage || '';
        existingHoverPreviewImageUrl = painting.hoverPreviewImage || '';
        existingDetailImageUrls = painting.detailImages || [];

        showFormModal = true;
    }

    function openAddModal() {
        resetForm();
        isEditing = false;
        showFormModal = true;
    }
</script>

<style>
    .admin-panel-container {
        max-width: 900px;
        margin: 2rem auto;
        padding: 2rem;
        background: #f9f9f9;
        border-radius: 1rem;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
        text-align: center;
    }

    h1 {
        text-align: center;
        margin-bottom: 2rem;
        color: #333;
    }

    .admin-button {
        padding: 1rem 2rem;
        background-color: #007bff;
        color: white;
        border: none;
        border-radius: 0.5rem;
        font-size: 1.1rem;
        cursor: pointer;
        transition: background-color 0.3s ease;
        margin-top: 1rem;
        margin-bottom: 2rem;
    }

    .admin-button:hover {
        background-color: #0056b3;
    }

    .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    }

    .modal-content {
        background: #fff;
        padding: 2rem;
        border-radius: 1rem;
        box-shadow: 0 5px 20px rgba(0, 0, 0, 0.3);
        max-width: 700px;
        width: 90%;
        max-height: 90vh;
        overflow-y: auto;
        position: relative;
    }

    .close-button {
        position: absolute;
        top: 1rem;
        right: 1rem;
        background: none;
        border: none;
        font-size: 2rem;
        cursor: pointer;
        color: #333;
        transition: color 0.2s ease;
    }

    .close-button:hover {
        color: #dc3545;
    }

    .modal-content form div {
        margin-bottom: 1rem;
    }

    .modal-content form label {
        display: block;
        margin-bottom: 0.4rem;
        font-weight: bold;
        color: #555;
        font-size: 0.95rem;
    }

    .modal-content form input[type="text"],
    .modal-content form input[type="number"],
    .modal-content form textarea,
    .modal-content form input[type="url"] { /* Keep url type for existing saleFileUrl display */
        width: calc(100% - 20px);
        padding: 8px;
        border: 1px solid #ccc;
        border-radius: 0.4rem;
        font-size: 0.9rem;
        box-sizing: border-box;
    }

    .modal-content form textarea {
        min-height: 80px;
    }

    .modal-content form input[type="file"] {
        margin-top: 0.4rem;
    }

    .modal-content form small {
        display: block;
        margin-top: 0.2rem;
        color: #777;
        font-size: 0.8rem;
    }

    .modal-content form button[type="submit"] {
        display: block;
        width: 100%;
        padding: 0.8rem;
        margin-top: 1.5rem;
        background-color: #28a745;
        color: white;
        border: none;
        border-radius: 0.5rem;
        font-size: 1rem;
        cursor: pointer;
        transition: background-color 0.3s ease;
    }

    .modal-content form button[type="submit"]:hover:not(:disabled) {
        background-color: #218838;
    }

    .modal-content form button[type="submit"]:disabled {
        background-color: #cccccc;
        cursor: not-allowed;
    }

    .messages {
        text-align: center;
        margin-bottom: 1rem;
        font-size: 1rem;
        padding: 0.5rem;
        border-radius: 0.5rem;
    }

    .messages.error {
        color: #721c24;
        background-color: #f8d7da;
        border-color: #f5c6cb;
    }

    .messages.success {
        color: #155724;
        background-color: #d4edda;
        border-color: #c3e6cb;
    }

    .local-preview-thumbnail {
        max-width: 80px;
        max-height: 80px;
        object-fit: contain;
        border: 1px solid #ddd;
        border-radius: 0.3rem;
        margin-top: 0.5rem;
        display: block;
    }

    .existing-image-preview {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        margin-top: 0.5rem;
    }

    .existing-image-item {
        position: relative;
        display: inline-block;
    }

    .existing-image-thumbnail {
        max-width: 80px;
        max-height: 80px;
        object-fit: cover;
        border: 1px solid #ddd;
        border-radius: 0.3rem;
        display: block;
    }

    .remove-image-button {
        position: absolute;
        top: -5px;
        right: -5px;
        background-color: #dc3545;
        color: white;
        border: none;
        border-radius: 50%;
        width: 20px;
        height: 20px;
        font-size: 0.8rem;
        display: flex;
        justify-content: center;
        align-items: center;
        cursor: pointer;
        line-height: 1;
    }

    .remove-image-button:hover {
        background-color: #c82333;
    }


    .image-preview-container {
        display: none;
    }

    .paintings-list {
        margin-top: 2rem;
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 1.5rem;
    }

    .painting-card {
        background: white;
        border-radius: 0.8rem;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
        overflow: hidden;
        text-align: left;
        display: flex;
        flex-direction: column;
    }

    .painting-card img {
        width: 100%;
        height: 200px;
        object-fit: cover;
        border-bottom: 1px solid #eee;
    }

    .painting-card-info {
        padding: 1rem;
        flex-grow: 1;
    }

    .painting-card-info h3 {
        margin-top: 0;
        margin-bottom: 0.5rem;
        font-size: 1.3rem;
        color: #333;
    }

    .painting-card-info p {
        margin-bottom: 0.3rem;
        font-size: 0.95rem;
        color: #666;
    }

    .card-actions {
        display: flex;
        gap: 0.5rem;
        padding: 0 1rem 1rem;
        width: 100%;
        box-sizing: border-box;
    }

    .card-actions button {
        flex: 1;
        padding: 0.6rem 1rem;
        border: none;
        border-radius: 0.5rem;
        font-size: 1rem;
        cursor: pointer;
        transition: background-color 0.3s ease;
    }

    .edit-painting-button {
        background-color: #28a745;
        color: white;
    }
    .edit-painting-button:hover {
        background-color: #218838;
    }

    .delete-painting-button {
        background-color: #dc3545;
        color: white;
    }
    .delete-painting-button:hover {
        background-color: #c82333;
    }
    .delete-painting-button:disabled, .edit-painting-button:disabled {
        background-color: #cccccc;
        cursor: not-allowed;
    }

    .confirm-modal-content {
        max-width: 400px;
        text-align: center;
    }

    .confirm-modal-content h3 {
        color: #dc3545;
        margin-bottom: 1.5rem;
    }

    .confirm-modal-content .button-group {
        display: flex;
        justify-content: center;
        gap: 1rem;
        margin-top: 2rem;
    }

    .confirm-modal-content .button-group button {
        padding: 0.8rem 1.5rem;
        border: none;
        border-radius: 0.5rem;
        font-size: 1rem;
        cursor: pointer;
        transition: background-color 0.3s ease;
        width: 120px;
    }

    .confirm-modal-content .button-group .confirm-delete-btn {
        background-color: #dc3545;
        color: white;
    }

    .confirm-modal-content .button-group .confirm-delete-btn:hover {
        background-color: #c82333;
    }

    .confirm-modal-content .button-group .cancel-delete-btn {
        background-color: #6c757d;
        color: white;
    }

    .confirm-modal-content .button-group .cancel-delete-btn:hover {
        background-color: #5a6268;
    }
</style>

<div class="admin-panel-container">
    <h1>Admin Panel</h1>


    <button class="admin-button" on:click={openAddModal}>
        Add New Painting
    </button>

    <h2>Manage Paintings</h2>

    {#if isFetchingPaintings}
        <p style="text-align: center;">Loading paintings...</p>
    {:else if deleteError}
        <p class="messages error">{deleteError}</p>
    {:else if paintings.length === 0}
        <p style="text-align: center;">No paintings added yet.</p>
    {:else}
        <div class="paintings-list">
            {#each paintings as painting (painting._id)}
                <div class="painting-card">
                    <img src={painting.previewImage || '/placeholder.png'} alt={painting.title} />
                    <div class="painting-card-info">
                        <h3>{painting.title}</h3>
                        <p>Price: {painting.price} $</p>
                        <p>Dimensions: {painting.dimensions}</p>
                    </div>
                    <div class="card-actions">
                        <button class="edit-painting-button" on:click={() => openEditModal(painting)}>Edit</button>
                        <button class="delete-painting-button" on:click={() => confirmDelete(painting)}>Delete</button>
                    </div>
                </div>
            {/each}
        </div>
    {/if}
</div>

{#if showFormModal}
    <div
        class="modal-overlay"
        on:click|self={() => { showFormModal = false; resetForm(); }}
        role="presentation" aria-hidden="true"
    >
        <div class="modal-content">
            <button class="close-button" on:click={() => { showFormModal = false; resetForm(); }} aria-label="Close modal">&times;</button>
            <h2>{isEditing ? 'Edit Painting' : 'Add New Painting'}</h2>

            {#if formError}
                <p class="messages error">{formError}</p>
            {/if}

            {#if formSuccess}
                <p class="messages success">{formSuccess}</p>
            {/if}

            <form on:submit|preventDefault={handleSubmitPainting}>
                <div>
                    <label for="title">Title:</label>
                    <input id="title" type="text" bind:value={title} required />
                </div>

                <div>
                    <label for="description">Description:</label>
                    <textarea id="description" bind:value={description}></textarea>
                </div>

                <div>
                    <label for="price">Price:</label>
                    <input id="price" type="number" min="0" step="any" bind:value={price} required />
                </div>

                <div>
                    <label for="dimensions">Dimensions (e.g., 100x70 cm):</label>
                    <input id="dimensions" type="text" bind:value={dimensions} required />
                </div>

                <div>
                    <label for="previewImage">Main Preview (for gallery):</label>
                    {#if existingPreviewImageUrl && !localPreviewImageUrl}
                        <div class="existing-image-preview">
                            <div class="existing-image-item">
                                <img src={existingPreviewImageUrl} alt="Current preview" class="existing-image-thumbnail" />
                            </div>
                        </div>
                        <small>Current image. Select a new one to replace.</small>
                    {:else if localPreviewImageUrl}
                        <img src={localPreviewImageUrl} alt="Local preview" class="local-preview-thumbnail" />
                        <small>Preview of new image.</small>
                    {/if}
                    <input
                        id="previewImage"
                        type="file"
                        accept="image/*"
                        on:change={(e) => {
                            const target = e.target;
                            if (target instanceof HTMLInputElement && target.files && target.files.length > 0) {
                                previewImageFile = target.files[0];
                                updateLocalImagePreview(previewImageFile, 'preview');
                            } else {
                                previewImageFile = null;
                                updateLocalImagePreview(null, 'preview');
                            }
                        }}
                    />
                    <small>{isEditing && !previewImageFile ? 'Leave empty to keep current.' : 'Required for new additions.'}</small>
                </div>

                <div>
                    <label for="hoverPreviewImage">Hover Preview (for gallery):</label>
                    {#if existingHoverPreviewImageUrl && !localHoverPreviewImageUrl}
                        <div class="existing-image-preview">
                            <div class="existing-image-item">
                                <img src={existingHoverPreviewImageUrl} alt="Current hover preview" class="existing-image-thumbnail" />
                            </div>
                        </div>
                        <small>Current image. Select a new one to replace.</small>
                    {:else if localHoverPreviewImageUrl}
                        <img src={localHoverPreviewImageUrl} alt="Local hover preview" class="local-preview-thumbnail" />
                        <small>Preview of new image.</small>
                    {/if}
                    <input
                        id="hoverPreviewImage"
                        type="file"
                        accept="image/*"
                        on:change={(e) => {
                            const target = e.target;
                            if (target instanceof HTMLInputElement && target.files && target.files.length > 0) {
                                hoverPreviewImageFile = target.files[0];
                                updateLocalImagePreview(hoverPreviewImageFile, 'hover');
                            } else {
                                hoverPreviewImageFile = null;
                                updateLocalImagePreview(null, 'hover');
                            }
                        }}
                    />
                    <small>{isEditing && !hoverPreviewImageFile ? 'Leave empty to keep current.' : 'Required for new additions.'}</small>
                </div>

                <div>
                    <label for="detailImages">Detail Images (2-3 items):</label>
                    {#if existingDetailImageUrls.length > 0}
                        <div class="existing-image-preview">
                            {#each existingDetailImageUrls as url (url)}
                                <div class="existing-image-item">
                                    <img src={url} alt="Current detail preview" class="existing-image-thumbnail" />
                                    <button type="button" class="remove-image-button" on:click={() => removeExistingDetailImage(url)} title="Remove">&times;</button>
                                </div>
                            {/each}
                        </div>
                        <small>Current images. You can remove them and add new ones.</small>
                    {/if}
                    <input
                        id="detailImages"
                        type="file"
                        accept="image/*"
                        multiple
                        on:change={handleDetailImagesChange}
                    />
                    <div class="local-detail-previews">
                        {#each localDetailImageUrls as url}
                            <img src={url} alt="Local detail preview" class="local-preview-thumbnail" />
                        {/each}
                    </div>
                    <small>You can upload new images. They will be added to existing ones if you don't remove them.</small>
                </div>

                <div>
                    <label for="saleFile">Sale File (PDF, DOC, etc.):</label>
                    {#if existingSaleFileUrl && !saleFile}
                        <p>Current file: <a href={existingSaleFileUrl} target="_blank" rel="noopener noreferrer">View Current File</a></p>
                        <small>Current file from Dropbox. Select a new one to replace.</small>
                    {/if}
                 <input
    id="saleFile"
    type="file"
    accept="image/png, image/jpeg, .png, .jpg, .jpeg" 
    on:change={handleSaleFileChange}
/>
                    <small>{isEditing && !saleFile ? 'Leave empty to keep current.' : 'Required for new additions.'}</small>
                </div>

                <button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (isEditing ? 'Updating...' : 'Saving...') : (isEditing ? 'Save Changes' : 'Add Painting')}
                </button>
            </form>
        </div>
    </div>
{/if}

{#if showDeleteConfirmModal}
    <div
        class="modal-overlay"
        on:click|self={() => (showDeleteConfirmModal = false)}
        role="presentation" aria-hidden="true"
    >
        <div class="modal-content confirm-modal-content">
            <button class="close-button" on:click={() => (showDeleteConfirmModal = false)} aria-label="Close modal">&times;</button>
            <h3>Delete Confirmation</h3>
            {#if deleteError}
                <p class="messages error">{deleteError}</p>
            {:else if deleteSuccess}
                <p class="messages success">{deleteSuccess}</p>
            {:else}
                <p>Are you sure you want to delete the painting **"{paintingToDelete?.title}"**?</p>
                <p>This action cannot be undone.</p>
            {/if}

            <div class="button-group">
                <button class="cancel-delete-btn" on:click={() => (showDeleteConfirmModal = false)} disabled={isDeleting}>
                    Cancel
                </button>
                <button class="confirm-delete-btn" on:click={executeDelete} disabled={isDeleting}>
                    {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
            </div>
        </div>
    </div>
{/if}