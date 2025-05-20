<script>
  import { onMount } from "svelte";
  
  let currentIndex = 0;
  let slides = [
    "/ban.jpg",   // Путь к картинке в папке static
    "/image1.jpg",
    "/image2.jpg"
  ];

  let autoSlideInterval;

  // Функция переключения на следующий слайд
  const nextSlide = () => {
    currentIndex = (currentIndex + 1) % slides.length;
  };

  // Функция переключения на предыдущий слайд
  const prevSlide = () => {
    currentIndex = (currentIndex - 1 + slides.length) % slides.length;
  };

  // Запуск автопереключения слайдов
  const startAutoSlide = () => {
    autoSlideInterval = setInterval(nextSlide, 5000); // Переключение каждые 5 секунд
  };

  // Сброс автопереключения
  const resetAutoSlide = () => {
    clearInterval(autoSlideInterval);
    startAutoSlide();
  };

  onMount(() => {
    startAutoSlide();
  });
</script>

<section class="banner">
  <div 
    class="slider" 
    style="--slider-translate: translateX(-{currentIndex * 100}vw)"
  >
    {#each slides as slide, index}
      <img 
        src={slide} 
        alt={`Art ${index + 1}`} 
        class={currentIndex === index ? 'active' : ''}>
    {/each}
  </div>
  
  <!-- Кнопки для переключения слайдов -->
  <button class="prev" on:click={prevSlide}>&#10094;</button>
  <button class="next" on:click={nextSlide}>&#10095;</button>
</section>

<main>
  <h1>Discover the Beauty of Art</h1>
  <p>Hand-picked unique paintings for your collection.</p>
</main>
