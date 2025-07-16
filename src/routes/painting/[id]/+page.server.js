// src/routes/painting/[id]/+page.server.js
import { error, redirect } from '@sveltejs/kit'; // Добавлено 'redirect'
import { connectDB } from '$lib/server/db';
import { ObjectId } from 'mongodb';
import UAParser from 'ua-parser-js'; // Импортируем UAParser

export async function load({ params, locals, request }) { // Добавлен 'request' в аргументы
    const paintingId = params.id;

    // --- Обнаружение устройства ---
    const userAgentString = request.headers.get('user-agent');
    const parser = new UAParser(userAgentString);
    const device = parser.getDevice();

    const isMobile = device.type === 'mobile' || device.type === 'tablet'; // Считаем планшеты мобильными для AR
    // console.log(`User Agent: ${userAgentString}`); // Для отладки
    // console.log(`Is Mobile (via ua-parser-js): ${isMobile}`); // Для отладки

    if (isMobile) {
        // Перенаправляем на AR-страницу для мобильных устройств
        // Используем 302 (Found) как временное перенаправление
        throw redirect(302, `/painting/${paintingId}/ar`);
    }
    // --- Конец Обнаружения устройства ---


    // Продолжаем обычную логику загрузки данных для ПК
    if (!ObjectId.isValid(paintingId)) {
        throw error(404, 'Painting not found');
    }

    const db = await connectDB();
    const painting = await db.collection('paintings').findOne({ _id: new ObjectId(paintingId) });

    if (!painting) {
        throw error(404, 'Painting not found');
    }

    let hasPurchased = false;
    if (locals.user) {
        const userId = new ObjectId(locals.user._id);

        const userOrder = await db.collection('orders').findOne({
            userId: userId,
            status: 'completed',
            'items.paintingId': new ObjectId(paintingId)
        });

        if (userOrder) {
            hasPurchased = true;
        }
    }

    return {
        painting: {
            _id: painting._id.toString(),
            title: painting.title,
            description: painting.description || '',
            price: painting.price,
            previewImage: painting.previewImage,
            hoverPreviewImage: painting.hoverPreviewImage || '',
            detailImages: painting.detailImages || [],
            saleFileUrl: painting.saleFileUrl,
            dimensions: painting.dimensions,
        },
        hasPurchased: hasPurchased
    };
}