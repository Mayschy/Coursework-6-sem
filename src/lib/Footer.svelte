<script>
    import { page } from '$app/stores';
    import { onMount } from 'svelte'; // onMount нам все еще нужен, если есть другая логика там, как fetchCart, но для window.addEventListener - нет.

    let showContactModal = false;

    let subject = '';
    let message = '';
    let error = '';
    let success = '';
    let isLoading = false;

    $: user = $page.data.session?.user; // Теперь это должно работать!
    $: userName = user?.name || ''; // Предполагается, что у user есть свойство 'name' (мы его добавили в hooks.server.js)
    $: userEmail = user?.email || '';

    function resetForm() {
        subject = '';
        message = '';
        error = '';
        success = '';
        isLoading = false;
    }

    function closeModal() {
        showContactModal = false;
        resetForm();
    }

    async function handleSubmit() {
        error = '';
        success = '';
        isLoading = true;

        if (!user) {
            error = 'Будь ласка, увійдіть, щоб надіслати повідомлення.';
            isLoading = false;
            return;
        }

        try {
            const res = await fetch('/api/contact-admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userName: userName,
                    userEmail: userEmail,
                    subject,
                    message
                })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Помилка при відправці повідомлення.');
            }

            success = 'Повідомлення успішно відправлено адміністраторам!';
            resetForm();
            setTimeout(() => {
                closeModal();
            }, 2000);

        } catch (e) {
            error = e.message || 'Виникла непередбачена помилка при відправці повідомлення.';
            console.error('Помилка відправки контакту:', e);
        } finally {
            isLoading = false;
        }
    }

    // --- Svelte Action для слушателя событий Escape ---
    // Эту функцию action можно использовать только на клиенте.
    function trapFocus(node) {
        function handleKeydown(event) {
            if (event.key === 'Escape') {
                closeModal();
            }
        }
        // Добавляем слушателя к самому узлу (modal-overlay)
        node.addEventListener('keydown', handleKeydown);

        // Возвращаем функцию очистки
        return {
            destroy() {
                node.removeEventListener('keydown', handleKeydown);
            }
        };
    }
    // --- КОНЕЦ Svelte Action ---

    // --- Отладочные логи для проверки `$page.data` ---
    onMount(() => {
        console.log('Footer Component Mounted:');
        console.log('Current $page.data:', $page.data);
        console.log('Current $page.data.session:', $page.data.session);
        console.log('Current user (from $page.data.session?.user):', user);
        console.log('Is user logged in (from user variable)?', !!user);
        console.log('Is contact button disabled?', !user);
    });
    // --- Конец отладочных логов ---

</script>

<style>
    /* ... (ваши стили без изменений) ... */

    footer {
        background-color: #333;
        color: #fff;
        padding: 1.5rem 1rem;
        text-align: center;
        margin-top: auto;
        position: relative;
        z-index: 1;
    }

    footer p {
        margin: 0.5rem 0;
        font-size: 0.9rem;
    }

    .contact-button {
        background-color: #007bff;
        color: white;
        border: none;
        padding: 0.7rem 1.5rem;
        border-radius: 0.5rem;
        cursor: pointer;
        font-size: 0.9rem;
        margin-top: 1rem;
        transition: background-color 0.3s ease;
    }

    .contact-button:hover {
        background-color: #0056b3;
    }

    .contact-button:disabled {
        background-color: #cccccc;
        cursor: not-allowed;
    }

    /* Стилі для модального вікна - перенесені з ContactModal.svelte */
    .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    }

    .modal-content {
        background: #fff;
        padding: 2rem;
        border-radius: 1rem;
        box-shadow: 0 5px 20px rgba(0, 0, 0, 0.3);
        max-width: 550px;
        width: 90%;
        max-height: 90vh;
        overflow-y: auto;
        position: relative;
        text-align: left;
    }

    .close-button {
        position: absolute;
        top: 1rem;
        right: 1rem;
        background: none;
        border: none;
        font-size: 2rem;
        cursor: pointer;
        color: #333;
        transition: color 0.2s ease;
    }

    .close-button:hover {
        color: #dc3545;
    }

    h2 {
        text-align: center;
        margin-bottom: 1.5rem;
        color: #333;
    }

    .user-info {
        text-align: center;
        margin-bottom: 1rem;
        font-size: 0.9rem;
        color: #666;
    }

    form div {
        margin-bottom: 1rem;
    }

    form label {
        display: block;
        margin-bottom: 0.4rem;
        font-weight: bold;
        color: #555;
        font-size: 0.95rem;
    }

    form input[type="text"],
    form textarea {
        width: calc(100% - 20px);
        padding: 8px;
        border: 1px solid #ccc;
        border-radius: 0.4rem;
        font-size: 0.9rem;
        box-sizing: border-box;
    }

    form textarea {
        min-height: 120px;
        resize: vertical;
    }

    form button {
        display: block;
        width: 100%;
        padding: 0.8rem;
        margin-top: 1.5rem;
        background-color: #007bff;
        color: white;
        border: none;
        border-radius: 0.5rem;
        font-size: 1rem;
        cursor: pointer;
        transition: background-color 0.3s ease;
    }

    form button:hover:not(:disabled) {
        background-color: #0056b3;
    }

    form button:disabled {
        background-color: #cccccc;
        cursor: not-allowed;
    }

    .messages {
        text-align: center;
        margin-bottom: 1rem;
        font-size: 1rem;
        padding: 0.5rem;
        border-radius: 0.5rem;
    }

    .messages.error {
        color: #721c24;
        background-color: #f8d7da;
        border-color: #f5c6cb;
    }

    .messages.success {
        color: #155724;
        background-color: #d4edda;
        border-color: #c3e6cb;
    }

    .login-link {
        color: #007bff;
        text-decoration: none;
        font-weight: bold;
    }

    .login-link:hover {
        text-decoration: underline;
    }
</style>
<footer>
    <p>Contact: +1 999 123-45-67 | info@artstore.com</p>
    <button
        class="contact-button"
        on:click={() => (showContactModal = true)}
        disabled={!$page.data.session?.user}
    >
        Зв'язатися з нами
    </button>
    <p>© 2025 ArtStore. All rights reserved.</p>

    {#if showContactModal}
        <div
            class="modal-overlay"
            on:click|self={closeModal}
            role="presentation"
            aria-hidden="true"
            use:trapFocus
        >
            <div class="modal-content">
                <button class="close-button" on:click={closeModal} aria-label="Закрити вікно контакту">&times;</button>
                <h2>Зв'язатися з адміністраторами</h2>

                {#if !user}
                    <p class="messages error">
                        Щоб надіслати повідомлення адміністраторам, будь ласка, <a href="/login" class="login-link">увійдіть</a>.
                    </p>
                {:else}
                    <p class="user-info">Від: **{userName}** ({userEmail})</p>
                {/if}

                {#if error}
                    <p class="messages error">{error}</p>
                {/if}

                {#if success}
                    <p class="messages success">{success}</p>
                {/if}

                <form on:submit|preventDefault={handleSubmit}>
                    <div>
                        <label for="subject">Тема повідомлення:</label>
                        <input id="subject" type="text" bind:value={subject} required disabled={!user} />
                    </div>

                    <div>
                        <label for="message">Ваше повідомлення:</label>
                        <textarea id="message" bind:value={message} required disabled={!user}></textarea>
                    </div>

                    <button type="submit" disabled={isLoading || !user}>
                        {isLoading ? 'Відправляємо...' : 'Надіслати повідомлення'}
                    </button>
                </form>
            </div>
        </div>
    {/if}
</footer>