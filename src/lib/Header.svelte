<script>
  // Приймаємо проп data, який містить user і cartCount
  export let data;
</script>

<style>
  
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

 
  @media (max-width: 768px) {
    nav {
      flex-direction: column;
      gap: 1rem;
    }
    nav > div {
      width: 100%;
      justify-content: center; 
    }
    ul {
      flex-wrap: wrap;
      justify-content: center;
      gap: 0.8rem;
    }
  }
</style>

<header>
  <nav>
    <div style="flex: 1; display: flex; justify-content: center;">
      <ul>
        <li><a href="/">Home</a></li>
        <li><a href="/gallery">Gallery</a></li>
        <li><a href="/about">About</a></li>
        {#if data?.user?.role === 'admin'}
         <li><a href="/test-upload">Upload (Admin)</a></li>
        {/if}
      </ul>
    </div>

    <div style="display: flex; align-items: center; gap: 1rem;">
      {#if data?.user}
        <span>Привіт, {data.user.firstName}!</span>
        <a href="/cart" class="cart-link">
          Кошик
          {#if data.cartCount > 0}
            <span class="cart-count">{data.cartCount}</span>
          {/if}
        </a>
        <a href="/logout" class="logout-btn">Вийти</a>
      {:else}
        <a href="/login" class="login-btn">
          <i class="fas fa-user"></i> Увійти / Зареєструватися
        </a>
        <a href="/cart" class="cart-link">
          Кошик
          {#if data.cartCount > 0}
            <span class="cart-count">{data.cartCount}</span>
          {/if}
        </a>
      {/if}
    </div>
  </nav>
</header>