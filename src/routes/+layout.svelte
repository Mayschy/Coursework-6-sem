<script>
  import '../styles/styles.css'; // Твои глобальные стили
  import Header from '$lib/Header.svelte';
  import Footer from '$lib/Footer.svelte';

  // Получаем data из +layout.server.js
  export let data;
</script>

<Header {data} />

<div class="wrapper">
  <slot></slot> </div>

<Footer />