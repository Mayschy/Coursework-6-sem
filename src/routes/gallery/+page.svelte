<script>
  import { onMount } from 'svelte';
  let paintings = [];
  let isLoading = true;
  let error = null;

  onMount(async () => {
    try {
      const res = await fetch('/api/paintings');
      if (!res.ok) throw new Error('Ошибка загрузки');
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
  }

  .gallery {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 2rem;
    padding: 2rem;
    box-sizing: border-box;
  }

  .painting-card-link {
    text-decoration: none;
    color: inherit;
  }

  .painting-card {
    background: #fff;
    border-radius: 1rem;
    overflow: hidden;
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
    transition: transform 0.3s ease, box-shadow 0.3s ease;
    cursor: pointer;
  }

  .painting-card:hover {
    transform: translateY(-10px);
    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.2);
  }

  .painting-card img {
    width: 100%;
    height: 250px;
    object-fit: cover;
    display: block;
  }

  .painting-card h3 {
    margin: 0.75rem 1rem 0.25rem;
    font-size: 1.2rem;
  }

  .painting-card p {
    margin: 0 1rem 1rem;
    font-size: 0.95rem;
    color: #555;
  }

  @media (max-width: 600px) {
    .painting-card img {
      height: 200px;
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
          <img src={painting.image} alt={painting.title} />
          <h3>{painting.title}</h3>
          <p>{painting.description}</p>
        </div>
      </a>
    {/each}
  </div>
{/if}
