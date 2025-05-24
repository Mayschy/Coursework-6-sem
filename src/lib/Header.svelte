<script>
  // Принимаем проп data, который содержит user и cartCount
  export let data;
</script>

<style>
  /* ... (твои существующие стили для header, nav, nav-links и т.д.) ... */

  .cart-link {
    background-color: #6c757d; /* Серый */
    color: white;
    position: relative;
    padding: 0.5rem 1rem; /* Стандартный padding */
    padding-right: 2.5rem; /* Дополнительный padding для счетчика */
    border-radius: 0.5rem;
    text-decoration: none;
    font-weight: bold;
    transition: background-color 0.3s ease, color 0.3s ease;
  }

  .cart-link:hover {
    background-color: #5a6268;
  }

  .cart-count {
    position: absolute;
    top: -8px; /* Выше ссылки */
    right: -8px; /* Правее ссылки */
    background-color: #ffc107; /* Желтый */
    color: #333;
    font-size: 0.8em;
    font-weight: bold;
    border-radius: 50%; /* Круглая форма */
    padding: 0.2em 0.5em; /* Внутренние отступы */
    min-width: 1.5em; /* Минимальная ширина, чтобы выглядело как круг для однозначных чисел */
    text-align: center;
    line-height: 1; /* Выравнивание текста по вертикали */
    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
  }

  /* ... (мобильные стили, если есть) ... */
</style>

<header style="padding: 1rem 2rem; border-bottom: 1px solid #ccc;">
  <nav style="display: flex; justify-content: space-between; align-items: center;">

    <div style="flex: 1; display: flex; justify-content: center;">
      <ul style="display: flex; gap: 1.5rem; list-style: none; padding: 0; margin: 0;">
        <li><a href="/">Home</a></li>
        <li><a href="/gallery">Gallery</a></li>
        <li><a href="/about">About</a></li>
        <li><a href="/contact">Contact</a></li>
        <li><a href="/test-upload">Upload (Admin)</a></li>
        </ul>
    </div>

    <div style="display: flex; align-items: center; gap: 1rem;">
      {#if data?.user}
        <span>Привет, {data.user.firstName}!</span>
        <a href="/cart" class="cart-link">
          Корзина
          {#if data.cartCount > 0}
            <span class="cart-count">{data.cartCount}</span>
          {/if}
        </a>
        <a href="/logout" class="logout-btn">Выйти</a>
      {:else}
        <a href="/login" class="login-btn">
          <i class="fas fa-user"></i> Войти / Зарегистрироваться
        </a>
        <a href="/cart" class="cart-link">
          Корзина
          {#if data.cartCount > 0}
            <span class="cart-count">{data.cartCount}</span>
          {/if}
        </a>
      {/if}
    </div>
  </nav>
</header>