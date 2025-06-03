<script>
    import { enhance } from '$app/forms';
    export let form;

    import { onMount } from 'svelte';
    onMount(() => {
        console.log('Login Page Loaded');
    });

    $: if (form) {
        console.log('Form data updated:', form);
        if (form.error) {
            console.error('Login error from server:', form.error);
        }
    }
</script>

<style>
    form {
        max-width: 400px;
        margin: auto;
        display: flex;
        flex-direction: column;
        gap: 15px;
        padding: 2rem;
        border: 1px solid #eee;
        border-radius: 1rem;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
        background: #fff;
    }

    input {
        padding: 12px;
        border: 1px solid #ccc;
        border-radius: 8px;
        font-size: 1rem;
    }

    button {
        padding: 12px;
        background-color: #007bff;
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-size: 1.1rem;
        transition: background-color 0.3s ease;
    }

    button:hover {
        background-color: #0056b3;
    }

    h2 {
        text-align: center;
        margin-bottom: 2rem;
        color: #333;
    }

    p {
        text-align: center;
        margin-top: 1rem;
    }

    a {
        color: #007bff;
        text-decoration: none;
    }

    a:hover {
        text-decoration: underline;
    }

    .error-message {
        color: red;
        text-align: center;
        margin-top: 1rem;
    }
</style>

<h2>Login</h2>

<form method="POST" use:enhance>
    <input type="email" name="email" placeholder="Email" value={form?.email ?? ''} required />
    <input type="password" name="password" placeholder="Password" required />
    <button type="submit">Log In</button>
</form>

{#if form?.error}
    <p class="error-message">{form.error}</p>
{/if}

<p>Don't have an account? <a href="/register">Register</a></p>