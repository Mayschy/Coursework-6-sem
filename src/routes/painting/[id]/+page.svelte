<script>
  import { invalidateAll } from '$app/navigation'; // Для обновления состояния корзины
  import { enhance } from '$app/forms'; // Если ты используешь Form Actions для корзины

  export let data; // Получаем данные из +page.server.js

  // Если у тебя нет page.server.js, то data будет приходить из layout.server.js,
  // и тогда тебе придется здесь делать fetch к API для деталей картины и проверки покупки.
  // Предполагаем, что data.painting и data.hasPurchased приходят из page.server.js

  let showModal = false;
  let successMessage = '';
  let errorMessage = '';

  // Функция для добавления в корзину (если ты используешь fetch напрямую, а не Form Actions)
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
        successMessage = 'Картина добавлена в корзину!';
        showModal = true;
        await invalidateAll(); // Обновляем данные layout (cartCount)
      } else {
        const errData = await res.json();
        errorMessage = errData.message || 'Ошибка добавления в корзину.';
        showModal = true;
      }
    } catch (e) {
      errorMessage = 'Ошибка сети при добавлении в корзину.';
      showModal = true;
      console.error(e);
    }
  }
</script>

<style>
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
  }

  .add-to-cart-btn, .download-btn {
    padding: 1rem 2rem;
    border: none;
    border-radius: 8px;
    font-size: 1.2rem;
    font-weight: bold;
    cursor: pointer;
    transition: background-color 0.3s ease, transform 0.2s ease;
  }

  .add-to-cart-btn {
    background-color: #28a745; /* Зеленый */
    color: white;
  }
  .add-to-cart-btn:hover {
    background-color: #218838;
    transform: translateY(-2px);
  }

  .download-btn {
    background-color: #007bff; /* Синий */
    color: white;
  }
  .download-btn:hover {
    background-color: #0056b3;
    transform: translateY(-2px);
  }

  /* Modal Styles */
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
  }

  .modal-content {
    background: white;
    padding: 2rem;
    border-radius: 10px;
    text-align: center;
    box-shadow: 0 5px 20px rgba(0, 0, 0, 0.2);
    min-width: 300px;
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

  .modal-content button {
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
    .add-to-cart-btn, .download-btn {
      width: 100%;
    }
  }
 .detail-images-gallery {
    margin-top: 2rem;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); /* Адаптивная сетка */
    gap: 1rem;
  }

  .detail-images-gallery img {
    width: 100%;
    height: auto;
    border-radius: 8px;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
    object-fit: cover; /* Чтобы изображения не искажались */
  }

  /* Добавь стили для адаптивности, если нужно */
  @media (max-width: 768px) {
    .detail-images-gallery {
      grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
      gap: 0.8rem;
    }
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
      <p>Размеры: {data.painting.dimensions}</p>
      <p class="price">{data.painting.price} $</p>
    </div>

    {#if data.painting.detailImages && data.painting.detailImages.length > 0}
      <div class="detail-images-gallery">
        {#each data.painting.detailImages as imageUrl}
          <img src={imageUrl} alt={`Детальное изображение картины ${data.painting.title}`} />
        {/each}
      </div>
    {/if}
    <div class="actions">
      {#if data.hasPurchased}
        <a href={data.painting.saleFileUrl} download class="download-btn">Скачать</a>
      {:else}
        <button on:click={addToCart} class="add-to-cart-btn">Добавить в корзину</button>
      {/if}
    </div>
  </div>
</div>

{#if showModal}
  {/if}