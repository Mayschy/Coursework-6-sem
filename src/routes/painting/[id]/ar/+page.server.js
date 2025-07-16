// src/routes/painting/[id]/ar/+page.server.js
import { error, redirect } from '@sveltejs/kit';
import { connectDB } from '$lib/server/db'; // Убедитесь, что это правильный путь к вашей функции connectDB
import { ObjectId } from 'mongodb'; // Убедитесь, что MongoDB ObjectId импортирован правильно

/** @type {import('./$types').PageServerLoad} */
export async function load({ params, locals }) {
    const paintingId = params.id;

    // Проверка на валидный ObjectId
    if (!ObjectId.isValid(paintingId)) {
        throw error(404, 'Painting not found.');
    }

    const db = await connectDB(); // Подключение к базе данных
    const painting = await db.collection('paintings').findOne({ _id: new ObjectId(paintingId) });

    if (!painting) {
        throw error(404, 'Painting not found for AR display.');
    }

    // Здесь, в отличие от главной страницы, мы не делаем проверку на isMobile
    // так как этот +page.server.js вызывается только когда уже решили, что это AR-маршрут.

    return {
        // Возвращаем данные о картине для компонента +page.svelte
        painting: {
            _id: painting._id.toString(),
            title: painting.title,
            description: painting.description || '',
            price: painting.price,
            previewImage: painting.previewImage,
            hoverPreviewImage: painting.hoverPreviewImage || '', // Может быть не нужно для AR
            detailImages: painting.detailImages || [], // Может быть не нужно для AR
            saleFileUrl: painting.saleFileUrl, // Может быть не нужно для AR
            dimensions: painting.dimensions, // Это важно для AR
        }
    };
}