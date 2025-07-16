<script>
    import { invalidateAll } from '$app/navigation';

    export let data;

    let showModal = false; // Для модального окна "Добавить в корзину"
    let successMessage = '';
    let errorMessage = '';

    // Новые переменные для модального окна примерки
    let showTryOnModal = false;
    let uploadedWallImage = null; // Будет хранить объект File для загруженного изображения стены
    let canvasElement; // Ссылка на HTML-элемент canvas
    let ctx; // Контекст 2D для canvas

    let paintingImage; // Объект Image для картины
    let wallImage;     // Объект Image для загруженной стены

    // Позиция и размер картины на стене
    let paintingX = 50; // Начальная X-позиция
    let paintingY = 50; // Начальная Y-позиция
    let paintingWidth = 200; // Начальная ширина
    let paintingHeight; // Будет рассчитана из пропорций

    let isDragging = false;
    let startX, startY;
    let offsetX, offsetY;

    // Загрузка изображения картины при открытии модального окна
    $: if (showTryOnModal && data.painting.previewImage && !paintingImage) {
        paintingImage = new Image();
        paintingImage.src = data.painting.previewImage;
        paintingImage.onload = () => {
            if (paintingImage.width && data.painting.dimensions) {
                // Извлекаем размеры картины из строки "ШиринаxВысота cm"
                const dims = data.painting.dimensions.split('x').map(s => parseFloat(s.trim()));
                if (dims.length === 2 && !isNaN(dims[0]) && !isNaN(dims[1]) && dims[0] > 0) {
                    const aspectRatio = dims[1] / dims[0]; // Высота / Ширина
                    paintingHeight = paintingWidth * aspectRatio; // Сохраняем пропорции
                } else {
                    // Fallback если размеры не удалось распарсить
                    paintingHeight = paintingWidth * (paintingImage.height / paintingImage.width);
                }
            } else {
                 paintingHeight = paintingWidth * (paintingImage.height / paintingImage.width);
            }
            drawCanvas();
        };
    }

    async function addToCart() {
        errorMessage = '';
        successMessage = '';
        try {
            const res = await fetch('/api/cart', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ paintingId: data.painting._id })
            });

            if (res.ok) {
                successMessage = 'Painting added to cart!';
                showModal = true;
                await invalidateAll();
            } else {
                const errData = await res.json();
                errorMessage = errData.message || 'Error adding to cart.';
                showModal = true;
            }
        } catch (e) {
            errorMessage = 'Network error when adding to cart.';
            showModal = true;
            console.error(e);
        }
    }

    // --- Логика для примерки на стене ---

    function openTryOnModal() {
        showTryOnModal = true;
        // Сбросить состояние при открытии, если нужно
        uploadedWallImage = null;
        wallImage = null;
        paintingX = 50;
        paintingY = 50;
        paintingWidth = 200;
        paintingHeight = undefined; // Пересчитается
    }

    function closeTryOnModal() {
        showTryOnModal = false;
    }

    function handleWallImageUpload(event) {
        const file = event.target.files[0];
        if (file) {
            uploadedWallImage = file;
            const reader = new FileReader();
            reader.onload = (e) => {
                wallImage = new Image();
                wallImage.src = e.target.result;
                wallImage.onload = () => {
                    // Устанавливаем размеры canvas по размеру загруженного изображения
                    canvasElement.width = wallImage.width;
                    canvasElement.height = wallImage.height;
                    drawCanvas();
                };
            };
            reader.readAsDataURL(file);
        }
    }

    function drawCanvas() {
        if (!ctx) { // Инициализируем контекст только один раз
            ctx = canvasElement.getContext('2d');
        }

        // Очищаем canvas
        ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);

        // Рисуем изображение стены (если загружено)
        if (wallImage) {
            ctx.drawImage(wallImage, 0, 0, canvasElement.width, canvasElement.height);
        } else {
             // Если нет стены, можно нарисовать серый фон или инструкцию
            ctx.fillStyle = '#f0f0f0';
            ctx.fillRect(0, 0, canvasElement.width, canvasElement.height);
            ctx.fillStyle = '#666';
            ctx.font = '24px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('Загрузите фото вашей стены', canvasElement.width / 2, canvasElement.height / 2);
        }


        // Рисуем картину (если загружена)
        if (paintingImage && paintingHeight !== undefined) {
            ctx.drawImage(paintingImage, paintingX, paintingY, paintingWidth, paintingHeight);
        }
    }

    // Логика перетаскивания и изменения размера
    function getMousePos(canvas, evt) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: evt.clientX - rect.left,
            y: evt.clientY - rect.top
        };
    }

    function handleMouseDown(event) {
        if (!wallImage || !paintingImage || paintingHeight === undefined) return;

        const mousePos = getMousePos(canvasElement, event);
        // Проверяем, попали ли мы мышью в картину
        if (mousePos.x >= paintingX && mousePos.x <= paintingX + paintingWidth &&
            mousePos.y >= paintingY && mousePos.y <= paintingY + paintingHeight) {
            isDragging = true;
            startX = mousePos.x;
            startY = mousePos.y;
            offsetX = mousePos.x - paintingX;
            offsetY = mousePos.y - paintingY;
            canvasElement.style.cursor = 'grabbing';
        }
    }

    function handleMouseMove(event) {
        if (!isDragging) return;
        const mousePos = getMousePos(canvasElement, event);
        paintingX = mousePos.x - offsetX;
        paintingY = mousePos.y - offsetY;
        drawCanvas();
    }

    function handleMouseUp() {
        isDragging = false;
        canvasElement.style.cursor = 'grab';
    }

    // Логика изменения размера колесиком мыши (масштабирование)
    function handleMouseWheel(event) {
        if (!wallImage || !paintingImage || paintingHeight === undefined) return;
        event.preventDefault(); // Предотвращаем прокрутку страницы

        const scaleFactor = 1.1; // Коэффициент масштабирования
        const mousePos = getMousePos(canvasElement, event);

        // Проверяем, находится ли курсор над картиной
        if (mousePos.x >= paintingX && mousePos.x <= paintingX + paintingWidth &&
            mousePos.y >= paintingY && mousePos.y <= paintingY + paintingHeight) {

            // Рассчитываем новую ширину и высоту
            let newWidth, newHeight;
            if (event.deltaY < 0) { // Колесико вверх (увеличение)
                newWidth = paintingWidth * scaleFactor;
            } else { // Колесико вниз (уменьшение)
                newWidth = paintingWidth / scaleFactor;
            }

            // Ограничиваем минимальный и максимальный размер
            newWidth = Math.max(50, Math.min(newWidth, canvasElement.width * 0.9));

            // Сохраняем пропорции
            const currentAspectRatio = paintingImage.height / paintingImage.width;
            newHeight = newWidth * currentAspectRatio;

            // Центрируем масштабирование относительно курсора
            paintingX = mousePos.x - (newWidth / paintingWidth) * (mousePos.x - paintingX);
            paintingY = mousePos.y - (newHeight / paintingHeight) * (mousePos.y - paintingY);

            paintingWidth = newWidth;
            paintingHeight = newHeight;
            drawCanvas();
        }
    }

    // Сохранение изображения
    function savePreviewImage() {
        if (!canvasElement || !wallImage) {
            alert('Сначала загрузите фото стены и разместите картину!');
            return;
        }
        const dataURL = canvasElement.toDataURL('image/png'); // Можно выбрать 'image/jpeg'
        const link = document.createElement('a');
        link.download = `preview_${data.painting.title.replace(/\s+/g, '_')}.png`;
        link.href = dataURL;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

</script>

<style>
    /* Существующие стили */
    .painting-detail {
        display: flex;
        gap: 2rem;
        max-width: 1000px;
        margin: 2rem auto;
        background: #fff;
        padding: 2rem;
        border-radius: 10px;
        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
    }
    .painting-image {
        flex: 1;
        min-width: 300px;
    }
    .painting-image img {
        max-width: 100%;
        height: auto;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    .painting-info {
        flex: 1;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
    }
    .painting-info h1 {
        font-size: 2.5rem;
        color: #333;
        margin-bottom: 1rem;
    }
    .painting-info p {
        font-size: 1.1rem;
        color: #666;
        margin-bottom: 0.5rem;
        line-height: 1.6;
    }
    .painting-info .price {
        font-size: 2rem;
        color: #007bff;
        font-weight: bold;
        margin-top: 1.5rem;
        margin-bottom: 1.5rem;
    }
    .actions {
        display: flex;
        gap: 1rem;
        margin-top: 1.5rem;
        flex-wrap: wrap; /* Для кнопок на маленьких экранах */
    }

    .add-to-cart-btn, .try-on-btn, .download-btn {
        padding: 1rem 2rem;
        border: none;
        border-radius: 8px;
        font-size: 1.2rem;
        font-weight: bold;
        cursor: pointer;
        transition: background-color 0.3s ease, transform 0.2s ease;
    }

    .add-to-cart-btn {
        background-color: #28a745;
        color: white;
    }
    .add-to-cart-btn:hover {
        background-color: #218838;
        transform: translateY(-2px);
    }

    .try-on-btn {
        background-color: #007bff;
        color: white;
    }
    .try-on-btn:hover {
        background-color: #0056b3;
        transform: translateY(-2px);
    }

    .download-btn {
        background-color: #6c757d; /* Серый цвет для кнопки сохранения */
        color: white;
    }
    .download-btn:hover {
        background-color: #5a6268;
        transform: translateY(-2px);
    }

    /* Модальные окна */
    .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.6);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
        padding: 1rem; /* Отступ по краям */
        box-sizing: border-box; /* Учитываем padding в размере */
    }

    .modal-content {
        background: white;
        padding: 2rem;
        border-radius: 10px;
        text-align: center;
        box-shadow: 0 5px 20px rgba(0, 0, 0, 0.2);
        max-width: 90%; /* Ограничение ширины */
        max-height: 90%; /* Ограничение высоты */
        overflow-y: auto; /* Прокрутка, если контент не помещается */
        min-width: 300px;
        display: flex;
        flex-direction: column;
        align-items: center;
    }

    .modal-content h3 {
        margin-bottom: 1rem;
        color: #333;
    }

    .modal-content .success-text {
        color: #28a745;
    }

    .modal-content .error-text {
        color: #dc3545;
    }

    .modal-content button { /* Кнопки внутри модального окна */
        margin-top: 1.5rem;
        padding: 0.8rem 1.5rem;
        background-color: #007bff;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        transition: background-color 0.3s ease;
    }

    .modal-content button:hover {
        background-color: #0056b3;
    }

    /* Стили для модального окна примерки */
    .try-on-modal-content {
        max-width: 1200px; /* Увеличим для canvas */
        width: 100%;
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
    }

    .try-on-modal-content input[type="file"] {
        margin-bottom: 1rem;
    }

    .try-on-canvas-container {
        width: 100%;
        /* Максимальная высота, чтобы canvas не был слишком большим */
        max-height: 600px;
        overflow: auto; /* Для скролла, если изображение стены очень большое */
        border: 1px solid #ddd;
        border-radius: 8px;
        box-shadow: inset 0 0 5px rgba(0,0,0,0.05);
        display: flex; /* Для центрирования canvas внутри */
        justify-content: center;
        align-items: center;
        background-color: #e9e9e9;
        cursor: grab; /* Курсор для перетаскивания */
    }

    canvas {
        display: block; /* Убираем лишние отступы */
        background-color: white; /* Фон canvas */
        max-width: 100%; /* Гарантируем, что canvas впишется в контейнер */
        height: auto; /* Сохраняем пропорции */
    }

    /* Адаптивные стили */
    @media (max-width: 768px) {
        .painting-detail {
            flex-direction: column;
            margin: 1rem;
            padding: 1rem;
        }
        .actions {
            flex-direction: column;
            gap: 0.8rem;
        }
        .add-to-cart-btn, .download-btn, .try-on-btn {
            width: 100%;
        }
        .modal-content {
            padding: 1rem;
        }
        .try-on-modal-content {
            padding: 1rem;
        }
    }
    .detail-images-gallery {
        margin-top: 2rem;
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 1rem;
    }

    .detail-images-gallery img {
        width: 100%;
        height: auto;
        border-radius: 8px;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
        object-fit: cover;
    }

    @media (max-width: 768px) {
        .detail-images-gallery {
            grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
            gap: 0.8rem;
        }
    }
</style>

<div class="painting-detail">
    <div class="painting-image">
        <img src={data.painting.previewImage} alt={data.painting.title} />
    </div>
    <div class="painting-info">
        <div>
            <h1>{data.painting.title}</h1>
            <p>{data.painting.description}</p>
            <p>Dimensions: {data.painting.dimensions}</p>
            <p class="price">{data.painting.price} $</p>
        </div>

        {#if data.painting.detailImages && data.painting.detailImages.length > 0}
            <div class="detail-images-gallery">
                {#each data.painting.detailImages as imageUrl}
                    <img src={imageUrl} alt={`Detail image of ${data.painting.title}`} />
                {/each}
            </div>
        {/if}
        <div class="actions">
            <button on:click={addToCart} class="add-to-cart-btn">Add to Cart</button>
            <button on:click={openTryOnModal} class="try-on-btn">Примерить на стене</button>
        </div>
    </div>
</div>

{#if showModal}
    <div class="modal-overlay" on:click={() => (showModal = false)}>
        <div class="modal-content" on:click|stopPropagation>
            {#if successMessage}
                <h3 class="success-text">Success!</h3>
                <p>{successMessage}</p>
            {:else if errorMessage}
                <h3 class="error-text">Error!</h3>
                <p>{errorMessage}</p>
            {/if}
            <button on:click={() => (showModal = false)}>Close</button>
        </div>
    </div>
{/if}

{#if showTryOnModal}
    <div class="modal-overlay" on:click={closeTryOnModal}>
        <div class="modal-content try-on-modal-content" on:click|stopPropagation>
            <h3>Примерка картины на стене</h3>
            <p>Загрузите фото вашей стены, а затем перетащите и измените размер картины.</p>
            <input type="file" accept="image/*" on:change={handleWallImageUpload} />

            <div class="try-on-canvas-container">
                <canvas
                    bind:this={canvasElement}
                    on:mousedown={handleMouseDown}
                    on:mousemove={handleMouseMove}
                    on:mouseup={handleMouseUp}
                    on:mouseleave={handleMouseUp}
                    on:wheel={handleMouseWheel}
                ></canvas>
            </div>

            <div class="actions" style="margin-top: 0; justify-content: center;">
                <button on:click={savePreviewImage} class="download-btn">Сохранить результат</button>
                <button on:click={closeTryOnModal}>Закрыть</button>
            </div>
        </div>
    </div>
{/if}