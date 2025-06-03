<script lang="ts">
    import { onMount } from 'svelte';
    import { Bar, Line, Pie } from 'svelte5-chartjs';
    import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement } from 'chart.js';
    import type { ChartOptions } from 'chart.js';

    // Register necessary Chart.js components
    ChartJS.register(
        CategoryScale,
        LinearScale,
        BarElement,
        Title,
        Tooltip,
        Legend,
        ArcElement,
        PointElement,
        LineElement
    );

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
                tension: 0.4, // Line smoothing
            },
        ],
    };

    // Options for charts
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


        } catch (e) {
            console.error('Error loading statistics:', e);
            error = e.message;
        } finally {
            isLoading = false;
        }
    }

    // NEW FUNCTION FOR ARCHIVING STATISTICS
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
    /* Existing styles */
    .kpi-cards {
        display: flex;
        justify-content: space-around;
        gap: 20px;
        margin-bottom: 40px;
        flex-wrap: wrap;
    }

    .kpi-card {
        background-color: #f0f0f0;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        text-align: center;
        flex: 1;
        min-width: 200px;
    }

    .kpi-card h3 {
        margin-top: 0;
        color: #333;
        font-size: 1.2em;
    }

    .kpi-card p {
        font-size: 1.8em;
        font-weight: bold;
        color: #007bff;
        margin: 0;
    }

    .charts-container {
        display: flex;
        flex-wrap: wrap;
        gap: 20px;
        margin-bottom: 40px;
    }

    .chart-card {
        background-color: #f0f0f0;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        flex: 1;
        min-width: 45%; /* Adjust as needed */
        height: 400px; /* Fixed height for charts */
        display: flex;
        justify-content: center;
        align-items: center;
    }

    .data-table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 20px;
        background-color: #f0f0f0;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        border-radius: 8px;
        overflow: hidden; /* Ensures rounded corners */
    }

    .data-table th, .data-table td {
        border: 1px solid #ddd;
        padding: 12px;
        text-align: left;
    }

    .data-table th {
        background-color: #e0e0e0;
        font-weight: bold;
    }

    .data-table tbody tr:nth-child(even) {
        background-color: #f9f9f9;
    }

    .statistics-page {
        padding: 20px;
        max-width: 1200px;
        margin: 20px auto;
        background-color: #fff;
        border-radius: 10px;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    }

    h1, h2 {
        text-align: center;
        color: #333;
        margin-bottom: 30px;
    }

    .loading-message, .error-message {
        text-align: center;
        font-size: 1.2em;
        padding: 20px;
        color: #555;
    }

    .error-message {
        color: #dc3545;
    }

    .statistics-page button {
        background-color: #007bff;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 5px;
        cursor: pointer;
        font-size: 1em;
        transition: background-color 0.3s ease;
    }

    .statistics-page button:hover {
        background-color: #0056b3;
    }

    /* NEW STYLES FOR THE ARCHIVE BUTTON */
    .archive-button-container {
        text-align: center;
        margin-top: 30px;
        margin-bottom: 50px; /* Add bottom margin */
    }

    .archive-button {
        background-color: #dc3545; /* Red color for reset/archive button */
        color: white;
        border: none;
        padding: 12px 25px;
        border-radius: 5px;
        cursor: pointer;
        font-size: 1.1em;
        font-weight: bold;
        transition: background-color 0.3s ease, transform 0.2s ease;
    }

    .archive-button:hover {
        background-color: #c82333;
        transform: translateY(-2px); /* Slight hover effect */
    }

    .archive-button-description {
        font-size: 0.9em;
        color: #666;
        margin-top: 10px;
        max-width: 600px;
        margin-left: auto;
        margin-right: auto;
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
                <Bar data={topProductsChartData} options={topProductsChartOptions} />
            </div>

            <div class="chart-card">
                <Line data={salesOverTimeChartData} options={salesOverTimeChartOptions} />
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