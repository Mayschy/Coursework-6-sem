<script>
  import { onMount } from 'svelte';
  let isLogin = true;
  let form = {
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
    address: ''
  };
  let error = '';
  
  async function submitForm() {
    const endpoint = isLogin ? '/api/login' : '/api/register';
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    if (!res.ok) {
      error = (await res.json()).message || 'Ошибка';
    } else {
      location.href = '/';
    }
  }
</script>

<h2>{isLogin ? 'Login' : 'Register'}</h2>

<form on:submit|preventDefault={submitForm}>
  {#if !isLogin}
    <input placeholder="First Name" bind:value={form.firstName} required />
    <input placeholder="Last Name" bind:value={form.lastName} required />
    <input placeholder="Phone" bind:value={form.phone} required />
    <input placeholder="Address" bind:value={form.address} required />
  {/if}
  <input type="email" placeholder="Email" bind:value={form.email} required />
  <input type="password" placeholder="Password" bind:value={form.password} required />
  <button type="submit">{isLogin ? 'Login' : 'Register'}</button>
</form>

<p style="color:red;">{error}</p>

{#if isLogin}
  <p>Нет аккаунта? <a href="/register">Зарегистрируйтесь</a></p>
{:else}
  <p>Уже есть аккаунт? <a href="/login">Войти</a></p>
{/if}
