<script>
    import { page } from '$app/stores';
    import { invalidateAll, goto } from '$app/navigation';

    $: user = $page.data.session?.user;
    $: cartCount = $page.data.session?.cartCount || 0;

    async function handleLogout() {
        try {
            const response = await fetch('/logout', { method: 'GET' });

            if (response.ok) {
                console.log('User logged out successfully. Invalidating data...');
                await invalidateAll();
                await goto('/');
            } else {
                console.error('Logout failed:', await response.text());
            }
        } catch (error) {
            console.error('Error during logout:', error);
        }
    }
</script>

<style>
    /* Ваши существующие стили для header и nav */
    header {
        background-color: #f7f7f7;
        padding: 1rem 0;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    nav {
        display: flex;
        justify-content: space-between;
        align-items: center;
        max-width: 1200px;
        margin: 0 auto;
        padding: 0 20px;
    }

    nav ul {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        gap: 1.5rem;
    }

    nav ul li a {
        text-decoration: none;
        color: #333;
        font-weight: 600;
        padding: 0.5rem 0.8rem;
        border-radius: 0.4rem;
        transition: background-color 0.3s ease, color 0.3s ease;
    }

    nav ul li a:hover {
        background-color: #e0e0e0;
        color: #000;
    }

    /* Изменения здесь: */

    .login-btn, .logout-btn {
        background-color: #8d9278; /* Ваш цвет */
        color: white;
        border: none;
        /* Убрали margin-right: 90px; - это вызывает проблемы с выравниванием */
        padding: 0.5rem 1rem;
        border-radius: 0.5rem;
        cursor: pointer;
        font-size: 0.9rem;
        font-weight: 600;
        text-decoration: none;
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        transition: background-color 0.3s ease;
        white-space: nowrap; /* Предотвращает перенос текста кнопки */
    }

    .login-btn:hover, .logout-btn:hover {
        background-color: #4b535c;
    }

    .cart-link {
        background-color: #6b6b5d; /* Ваш цвет */
        color: white;
        position: relative;
        padding: 0.5rem 1rem;
        padding-right: 2.5rem;
        border-radius: 0.5rem;
        text-decoration: none;
        font-weight: bold;
        transition: background-color 0.3s ease, color 0.3s ease;
        white-space: nowrap; /* Предотвращает перенос текста кнопки */
    }

    .cart-link:hover {
        background-color: #5a6268;
    }

    .cart-count {
        position: absolute;
        top: -8px;
        right: -8px;
        background-color: #ffc107;
        color: #333;
        font-size: 0.8em;
        font-weight: bold;
        border-radius: 50%;
        padding: 0.2em 0.5em;
        min-width: 1.5em;
        text-align: center;
        line-height: 1;
        box-shadow: 0 1px 3px rgba(0,0,0,0.2);
    }

    /* Медиа-запросы для мобильной адаптивности */
    @media (max-width: 768px) {
        nav {
            flex-direction: column; /* Навигация в колонку */
            gap: 1rem;
            align-items: stretch; /* Растянуть элементы на всю ширину */
        }
        nav > div {
            width: 100%;
            justify-content: center;
            /* Добавим gap для кнопок, если они в одной строке */
            gap: 0.8rem; /* Расстояние между элементами внутри flex-контейнера */
        }
        ul {
            flex-wrap: wrap;
            justify-content: center;
            gap: 0.8rem;
        }

        /* Специальные стили для контейнера с кнопками, когда пользователь НЕ авторизован */
        /* Применяем стили к div, который содержит Log In и Cart */
        .header-actions-unauthenticated { /* Добавьте этот класс в HTML */
            display: flex;
            flex-direction: column; /* Stack buttons vertically */
            gap: 10px; /* Space between stacked buttons */
            width: 100%; /* Take full width */
            align-items: center; /* Center buttons horizontally */
        }

        .login-btn, .cart-link {
            width: 80%; /* Задаем ширину, чтобы кнопки не были слишком узкими, но и не слишком широкими */
            max-width: 250px; /* Ограничиваем максимальную ширину */
            justify-content: center; /* Центрируем содержимое кнопки */
            margin-right: 0; /* Убираем специфичный margin-right */
        }

        /* Если пользователь залогинен, кнопки Cart и Logout могут остаться в строке, если они не накладываются */
        .header-actions-authenticated { /* Добавьте этот класс в HTML */
            display: flex;
            flex-direction: row; /* Keep them in a row */
            flex-wrap: wrap; /* Allow wrapping */
            gap: 10px; /* Space between buttons */
            justify-content: center;
            width: 100%;
        }

        .header-actions-authenticated > span {
            text-align: center;
            width: 100%; /* Чтобы приветствие занимало всю ширину */
        }
    }
</style>

<header>
    <nav>
        <div style="flex: 1; display: flex; justify-content: center;">
            <ul>
                <li><a href="/">Home</a></li>
                <li><a href="/gallery">Gallery</a></li>
                <li><a href="/about">About</a></li>
                {#if user?.role === 'admin'}
                    <li><a href="/test-upload">Upload (Admin)</a></li>
                    <li><a href="/admin/statistics">Statistics (Admin)</a></li>
                {/if}
            </ul>
        </div>

        {#if user}
            <div class="header-actions-authenticated">
                <span>Hello, {user.firstName || user.name}!</span>
                <a href="/cart" class="cart-link">
                    Cart
                    {#if cartCount > 0}
                        <span class="cart-count">{cartCount}</span>
                    {/if}
                </a>
                <button on:click={handleLogout} class="logout-btn">Log Out</button>
            </div>
        {:else}
            <div class="header-actions-unauthenticated">
                <a href="/login" class="login-btn">
                    <i class="fas fa-user"></i> Log In / Register
                </a>
                <a href="/cart" class="cart-link">
                    Cart
                    {#if cartCount > 0}
                        <span class="cart-count">{cartCount}</span>
                    {/if}
                </a>
            </div>
        {/if}
    </nav>
</header>