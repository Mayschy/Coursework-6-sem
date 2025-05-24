<script>
  import { onMount } from 'svelte';

  let title = '';
  let description = '';
  let price = '';
  let dimensions = ''; // Новое поле для размеров

  let previewImageFile; // Файл для базового превью
  let hoverPreviewImageFile; // Файл для превью при наведении
  let detailImageFiles = []; // Массив файлов для детальных изображений
  let saleFileUrl = ''; // URL файла для продажи (пока ручной ввод)

  let error = '';
  let success = '';
  let isLoading = false;

  // URLы загруженных изображений для предпросмотра
  let previewImageUrl = '';
  let hoverPreviewImageUrl = '';
  let detailImageUrls = [];

  // Функция для загрузки одного файла на Cloudinary
  async function uploadFileToCloudinary(file, folder) {
    if (!file) return null;

    const formData = new FormData();
    formData.append('image', file);
    formData.append('folder', folder); // Передаем имя папки

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
      console.error(`Ошибка при загрузке ${file.name} в Cloudinary:`, e);
      error = `Ошибка при загрузке изображения "${file.name}": ${e.message}`;
      return null;
    }
  }

  // Главная функция отправки картины
  async function submitPainting() {
    error = '';
    success = '';
    isLoading = true;

    // Сброс URL предпросмотра
    previewImageUrl = '';
    hoverPreviewImageUrl = '';
    detailImageUrls = [];

    let uploadedPreviewUrl = null;
    let uploadedHoverPreviewUrl = null;
    let uploadedDetailImageUrls = [];

    try {
      // 1. Загрузка основного превью
      uploadedPreviewUrl = await uploadFileToCloudinary(previewImageFile, 'artstore_previews');
      if (!uploadedPreviewUrl) {
        isLoading = false;
        return;
      }
      previewImageUrl = uploadedPreviewUrl; // Показываем загруженное изображение

      // 2. Загрузка превью при наведении
      uploadedHoverPreviewUrl = await uploadFileToCloudinary(hoverPreviewImageFile, 'artstore_hover_previews');
      if (!uploadedHoverPreviewUrl) {
        isLoading = false;
        return;
      }
      hoverPreviewImageUrl = uploadedHoverPreviewUrl; // Показываем загруженное изображение

      // 3. Загрузка детальных изображений
      for (const file of detailImageFiles) {
        const url = await uploadFileToCloudinary(file, 'artstore_details');
        if (url) {
          uploadedDetailImageUrls.push(url);
        } else {
          // Если одно из детальных изображений не загрузилось, можно решить, что делать:
          // либо прервать весь процесс, либо продолжить без этого изображения.
          // Здесь мы прерываем.
          isLoading = false;
          return;
        }
      }
      detailImageUrls = uploadedDetailImageUrls; // Показываем загруженные изображения

      // 4. Создание объекта картины
      const painting = {
        title,
        description,
        price: parseFloat(price),
        dimensions,
        previewImage: uploadedPreviewUrl,
        hoverPreviewImage: uploadedHoverPreviewUrl,
        detailImages: uploadedDetailImageUrls,
        saleFileUrl, // Используем URL, введенный вручную
        createdAt: new Date().toISOString()
      };

      // 5. Отправка данных картины на сервер
      const res = await fetch('/api/paintings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(painting)
      });

      const data = await res.json();

      if (!res.ok) {
        error = data.error || 'Ошибка при сохранении картины';
      } else {
        success = 'Картина успешно добавлена!';
        // Очистка полей формы
        title = '';
        description = '';
        price = '';
        dimensions = '';
        previewImageFile = null;
        hoverPreviewImageFile = null;
        detailImageFiles = [];
        saleFileUrl = '';
        // Очистка URL предпросмотра (если хочешь)
        previewImageUrl = '';
        hoverPreviewImageUrl = '';
        detailImageUrls = [];
        // Очистка input type="file" (требует прямого доступа к DOM или реактивных хаков)
        // Проще всего: пользователь перезагрузит страницу или мы обновим компонент
      }
    } catch (e) {
      error = e.message || 'Произошла непредвиденная ошибка';
      console.error(e);
    } finally {
      isLoading = false;
    }
  }

  // Обработчик для множественной загрузки файлов
  function handleDetailImagesChange(event) {
    detailImageFiles = Array.from(event.target.files);
  }
</script>

<style>
  h1 {
    text-align: center;
    margin-bottom: 2rem;
    color: #333;
  }

  form {
    max-width: 600px;
    margin: 0 auto;
    padding: 2rem;
    background: #f9f9f9;
    border-radius: 1rem;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
  }

  form div {
    margin-bottom: 1.5rem;
  }

  form label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: bold;
    color: #555;
  }

  form input[type="text"],
  form input[type="number"],
  form textarea {
    width: calc(100% - 20px); /* Учитываем padding */
    padding: 10px;
    border: 1px solid #ccc;
    border-radius: 0.5rem;
    font-size: 1rem;
    box-sizing: border-box; /* Важно для ширины */
  }

  form textarea {
    min-height: 100px;
    resize: vertical;
  }

  form input[type="file"] {
    display: block;
    margin-top: 0.5rem;
  }

  form button {
    display: block;
    width: 100%;
    padding: 1rem;
    background-color: #007bff;
    color: white;
    border: none;
    border-radius: 0.5rem;
    font-size: 1.1rem;
    cursor: pointer;
    transition: background-color 0.3s ease;
  }

  form button:hover:not(:disabled) {
    background-color: #0056b3;
  }

  form button:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
  }

  .messages {
    text-align: center;
    margin-top: 1.5rem;
    font-size: 1.1rem;
  }

  .messages.error {
    color: red;
  }

  .messages.success {
    color: green;
  }

  .image-preview-container {
    margin-top: 2rem;
    padding: 1rem;
    border: 1px solid #eee;
    border-radius: 0.8rem;
    background: #fff;
    box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  }

  .image-preview-container h3 {
    text-align: center;
    margin-bottom: 1rem;
    color: #444;
  }

  .image-preview-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
    gap: 1rem;
    justify-items: center;
  }

  .image-preview-grid img {
    max-width: 150px;
    max-height: 150px;
    object-fit: contain;
    border: 1px solid #ddd;
    border-radius: 0.5rem;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  }
</style>

<h1>Добавить новую картину</h1>

{#if error}
  <p class="messages error">{error}</p>
{/if}

{#if success}
  <p class="messages success">{success}</p>
{/if}

<form on:submit|preventDefault={submitPainting}>

  <div>
    <label for="title">Название:</label>
    <input id="title" type="text" bind:value={title} required />
  </div>

  <div>
    <label for="description">Описание:</label>
    <textarea id="description" bind:value={description}></textarea>
  </div>

  <div>
    <label for="price">Цена:</label>
    <input id="price" type="number" min="0" step="any" bind:value={price} required />
  </div>

  <div>
    <label for="dimensions">Размеры (например, 100x70 см):</label>
    <input id="dimensions" type="text" bind:value={dimensions} required />
  </div>

  <div>
    <label for="previewImage">Основное превью (для галереи):</label>
    <input
      id="previewImage"
      type="file"
      accept="image/*"
      on:change={(e) => {
        const target = e.target;
        if (target instanceof HTMLInputElement && target.files && target.files.length > 0) {
          previewImageFile = target.files[0];
        }
      }}
      required
    />
  </div>

  <div>
    <label for="hoverPreviewImage">Превью при наведении (для галереи):</label>
    <input
      id="hoverPreviewImage"
      type="file"
      accept="image/*"
      on:change={(e) => {
        const target = e.target;
        if (target instanceof HTMLInputElement && target.files && target.files.length > 0) {
          hoverPreviewImageFile = target.files[0];
        }
      }}
      required
    />
  </div>

  <div>
    <label for="detailImages">Детальные изображения (2-3 штуки):</label>
    <input
      id="detailImages"
      type="file"
      accept="image/*"
      multiple
      on:change={handleDetailImagesChange}
      required
    />
  </div>

  <div>
    <label for="saleFileUrl">URL файла для продажи (Dropbox/Google Drive):</label>
    <input id="saleFileUrl" type="url" bind:value={saleFileUrl} placeholder="Например, https://www.dropbox.com/s/abcdef/my_art.jpg?dl=0" required />
    <small>Загрузите файл в Dropbox/Google Drive и вставьте публичную ссылку здесь.</small>
  </div>

  <button type="submit" disabled={isLoading}>
    {isLoading ? 'Сохраняем...' : 'Добавить картину'}
  </button>

</form>

{#if previewImageUrl || hoverPreviewImageUrl || detailImageUrls.length > 0}
  <div class="image-preview-container">
    <h3>Предпросмотр загруженных изображений:</h3>
    <div class="image-preview-grid">
      {#if previewImageUrl}
        <img src={previewImageUrl} alt="Основное превью" />
      {/if}
      {#if hoverPreviewImageUrl}
        <img src={hoverPreviewImageUrl} alt="Превью при наведении" />
      {/if}
      {#each detailImageUrls as url}
        <img src={url} alt="Детальное изображение" />
      {/each}
    </div>
  </div>
{/if}