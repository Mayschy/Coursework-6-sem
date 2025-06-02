<script>
  import { onMount } from 'svelte';

  // Змінна для керування видимістю модального вікна
  let showUploadModal = false;

  let title = '';
  let description = '';
  let price = '';
  let dimensions = '';

  let previewImageFile;
  let hoverPreviewImageFile;
  let detailImageFiles = [];
  let saleFileUrl = '';

  let error = '';
  let success = '';
  let isLoading = false;

  // Локальні URL для попереднього перегляду перед завантаженням на Cloudinary
  let localPreviewImageUrl = '';
  let localHoverPreviewImageUrl = '';
  let localDetailImageUrls = [];

  // Функції для оновлення локальних прев'ю зображень
  function updateLocalImagePreview(file, type) {
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        // Перевіряємо, чи результат є рядком перед присвоєнням
        if (typeof e.target.result === 'string') {
          if (type === 'preview') localPreviewImageUrl = e.target.result;
          if (type === 'hover') localHoverPreviewImageUrl = e.target.result;
        } else {
          // Обробка помилки або попередження, якщо результат не рядок (маловірогідно для readAsDataURL)
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
    // Створюємо тимчасові URL для локального попереднього перегляду
    localDetailImageUrls = detailImageFiles.map(file => URL.createObjectURL(file));
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
      console.error(`Помилка при завантаженні ${file.name} до Cloudinary:`, e);
      error = `Помилка при завантаженні зображення "${file.name}": ${e.message}`;
      return null;
    }
  }

  async function submitPainting() {
    error = '';
    success = '';
    isLoading = true;

    // Очищаємо локальні прев'ю після початку завантаження
    localPreviewImageUrl = '';
    localHoverPreviewImageUrl = '';
    localDetailImageUrls = [];

    let uploadedPreviewUrl = null;
    let uploadedHoverPreviewUrl = null;
    let uploadedDetailImageUrls = [];

    try {
      uploadedPreviewUrl = await uploadFileToCloudinary(previewImageFile, 'artstore_previews');
      if (!uploadedPreviewUrl) {
        isLoading = false;
        return;
      }

      uploadedHoverPreviewUrl = await uploadFileToCloudinary(hoverPreviewImageFile, 'artstore_hover_previews');
      if (!uploadedHoverPreviewUrl) {
        isLoading = false;
        return;
      }

      for (const file of detailImageFiles) {
        const url = await uploadFileToCloudinary(file, 'artstore_details');
        if (url) {
          uploadedDetailImageUrls.push(url);
        } else {
          isLoading = false;
          return;
        }
      }

      const painting = {
        title,
        description,
        price: parseFloat(price),
        dimensions,
        previewImage: uploadedPreviewUrl,
        hoverPreviewImage: uploadedHoverPreviewUrl,
        detailImages: uploadedDetailImageUrls,
        saleFileUrl,
        createdAt: new Date().toISOString()
      };

      const res = await fetch('/api/paintings', { // Переконайтеся, що цей API-маршрут існує і обробляє збереження даних картини
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(painting)
      });

      const data = await res.json();

      if (!res.ok) {
        error = data.error || 'Помилка при збереженні картини';
      } else {
        success = 'Картина успішно додана!';
        // Очищаємо поля форми
        title = '';
        description = '';
        price = '';
        dimensions = '';
        previewImageFile = null;
        hoverPreviewImageFile = null;
        detailImageFiles = [];
        saleFileUrl = '';

        // Закриваємо модальне вікно через деякий час
        setTimeout(() => {
          showUploadModal = false;
          success = ''; // Очистити повідомлення про успіх після закриття
        }, 2000);
      }
    } catch (e) {
      error = e.message || 'Виникла непередбачена помилка';
      console.error(e);
    } finally {
      isLoading = false;
    }
  }

  // Логіка для закриття модального вікна при натисканні Escape
  function closeOnEscape(event) {
    if (event.key === 'Escape') {
      showUploadModal = false;
    }
  }

  // Додаємо/видаляємо слухача подій залежно від стану `showUploadModal`
  $: if (showUploadModal) {
    window.addEventListener('keydown', closeOnEscape);
  } else {
    window.removeEventListener('keydown', closeOnEscape);
    // Очищаємо стан при закритті модалки, щоб форма була чистою при наступному відкритті
    title = '';
    description = '';
    price = '';
    dimensions = '';
    previewImageFile = null;
    hoverPreviewImageFile = null;
    detailImageFiles = [];
    saleFileUrl = '';
    error = '';
    success = '';
    isLoading = false;
    localPreviewImageUrl = '';
    localHoverPreviewImageUrl = '';
    localDetailImageUrls = [];
  }
</script>

<style>
  /* Стилі для основного вмісту сторінки (адмін-панелі) */
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
    margin-top: 1rem; /* Відступ від заголовка */
  }

  .admin-button:hover {
    background-color: #0056b3;
  }

  /* Стилі для модального вікна */
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
    z-index: 1000; /* Перекриває інші елементи */
  }

  .modal-content {
    background: #fff;
    padding: 2rem;
    border-radius: 1rem;
    box-shadow: 0 5px 20px rgba(0, 0, 0, 0.3);
    max-width: 700px; /* Трохи ширше для форми */
    width: 90%;
    max-height: 90vh; /* Обмеження висоти */
    overflow-y: auto; /* Прокрутка, якщо вміст більший */
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

  /* Стилі форми (застосовуються тільки всередині модального вікна) */
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
  .modal-content form input[type="url"] {
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

  .modal-content form button {
    display: block;
    width: 100%;
    padding: 0.8rem;
    margin-top: 1.5rem;
    background-color: #28a745; /* Зелена кнопка для "Додати" */
    color: white;
    border: none;
    border-radius: 0.5rem;
    font-size: 1rem;
    cursor: pointer;
    transition: background-color 0.3s ease;
  }

  .modal-content form button:hover:not(:disabled) {
    background-color: #218838;
  }

  .modal-content form button:disabled {
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

  /* Стилі для локальних прев'ю зображень */
  .local-preview-thumbnail {
    max-width: 80px;
    max-height: 80px;
    object-fit: contain;
    border: 1px solid #ddd;
    border-radius: 0.3rem;
    margin-top: 0.5rem;
    display: block;
  }

  .local-detail-previews {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }

  /* Приховуємо блок "Preview of Uploaded Images" */
  .image-preview-container {
    display: none;
  }
</style>

<div class="admin-panel-container">
  <h1>Адміністративна панель</h1>
  <p>Ласкаво просимо до панелі управління картинами. Тут ви можете додавати нові твори.</p>

  <button class="admin-button" on:click={() => (showUploadModal = true)}>
    Додати нову картину
  </button>
</div>
{#if showUploadModal}
  <div
    class="modal-overlay"
    on:click|self={() => (showUploadModal = false)}
    role="presentation" aria-hidden="true"  >
    <div class="modal-content">
      <button class="close-button" on:click={() => (showUploadModal = false)} aria-label="Закрити модальне вікно">&times;</button>
      <h2>Додати нову картину</h2>

      {#if error}
        <p class="messages error">{error}</p>
      {/if}

      {#if success}
        <p class="messages success">{success}</p>
      {/if}

      <form on:submit|preventDefault={submitPainting}>
        <div>
          <label for="title">Назва:</label>
          <input id="title" type="text" bind:value={title} required />
        </div>

        <div>
          <label for="description">Опис:</label>
          <textarea id="description" bind:value={description}></textarea>
        </div>

        <div>
          <label for="price">Ціна:</label>
          <input id="price" type="number" min="0" step="any" bind:value={price} required />
        </div>

        <div>
          <label for="dimensions">Розміри (наприклад, 100x70 см):</label>
          <input id="dimensions" type="text" bind:value={dimensions} required />
        </div>

        <div>
          <label for="previewImage">Основне прев'ю (для галереї):</label>
          <input
            id="previewImage"
            type="file"
            accept="image/*"
            on:change={(e) => {
              const target = e.target;
              if (target instanceof HTMLInputElement && target.files && target.files.length > 0) {
                previewImageFile = target.files[0];
                updateLocalImagePreview(previewImageFile, 'preview');
              }
            }}
            required
          />
          {#if localPreviewImageUrl}
            <img src={localPreviewImageUrl} alt="Локальне прев'ю" class="local-preview-thumbnail" />
          {/if}
        </div>

        <div>
          <label for="hoverPreviewImage">Прев'ю при наведенні (для галереї):</label>
          <input
            id="hoverPreviewImage"
            type="file"
            accept="image/*"
            on:change={(e) => {
              const target = e.target;
              if (target instanceof HTMLInputElement && target.files && target.files.length > 0) {
                hoverPreviewImageFile = target.files[0];
                updateLocalImagePreview(hoverPreviewImageFile, 'hover');
              }
            }}
            required
          />
          {#if localHoverPreviewImageUrl}
            <img src={localHoverPreviewImageUrl} alt="Локальне прев'ю при наведенні" class="local-preview-thumbnail" />
          {/if}
        </div>

        <div>
          <label for="detailImages">Детальні зображення (2-3 штуки):</label>
          <input
            id="detailImages"
            type="file"
            accept="image/*"
            multiple
            on:change={handleDetailImagesChange}
            required
          />
          <div class="local-detail-previews">
            {#each localDetailImageUrls as url}
              <img src={url} alt="Локальне детальне прев'ю" class="local-preview-thumbnail" />
            {/each}
          </div>
        </div>

        <div>
          <label for="saleFileUrl">Посилання на файл для продажу (Dropbox/Google Drive):</label>
          <input id="saleFileUrl" type="url" bind:value={saleFileUrl} placeholder="Наприклад, https://www.dropbox.com/s/abcdef/my_art.jpg?dl=0" required />
          <small>Завантажте файл у Dropbox/Google Drive та вставте публічне посилання тут.</small>
        </div>

        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Зберігаємо...' : 'Додати картину'}
        </button>
      </form>
    </div>
  </div>
{/if}