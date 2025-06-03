<script>
    import { onMount } from 'svelte';

    let paintings = [];
    let isLoading = true;
    let error = null;
    let sortType = 'none';

    onMount(async () => {
        try {
            const res = await fetch('/api/paintings');
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Failed to load');
            }
            paintings = await res.json();
        } catch (e) {
            error = e.message;
        } finally {
            isLoading = false;
        }
    });

    $: sortedPaintings = (() => {
        if (!paintings || paintings.length === 0) {
            return [];
        }

        let tempPaintings = [...paintings]; 

        switch (sortType) {
            case 'price-asc':
                tempPaintings.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
                break;
            case 'price-desc':
                tempPaintings.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
                break;
            case 'title-asc':
                tempPaintings.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
                break;
            case 'title-desc':
                tempPaintings.sort((a, b) => (b.title || '').localeCompare(a.title || ''));
                break;
            default:
        
                break;
        }
        return tempPaintings;
    })();
</script>

<style>
  
    h1 {
        text-align: center;
        font-size: 2.5rem;
        margin: 2rem 0 1rem;
        color: #333;
    }

    .gallery-header {
        display: flex;
        justify-content: space-between; 
        align-items: center;
        max-width: 1200px;
        margin: 0 auto;
        padding: 0 2rem; 
        margin-bottom: 1.5rem; 
    }

    .sort-controls {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .sort-controls label {
        font-size: 1rem;
        color: #555;
    }

    .sort-controls select {
        padding: 0.5rem 0.75rem;
        border: 1px solid #ccc;
        border-radius: 0.5rem;
        background-color: #fff;
        font-size: 1rem;
        cursor: pointer;
        outline: none;
        transition: border-color 0.3s ease, box-shadow 0.3s ease;
    }

    .sort-controls select:focus {
        border-color: #007bff;
        box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.25);
    }

    .gallery {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 2.5rem;
        padding: 2rem;
        box-sizing: border-box;
        max-width: 1200px;
        margin: 0 auto;
    }

    .painting-card-link {
        text-decoration: none;
        color: inherit;
        display: block;
    }

    .painting-card {
        background: #fff;
        border-radius: 1rem;
        overflow: hidden;
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
        transition: transform 0.3s ease, box-shadow 0.3s ease;
        cursor: pointer;
        position: relative;
    }

    .painting-card:hover {
        transform: translateY(-10px);
        box-shadow: 0 12px 30px rgba(0, 0, 0, 0.2);
    }

    .painting-card img {
        width: 100%;
        height: 280px;
        object-fit: cover;
        display: block;
        transition: opacity 0.3s ease;
    }

    .painting-card .preview-image {
        opacity: 1;
    }

    .painting-card .hover-image {
        position: absolute;
        top: 0;
        left: 0;
        opacity: 0;
    }

    .painting-card:hover .preview-image {
        opacity: 0;
    }

    .painting-card:hover .hover-image {
        opacity: 1;
    }

    .painting-info {
        padding: 1rem 1.2rem;
    }

    .painting-info h3 {
        margin: 0 0 0.5rem;
        font-size: 1.35rem;
        color: #333;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .painting-info p {
        margin: 0;
        font-size: 1rem;
        color: #666;
        height: 3em;
        overflow: hidden;
        text-overflow: ellipsis;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
    }

    .painting-info .price {
        font-size: 1.25rem;
        font-weight: bold;
        color: #007bff;
        margin-top: 0.75rem;
    }

    @media (max-width: 768px) {
        .gallery-header {
            flex-direction: column; 
            align-items: flex-start;
            gap: 1rem;
        }
        .gallery {
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 1.5rem;
        }
        .painting-card img {
            height: 220px;
        }
        .painting-info h3 {
            font-size: 1.2rem;
        }
        .painting-info p {
            font-size: 0.9rem;
        }
        .painting-info .price {
            font-size: 1.1rem;
        }
    }

    @media (max-width: 480px) {
        .gallery {
            grid-template-columns: 1fr;
            padding: 1rem;
        }
        .painting-card img {
            height: 250px;
        }
    }
</style>

<div class="gallery-header">
    <h1>Painting Gallery</h1>
    <div class="sort-controls">
        <label for="sort-select">Sort by:</label>
        <select id="sort-select" bind:value={sortType}>
            <option value="none">Default</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="title-asc">Title: A-Z</option>
            <option value="title-desc">Title: Z-A</option>
        </select>
    </div>
</div>

{#if isLoading}
    <p style="text-align:center;">Loading...</p>
{:else if error}
    <p style="text-align:center; color:red;">{error}</p>
{:else}
    <div class="gallery">
        {#each sortedPaintings as painting (painting._id)} <a href={`/painting/${painting._id}`} class="painting-card-link">
                <div class="painting-card">
                    {#if painting.previewImage}
                        <img src={painting.previewImage} alt={painting.title} class="preview-image" />
                    {:else}
                        <img src="/placeholder.png" alt="Placeholder" class="preview-image" />
                    {/if}

                    {#if painting.hoverPreviewImage}
                        <img src={painting.hoverPreviewImage} alt={painting.title} class="hover-image" />
                    {:else}
                        <img src={painting.previewImage || "/placeholder.png"} alt="Placeholder" class="hover-image" />
                    {/if}

                    <div class="painting-info">
                        <h3>{painting.title}</h3>
                        <p>{painting.description || 'Description not available.'}</p>
                        <p class="price">{painting.price} $</p>
                    </div>
                </div>
            </a>
        {/each}
    </div>
{/if}