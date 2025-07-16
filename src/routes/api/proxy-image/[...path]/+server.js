import { error } from '@sveltejs/kit';

export async function GET({ params, request }) {
    // Реконструируем оригинальный URL изображения Cloudinary
    // params.path будет содержать остаток пути после /api/proxy-image/
    // Например, если запрос /api/proxy-image/v12345/my_image.jpg,
    // то params.path будет "v12345/my_image.jpg"
    // Вам нужно будет убедиться, что ваша клиентская часть отправляет
    // корректный путь Cloudinary, который можно прикрепить к базовому URL Cloudinary.
    // Пример: Cloudinary URL: https://res.cloudinary.com/your_cloud_name/image/upload/v12345/my_image.jpg
    // Ваш прокси URL: /api/proxy-image/v12345/my_image.jpg
    const cloudinaryBaseUrl = 'https://res.cloudinary.com/da5pw6alz/image/upload/'; // <--- !!! ОБНОВИТЕ: Вставьте ваше 'cloud name' сюда !!!

    const originalImageUrl = `${cloudinaryBaseUrl}${params.path}`;

    console.log(`Proxying request for: ${originalImageUrl}`);

    try {
        const response = await fetch(originalImageUrl, {
            headers: {
                // Опционально: можно передать некоторые заголовки клиента,
                // чтобы Cloudinary мог их обработать (например, User-Agent)
                'User-Agent': request.headers.get('User-Agent') || 'SvelteKit-Image-Proxy',
                // Если Cloudinary требует авторизацию или специальные заголовки,
                // их нужно будет добавить здесь.
            }
        });

        if (!response.ok) {
            console.error(`Failed to fetch from Cloudinary: ${response.status} - ${response.statusText}`);
            throw error(response.status, `Failed to fetch image from external source: ${response.statusText}`);
        }

        // Ключевые заголовки для предотвращения "tainted canvas" и правильного кэширования
        const headers = new Headers(response.headers); // Копируем оригинальные заголовки
        headers.set('Access-Control-Allow-Origin', '*'); // Разрешаем всем доменам доступ (для чистоты canvas)
        headers.set('Cache-Control', 'public, max-age=31536000'); // Агрессивное кэширование, т.к. картинки из Cloudinary редко меняются

        // Убедимся, что Content-Type правильно установлен
        const contentType = response.headers.get('Content-Type') || 'application/octet-stream';
        headers.set('Content-Type', contentType);

        return new Response(response.body, { headers });

    } catch (e) {
        console.error('Image proxy error:', e);
        // Если это ошибка сети или что-то другое, не связанное с HTTP-статусом ответа
        throw error(500, `Image proxy error: ${e.message}`);
    }
}