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

    .login-btn, .logout-btn {
        background-color: #8d9278;
        color: white;
        border: none;
        /* УДАЛИТЕ ЭТУ СТРОКУ, ОНА ВЫЗЫВАЕТ ПРОБЛЕМУ: margin-right: 90px; */
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
        white-space: nowrap; /* Добавлено, чтобы текст не переносился */
    }

    .login-btn:hover, .logout-btn:hover {
        background-color: #4b535c;
    }

    .cart-link {
        background-color: #6b6b5d;
        color: white;
        position: relative;
        padding: 0.5rem 1rem;
        padding-right: 2.5rem;
        border-radius: 0.5rem;
        text-decoration: none;
        font-weight: bold;
        transition: background-color 0.3s ease, color 0.3s ease;
        white-space: nowrap; /* Добавлено, чтобы текст не переносился */
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

    @media (max-width: 768px) {
        nav {
            flex-direction: column;
            gap: 1rem;
            align-items: stretch; /* Растянуть элементы на всю ширину */
        }
        
        /* Этот блок управляет контейнером с кнопками справа */
        nav > div:last-child { /* Целимся в последний div внутри nav */
            width: 100%; /* Занимаем всю ширину */
            justify-content: center; /* Центрируем содержимое */
            flex-wrap: wrap; /* Разрешаем элементам переноситься на новую строку */
            gap: 10px; /* ЭТОТ GAP СОЗДАСТ РАССТОЯНИЕ МЕЖДУ КНОПКАМИ */
            flex-direction: column; /* ЭТО КЛЮЧЕВОЕ ИЗМЕНЕНИЕ: кнопки будут в колонку */
            align-items: center; /* Центрируем кнопки по горизонтали, если они в колонке */
        }

        /* Дополнительные стили для самих кнопок на мобильных, чтобы они выглядели аккуратнее */
        .login-btn, .cart-link {
            width: 80%; /* Задаем ширину, чтобы кнопки не были слишком узкими, но и не слишком широкими */
            max-width: 280px; /* Ограничиваем максимальную ширину */
            justify-content: center; /* Центрируем содержимое кнопки */
        }

        ul {
            flex-wrap: wrap;
            justify-content: center;
            gap: 0.8rem;
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

        <div style="display: flex; align-items: center; gap: 1rem;">
            {#if user}
                <span>Hello, {user.firstName || user.name}!</span>
                <a href="/cart" class="cart-link">
                    Cart
                    {#if cartCount > 0}
                        <span class="cart-count">{cartCount}</span>
                    {/if}
                </a>
                <button on:click={handleLogout} class="logout-btn">Log Out</button>
            {:else}
                <a href="/login" class="login-btn">
                    <i class="fas fa-user"></i> Log In / Register
                </a>
                <a href="/cart" class="cart-link">
                    Cart
                    {#if cartCount > 0}
                        <span class="cart-count">{cartCount}</span>
                    {/if}
                </a>
            {/if}
        </div>
    </nav>
</header>