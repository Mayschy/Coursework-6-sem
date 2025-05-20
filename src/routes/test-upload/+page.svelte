<script>
  let file;
  let title = '';
  let description = '';
  let price = '';
  let author = '';
  let error = '';
  let success = '';
  let isLoading = false;
  let imageUrl = '';  // URL загруженного изображения

  async function uploadImage() {
    if (!file) {
      error = 'Выберите файл изображения!';
      return null;
    }

    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();

      if (data.error) {
        error = data.error;
        return null;
      }

      return data.url;
    } catch (e) {
      error = 'Ошибка при загрузке изображения.';
      console.error(e);
      return null;
    }
  }

  async function submitPainting() {
    error = '';
    success = '';
    isLoading = true;

    const uploadedUrl = await uploadImage();
    if (!uploadedUrl) {
      isLoading = false;
      return;
    }

    imageUrl = uploadedUrl; // Показываем загруженное изображение

    const painting = {
      title,
      description,
      price: parseFloat(price),
      author,
      image: uploadedUrl,
      createdAt: new Date().toISOString()
    };

    try {
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
        // Очистка полей, кроме imageUrl (если хочешь очистить и изображение — ставь imageUrl = '')
        title = '';
        description = '';
        price = '';
        author = '';
        file = null;
      }
    } catch (e) {
      error = 'Ошибка при отправке данных';
      console.error(e);
    } finally {
      isLoading = false;
    }
  }
</script>

<h1>Добавить новую картину</h1>

{#if error}
  <p style="color: red;">{error}</p>
{/if}

{#if success}
  <p style="color: green;">{success}</p>
{/if}

<form on:submit|preventDefault={submitPainting}>

  <div>
    <label for="title">Название:</label>
    <input id="title" type="text" bind:value={title} required />
  </div>

  <div>
    <label for="description">Описание:</label>
    <textarea id="description" bind:value={description} required></textarea>
  </div>

  <div>
    <label for="price">Цена:</label>
    <input id="price" type="number" min="0" step="any" bind:value={price} required />
  </div>

  <div>
    <label for="author">Автор:</label>
    <input id="author" type="text" bind:value={author} required />
  </div>

  <div>
    <label for="imageFile">Изображение:</label>
    <input
      id="imageFile"
      type="file"
      accept="image/*"
      on:change={(e) => {
        const target = e.target;
        if (target instanceof HTMLInputElement && target.files && target.files.length > 0) {
          file = target.files[0];
        }
      }}
      required
    />
  </div>

  <button type="submit" disabled={isLoading}>
    {isLoading ? 'Сохраняем...' : 'Добавить картину'}
  </button>

</form>

{#if imageUrl}
  <h3>Загруженное изображение:</h3>
  <img src={imageUrl} alt="Загруженное изображение" style="max-width: 300px; border: 1px solid #ccc;" />
{/if}
