<script lang="ts">
    import { onMount, onDestroy } from 'svelte'; // Добавляем onDestroy для очистки графиков
    // Удаляем: import { Bar, Line, Pie } from 'svelte5-chartjs';

    // Импортируем ChartJS и registerables для удобства регистрации всех нужных частей
    import { Chart as ChartJS, registerables, type ChartOptions } from 'chart.js';

    // Регистрируем все необходимые компоненты Chart.js ОДИН РАЗ
    ChartJS.register(...registerables); // Используем registerables для простой регистрации всего

    // --- Ваши существующие переменные ---
    let totalRevenue = 0;
    let totalOrders = 0;
    let avgOrderValue = 0;
    let topSellingProducts = [];
    let salesOverTime = [];

    let isLoading = true;
    let error = null;

    // Data for charts (эти переменные остаются такими же)
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
                tension: 0.4, // Line smoothing
            },
        ],
    };

    // Options for charts (эти переменные остаются такими же)
    const baseChartOptions: ChartOptions<'bar' | 'line'> = {
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

    let topProductsChartOptions: ChartOptions<'bar'> = JSON.parse(JSON.stringify(baseChartOptions));
    let salesOverTimeChartOptions: ChartOptions<'line'> = JSON.parse(JSON.stringify(baseChartOptions));

    // --- НОВЫЕ ПЕРЕМЕННЫЕ ДЛЯ ЭЛЕМЕНТОВ CANVAS И ЭКЗЕМПЛЯРОВ ГРАФИКОВ ---
    let topProductsCanvas: HTMLCanvasElement;
    let salesOverTimeCanvas: HTMLCanvasElement;
    let topProductsChartInstance: ChartJS<'bar'>;
    let salesOverTimeChartInstance: ChartJS<'line'>;

    // --- onMount и fetchData изменены для инициализации Chart.js ---
    onMount(async () => {
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

            // --- Инициализация графиков Chart.js после получения данных ---
            if (topProductsChartInstance) {
                // Если график уже существует, обновляем его данные
                topProductsChartInstance.data = topProductsChartData;
                topProductsChartInstance.options = topProductsChartOptions;
                topProductsChartInstance.update();
            } else if (topProductsCanvas) {
                // Если график еще не инициализирован, создаем новый
                topProductsChartInstance = new ChartJS(topProductsCanvas, {
                    type: 'bar', // Тип графика
                    data: topProductsChartData,
                    options: topProductsChartOptions,
                });
            }

            if (salesOverTimeChartInstance) {
                // Если график уже существует, обновляем его данные
                salesOverTimeChartInstance.data = salesOverTimeChartData;
                salesOverTimeChartInstance.options = salesOverTimeChartOptions;
                salesOverTimeChartInstance.update();
            } else if (salesOverTimeCanvas) {
                // Если график еще не инициализирован, создаем новый
                salesOverTimeChartInstance = new ChartJS(salesOverTimeCanvas, {
                    type: 'line', // Тип графика
                    data: salesOverTimeChartData,
                    options: salesOverTimeChartOptions,
                });
            }

        } catch (e) {
            console.error('Error loading statistics:', e);
            error = e.message;
        } finally {
            isLoading = false;
        }
    }

    // --- Очистка графиков при уничтожении компонента ---
    onDestroy(() => {
        if (topProductsChartInstance) {
            topProductsChartInstance.destroy();
        }
        if (salesOverTimeChartInstance) {
            salesOverTimeChartInstance.destroy();
        }
    });

    // NEW FUNCTION FOR ARCHIVING STATISTICS (остается без изменений)
    async function handleArchiveOld() {
        if (!confirm('Are you sure you want to archive all current completed orders? They will no longer be included in current statistics after this.')) {
            return;
        }

        isLoading = true;
        error = null;
        try {
            const response = await fetch('/api/admin/statistics/archive-old', {
                method: 'POST', // Use POST for data modification
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Archiving error: ${response.statusText}`);
            }

            const result = await response.json();
            alert(result.message); // Show success message

            // After successful archiving, reload statistics to reflect the "reset"
            await fetchData();

        } catch (e) {
            console.error('Error during archiving:', e);
            error = e.message;
            alert(`Failed to archive statistics: ${e.message}`);
        } finally {
            isLoading = false;
        }
    }
</script>

<style>
    /* Все ваши стили остаются без изменений */
    /* ... (ваш существующий блок <style>) ... */
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