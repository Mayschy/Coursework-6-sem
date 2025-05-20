<script>
  import { goto } from '$app/navigation';
  let form = {
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
    address: ''
  };
  let error = '';
  let success = false;

  async function register() {
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });

    const data = await res.json();

    if (!res.ok) {
      error = data.message || 'Ошибка при регистрации';
    } else {
      success = true;
      setTimeout(() => goto('/login'), 3000);
    }
  }
</script>

<style>
  form {
    max-width: 400px;
    margin: auto;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  input {
    padding: 10px;
    border: 1px solid #ccc;
    border-radius: 8px;
  }

  button {
    padding: 10px;
    background-color: #2e8b57;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
  }

  .success {
    color: green;
    text-align: center;
  }

  .error {
    color: red;
    text-align: center;
  }
</style>

<h2 style="text-align: center;">Регистрация нового пользователя</h2>

<form on:submit|preventDefault={register}>
  <input placeholder="Имя" bind:value={form.firstName} required />
  <input placeholder="Фамилия" bind:value={form.lastName} required />
  <input type="email" placeholder="Email" bind:value={form.email} required />
  <input type="password" placeholder="Пароль" bind:value={form.password} required />
  <input placeholder="Телефон" bind:value={form.phone} required />
  <input placeholder="Адрес" bind:value={form.address} required />
  <button type="submit">Зарегистрироваться</button>
</form>

{#if error}
  <p class="error">{error}</p>
{/if}

{#if success}
  <p class="success">Регистрация успешна! Перенаправление на страницу входа...</p>
{/if}
