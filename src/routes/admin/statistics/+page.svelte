<script>
    import { onMount, onDestroy, afterUpdate } from 'svelte';
    import { Chart as ChartJS, registerables } from 'chart.js';

    // Регистрируем все необходимые компоненты Chart.js ОДИН РАЗ
    ChartJS.register(...registerables);

    // --- Ваши существующие переменные ---
    let totalRevenue = 0;
    let totalOrders = 0;
    let avgOrderValue = 0;
    let topSellingProducts = [];
    let salesOverTime = [];

    let isLoading = true;
    let error = null;

    // Data for charts
    let topProductsChartData = {
        labels: [],
        datasets: [
            {
                label: 'Revenue (USDT)',
                backgroundColor: 'rgba(75, 192, 192, 0.6)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1,
                data: [],
            },
        ],
    };

    let salesOverTimeChartData = {
        labels: [],
        datasets: [
            {
                label: 'Total Revenue (USDT)',
                backgroundColor: 'rgba(153, 102, 255, 0.2)',
                borderColor: 'rgba(153, 102, 255, 1)',
                borderWidth: 2,
                pointBackgroundColor: 'rgba(153, 102, 255, 1)',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: 'rgba(153, 102, 255, 1)',
                data: [],
                tension: 0.4,
            },
        ],
    };

    // Options for charts
    const baseChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
            },
            title: {
                display: true,
                text: '',
            },
        },
    };

    let topProductsChartOptions = JSON.parse(JSON.stringify(baseChartOptions));
    let salesOverTimeChartOptions = JSON.parse(JSON.stringify(baseChartOptions));

    // --- НОВЫЕ ПЕРЕМЕННЫЕ ДЛЯ ЭЛЕМЕНТОВ CANVAS И ЭКЗЕМПЛЯРОВ ГРАФИКОВ ---
    let topProductsCanvas;
    let salesOverTimeCanvas;
    let topProductsChartInstance = null;
    let salesOverTimeChartInstance = null;

    // --- onMount и fetchData изменены для инициализации Chart.js ---
    onMount(async () => {
        console.log("onMount: Component mounted. Starting data fetch.");
        await fetchData();
    });

    async function fetchData() {
        isLoading = true;
        error = null;
        try {
            const [
                summaryRes,
                topProductsRes,
                salesOverTimeRes
            ] = await Promise.all([
                fetch('/api/admin/statistics/summary'),
                fetch('/api/admin/statistics/top-products'),
                fetch('/api/admin/statistics/sales-over-time')
            ]);

            if (!summaryRes.ok) throw new Error(`Summary data error: ${summaryRes.statusText}`);
            if (!topProductsRes.ok) throw new Error(`Top products error: ${topProductsRes.statusText}`);
            if (!salesOverTimeRes.ok) throw new Error(`Sales over time error: ${salesOverTimeRes.statusText}`);

            const summaryData = await summaryRes.json();
            const topProductsData = await topProductsRes.json();
            const salesOverTimeData = await salesOverTimeRes.json();

            totalRevenue = summaryData.totalRevenue || 0;
            totalOrders = summaryData.totalOrders || 0;
            avgOrderValue = summaryData.avgOrderValue || 0;

            topSellingProducts = topProductsData;
            topProductsChartData.labels = topProductsData.map(p => p.title);
            topProductsChartData.datasets[0].data = topProductsData.map(p => p.totalRevenue);
            topProductsChartOptions.plugins.title.text = 'Revenue from Top 10 Selling Paintings';
            topProductsChartData.datasets[0].label = 'Revenue (USDT)';

            salesOverTime = salesOverTimeData;
            salesOverTimeChartData.labels = salesOverTimeData.map(s => s._id);
            salesOverTimeChartData.datasets[0].data = salesOverTimeData.map(s => s.totalRevenue);
            salesOverTimeChartData.datasets[0].label = 'Total Monthly Revenue';
            salesOverTimeChartOptions.plugins.title.text = 'Total Revenue by Month';

            console.log("fetchData: Data received. Preparing to draw charts.");

        } catch (e) {
            console.error('Error loading statistics:', e);
            error = e.message;
        } finally {
            isLoading = false;
        }
    }

    // --- Используем afterUpdate для инициализации/обновления графиков ---
    afterUpdate(() => {
        console.log("afterUpdate: Running chart initialization/update logic.");

        if (!isLoading && !error && topProductsCanvas && salesOverTimeCanvas) {
            console.log("afterUpdate: Data loaded and canvases available.");

            // Топ-продукты (гистограмма)
            if (topProductsChartInstance) {
                console.log("afterUpdate: Updating existing Top Products chart.");
                topProductsChartInstance.data = topProductsChartData;
                topProductsChartInstance.options = topProductsChartOptions;
                topProductsChartInstance.update();
            } else {
                console.log("afterUpdate: Creating new Top Products chart.");
                topProductsChartInstance = new ChartJS(topProductsCanvas, {
                    type: 'bar',
                    data: topProductsChartData,
                    options: topProductsChartOptions,
                });
            }

            // Продажи по времени (линейный график)
            if (salesOverTimeChartInstance) {
                console.log("afterUpdate: Updating existing Sales Over Time chart.");
                salesOverTimeChartInstance.data = salesOverTimeChartData;
                salesOverTimeChartInstance.options = salesOverTimeChartOptions;
                salesOverTimeChartInstance.update();
            } else {
                console.log("afterUpdate: Creating new Sales Over Time chart.");
                salesOverTimeChartInstance = new ChartJS(salesOverTimeCanvas, {
                    type: 'line',
                    data: salesOverTimeChartData,
                    options: salesOverTimeChartOptions,
                });
            }
        } else {
            console.log("afterUpdate: Charts not initialized/updated. isLoading:", isLoading, "error:", error, "topProductsCanvas:", !!topProductsCanvas, "salesOverTimeCanvas:", !!salesOverTimeCanvas);
        }
    });

    // --- Очистка графиков при уничтожении компонента ---
    onDestroy(() => {
        console.log("onDestroy: Destroying chart instances.");
        if (topProductsChartInstance) {
            topProductsChartInstance.destroy();
            topProductsChartInstance = null;
        }
        if (salesOverTimeChartInstance) {
            salesOverTimeChartInstance.destroy();
            salesOverTimeChartInstance = null;
        }
    });

    // NEW FUNCTION FOR ARCHIVING STATISTICS
    async function handleArchiveOld() {
        if (!confirm('Вы уверены, что хотите заархивировать все текущие завершенные заказы? После этого они не будут учитываться в текущей статистике.')) {
            return;
        }

        isLoading = true;
        error = null;
        try {
            const response = await fetch('/api/admin/statistics/archive-old', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Ошибка архивирования: ${response.statusText}`);
            }

            const result = await response.json();
            alert(result.message);

            await fetchData();

        } catch (e) {
            console.error('Ошибка при архивировании:', e);
            error = e.message;
            alert(`Не удалось заархивировать статистику: ${e.message}`);
        } finally {
            isLoading = false;
        }
    }
</script>

<style>
    /* Общие стили для страницы */
    .statistics-page {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        padding: 20px;
        max-width: 1200px;
        margin: 40px auto;
        background-color: #f9f9f9;
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        color: #333;
    }

    h1 {
        text-align: center;
        color: #2c3e50;
        margin-bottom: 30px;
        font-size: 2.5em;
        font-weight: 600;
        letter-spacing: 0.05em;
    }

    h2 {
        color: #34495e;
        margin-top: 50px;
        margin-bottom: 25px;
        font-size: 1.8em;
        border-bottom: 2px solid #e0e0e0;
        padding-bottom: 10px;
    }

    /* Стиль для сообщений о загрузке/ошибке */
    .loading-message, .error-message {
        text-align: center;
        font-size: 1.2em;
        padding: 20px;
        border-radius: 8px;
        margin: 20px auto;
        max-width: 500px;
    }

    .loading-message {
        background-color: #e3f2fd;
        color: #1976d2;
    }

    .error-message {
        background-color: #ffebee;
        color: #d32f2f;
        border: 1px solid #ef9a9a;
    }

    /* KPI Cards (карточки с ключевыми показателями) */
    .kpi-cards {
        display: flex;
        justify-content: space-around;
        gap: 20px;
        margin-bottom: 40px;
        flex-wrap: wrap; /* Для адаптивности */
    }

    .kpi-card {
        background-color: #ffffff;
        padding: 25px 30px;
        border-radius: 10px;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
        text-align: center;
        flex: 1;
        min-width: 280px; /* Минимальная ширина карточки */
        transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
    }

    .kpi-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 6px 15px rgba(0, 0, 0, 0.1);
    }

    .kpi-card h3 {
        color: #555;
        font-size: 1.1em;
        margin-bottom: 10px;
    }

    .kpi-card p {
        font-size: 2.2em;
        font-weight: bold;
        color: #4CAF50; /* Зеленый для показателей */
        margin: 0;
    }

    /* Контейнер для графиков */
    .charts-container {
        display: flex;
        flex-wrap: wrap;
        gap: 30px;
        margin-bottom: 40px;
    }

    .chart-card {
        background-color: #ffffff;
        padding: 25px;
        border-radius: 10px;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
        flex: 1;
        min-width: calc(50% - 15px); /* Для двух колонок с учетом gap */
        height: 450px; /* ЭТО КРИТИЧЕСКИ ВАЖНО для отображения canvas! */
        display: flex;
        justify-content: center;
        align-items: center;
        position: relative; /* Важно для дочернего canvas */
    }

    /* Добавьте эти стили для canvas, если их нет, чтобы он заполнил родителя */
    canvas {
        max-width: 100%;
        max-height: 100%;
        width: 100% !important; /* Важно: !important может быть нужен для переопределения */
        height: 100% !important; /* Важно: !important может быть нужен для переопределения */
    }

    /* Кнопка архивирования */
    .archive-button-container {
        text-align: center;
        margin-top: 50px;
        margin-bottom: 60px;
        padding: 20px;
        background-color: #fffde7; /* Светло-желтый фон для предупреждения */
        border-left: 5px solid #ffeb3b;
        border-radius: 8px;
        box-shadow: 0 2px 5px rgba(0,0,0,0.05);
    }

    .archive-button {
        background-color: #ff5722; /* Оранжевый цвет для кнопки действия */
        color: white;
        padding: 12px 25px;
        border: none;
        border-radius: 6px;
        font-size: 1.1em;
        cursor: pointer;
        transition: background-color 0.3s ease, transform 0.1s ease;
        margin-bottom: 15px;
    }

    .archive-button:hover {
        background-color: #e64a19;
        transform: translateY(-2px);
    }

    .archive-button:active {
        transform: translateY(0);
    }

    .archive-button-description {
        color: #777;
        font-size: 0.9em;
        line-height: 1.5;
        max-width: 700px;
        margin: 0 auto;
    }

    /* Таблицы данных */
    .data-table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 20px;
        background-color: #ffffff;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        border-radius: 8px;
        overflow: hidden; /* Для border-radius */
    }

    .data-table th, .data-table td {
        padding: 15px;
        text-align: left;
        border-bottom: 1px solid #eee;
    }

    .data-table th {
        background-color: #f2f2f2;
        color: #555;
        font-weight: 600;
        text-transform: uppercase;
        font-size: 0.9em;
    }

    .data-table tbody tr:nth-child(even) {
        background-color: #fdfdfd;
    }

    .data-table tbody tr:hover {
        background-color: #f0f0f0;
        cursor: pointer;
    }

    /* Адаптивность для меньших экранов */
    @media (max-width: 768px) {
        .kpi-cards, .charts-container {
            flex-direction: column;
            align-items: center;
        }

        .kpi-card, .chart-card {
            min-width: 90%;
        }
    }
</style>

<div class="statistics-page">
    <h1>Admin Panel: Sales Statistics</h1>

    {#if isLoading}
        <p class="loading-message">Loading data...</p>
    {:else if error}
        <p class="error-message">Error loading data: {error}</p>
        <button on:click={fetchData}>Retry</button>
    {:else}
        <div class="kpi-cards">
            <div class="kpi-card">
                <h3>Total Revenue</h3>
                <p>{totalRevenue.toFixed(2)} USDT</p>
            </div>
            <div class="kpi-card">
                <h3>Total Orders</h3>
                <p>{totalOrders}</p>
            </div>
            <div class="kpi-card">
                <h3>Average Order Value</h3>
                <p>{avgOrderValue.toFixed(2)} USDT</p>
            </div>
        </div>

        <div class="charts-container">
            <div class="chart-card">
                <canvas bind:this={topProductsCanvas}></canvas>
            </div>

            <div class="chart-card">
                <canvas bind:this={salesOverTimeCanvas}></canvas>
            </div>
        </div>

        <div class="archive-button-container">
            <button class="archive-button" on:click={handleArchiveOld}>
                Archive Current Statistics
            </button>
            <p class="archive-button-description">
                This action will mark all existing "completed" orders as "archived".
                They will no longer be included in current statistical reports,
                but will remain in the database for historical record-keeping.
            </p>
        </div>

        <h2>Top 10 Selling Paintings (by Revenue)</h2>
        {#if topSellingProducts.length > 0}
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Painting Title</th>
                        <th>Total Sold</th>
                        <th>Total Revenue (USDT)</th>
                    </tr>
                </thead>
                <tbody>
                    {#each topSellingProducts as product}
                        <tr>
                            <td>{product.title}</td>
                            <td>{product.totalSold}</td>
                            <td>{product.totalRevenue.toFixed(2)}</td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        {:else}
            <p>No data for painting sales.</p>
        {/if}

        <h2 style="margin-top: 40px;">Revenue by Month</h2>
        {#if salesOverTime.length > 0}
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Month/Year</th>
                        <th>Total Revenue (USDT)</th>
                        <th>Number of Orders</th>
                    </tr>
                </thead>
                <tbody>
                    {#each salesOverTime as salesData}
                        <tr>
                            <td>{salesData._id}</td>
                            <td>{salesData.totalRevenue.toFixed(2)}</td>
                            <td>{salesData.totalOrders}</td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        {:else}
            <p>No data for sales by month.</p>
        {/if}
    {/if}
</div>