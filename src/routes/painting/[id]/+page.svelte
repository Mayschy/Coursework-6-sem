<script>
  export let data;
  const { painting } = data;
</script>

<h1>{painting.title}</h1>
<img src={painting.image} alt={painting.title} style="max-width: 500px;" />
<p><strong>Автор:</strong> {painting.author}</p>
<p><strong>Описание:</strong> {painting.description}</p>
<p><strong>Цена:</strong> {painting.price} руб.</p>
{#if painting.createdAt}
  <p><em>Создано: {new Date(painting.createdAt).toLocaleString()}</em></p>
{/if}
