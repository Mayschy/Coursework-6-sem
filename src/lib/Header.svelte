<script>
  export let data;
</script>

<header style="padding: 1rem 2rem; border-bottom: 1px solid #ccc;">
  <nav style="display: flex; justify-content: space-between; align-items: center;">
    
    <!-- Центровка навигации -->
    <div style="flex: 1; display: flex; justify-content: center;">
      <ul style="display: flex; gap: 1.5rem; list-style: none; padding: 0; margin: 0;">
        <li><a href="/">Home</a></li>
        <li><a href="/gallery">Gallery</a></li>
        <li><a href="/about">About</a></li>
        <li><a href="/contact">Contact</a></li>
      </ul>
    </div>

    <!-- Блок справа -->
    <div style="display: flex; align-items: center; gap: 1rem;">
      {#if data?.user}
        <span>Привет, {data.user.firstName}!</span>
        <a href="/logout" class="logout-btn">Выйти</a>
      {:else}
        <a href="/login" class="login-btn">
          <i class="fas fa-user"></i> Login / Register
        </a>
      {/if}
    </div>
  </nav>
</header>
