<script>
  import { onMount } from 'svelte';
  let paintings = [];
  let isLoading = true;
  let error = null;

  onMount(async () => {
    try {
      const res = await fetch('/api/paintings');
      if (!res.ok) {
        // Попытка получить ошибку из тела ответа
        const errorData = await res.json();
        throw new Error(errorData.error || 'Ошибка загрузки');
      }
      paintings = await res.json();
    } catch (e) {
      error = e.message;
    } finally {
      isLoading = false;
    }
  });
</script>

<style>
  h1 {
    text-align: center;
    font-size: 2.5rem;
    margin: 2rem 0 1rem;
    color: #333;
  }

  .gallery {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); /* Увеличил минимальный размер */
    gap: 2.5rem; /* Увеличил отступ */
    padding: 2rem;
    box-sizing: border-box;
    max-width: 1200px; /* Ограничим ширину галереи */
    margin: 0 auto; /* Центрируем */
  }

  .painting-card-link {
    text-decoration: none;
    color: inherit;
    display: block; /* Ссылка должна быть блочным элементом */
  }

  .painting-card {
    background: #fff;
    border-radius: 1rem;
    overflow: hidden;
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
    transition: transform 0.3s ease, box-shadow 0.3s ease;
    cursor: pointer;
    position: relative; /* Для позиционирования изображений */
  }

  .painting-card:hover {
    transform: translateY(-10px);
    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.2);
  }

  .painting-card img {
    width: 100%;
    height: 280px; /* Увеличил высоту для лучшего отображения */
    object-fit: cover;
    display: block;
    transition: opacity 0.3s ease; /* Для эффекта при наведении */
  }

  .painting-card .preview-image {
    opacity: 1;
  }

  .painting-card .hover-image {
    position: absolute;
    top: 0;
    left: 0;
    opacity: 0;
  }

  .painting-card:hover .preview-image {
    opacity: 0;
  }

  .painting-card:hover .hover-image {
    opacity: 1;
  }

  .painting-info {
    padding: 1rem 1.2rem; /* Увеличил внутренние отступы */
  }

  .painting-info h3 {
    margin: 0 0 0.5rem;
    font-size: 1.35rem; /* Увеличил размер шрифта */
    color: #333;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .painting-info p {
    margin: 0;
    font-size: 1rem; /* Увеличил размер шрифта */
    color: #666;
    height: 3em; /* Ограничение высоты для описания */
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2; /* Отображает 2 строки, затем обрезает */
    -webkit-box-orient: vertical;
  }

  .painting-info .price {
    font-size: 1.25rem;
    font-weight: bold;
    color: #007bff;
    margin-top: 0.75rem;
  }

  @media (max-width: 768px) {
    .gallery {
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1.5rem;
    }
    .painting-card img {
      height: 220px;
    }
    .painting-info h3 {
      font-size: 1.2rem;
    }
    .painting-info p {
      font-size: 0.9rem;
    }
    .painting-info .price {
      font-size: 1.1rem;
    }
  }

  @media (max-width: 480px) {
    .gallery {
      grid-template-columns: 1fr;
      padding: 1rem;
    }
    .painting-card img {
      height: 250px;
    }
  }
</style>

<h1>Галерея картин</h1>

{#if isLoading}
  <p style="text-align:center;">Загрузка...</p>
{:else if error}
  <p style="text-align:center; color:red;">{error}</p>
{:else}
  <div class="gallery">
    {#each paintings as painting}
      <a href={`/painting/${painting._id}`} class="painting-card-link">
        <div class="painting-card">
          {#if painting.previewImage}
            <img src={painting.previewImage} alt={painting.title} class="preview-image" />
          {:else}
            <img src="/placeholder.png" alt="Заглушка" class="preview-image" />
          {/if}

          {#if painting.hoverPreviewImage}
            <img src={painting.hoverPreviewImage} alt={painting.title} class="hover-image" />
          {:else}
            <img src={painting.previewImage || "/placeholder.png"} alt="Заглушка" class="hover-image" />
          {/if}

          <div class="painting-info">
            <h3>{painting.title}</h3>
            <p>{painting.description || 'Описание отсутствует.'}</p>
            <p class="price">{painting.price} $</p>
          </div>
        </div>
      </a>
    {/each}
  </div>
{/if}