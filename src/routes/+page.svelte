<script>
  import { onMount } from "svelte";
  
  let currentIndex = 0;
  let slides = [
    "/ban.jpg",
    "/image1.jpg",
    "/image2.jpg"
  ];

  let autoSlideInterval;

  const nextSlide = () => {
    currentIndex = (currentIndex + 1) % slides.length;
  };

  const prevSlide = () => {
    currentIndex = (currentIndex - 1 + slides.length) % slides.length;
  };

  const startAutoSlide = () => {
    autoSlideInterval = setInterval(nextSlide, 5000);
  };

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
  
  <button class="prev" on:click={prevSlide}>&#10094;</button>
  <button class="next" on:click={nextSlide}>&#10095;</button>
</section>

<main>
  <h1>Discover the Beauty of Art</h1>
  <p>Hand-picked unique paintings for your collection.</p>
</main>