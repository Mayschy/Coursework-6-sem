<script>
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { invalidateAll } from '$app/navigation';

    let cartItems = [];
    let isLoading = true;
    let error = '';
    let successMessage = '';
    let currentOrderId = null;
    let verificationCode = '';
    let showVerificationForm = false;
    let totalAmount = 0;

    async function fetchCart() {
        isLoading = true;
        error = '';
        try {
            const res = await fetch('/api/cart');
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Error loading cart');
            }
            const data = await res.json();
            cartItems = data.cart;
        } catch (e) {
            console.error('Error in fetchCart:', e);
            error = e.message;
            if (e.message === 'User not authorized') {
                goto('/login');
            }
        } finally {
            isLoading = false;
        }
    }

    async function removeFromCart(paintingId) {
        error = '';
        successMessage = '';
        try {
            const res = await fetch('/api/cart', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ paintingId })
            });

            const result = await res.json();
            if (!res.ok) {
                throw new Error(result.error || 'Error removing from cart');
            }
            successMessage = result.message;
            await fetchCart();
            await invalidateAll();
        } catch (e) {
            console.error('Error removing from cart:', e);
            error = e.message;
        }
    }

    async function checkout() {
        error = '';
        successMessage = '';
        if (cartItems.length === 0) {
            error = 'Your cart is empty.';
            return;
        }

        try {
            const res = await fetch('/api/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            const result = await res.json();
            if (!res.ok) {
                throw new Error(result.error || 'Error processing checkout');
            }
            
            successMessage = result.message;
            currentOrderId = result.orderId;
            showVerificationForm = true;
            
            await invalidateAll();
        } catch (e) {
            console.error('Error processing checkout:', e);
            error = e.message;
        }
    }

    async function verifyOrder() {
        error = '';
        successMessage = '';
        if (!verificationCode) {
            error = 'Please enter the verification code.';
            return;
        }
        if (!currentOrderId) {
            error = 'No active order to confirm.';
            return;
        }

        try {
            const res = await fetch('/api/checkout/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId: currentOrderId, verificationCode })
            });

            const result = await res.json();
            if (!res.ok) {
                throw new Error(result.error || 'Error confirming order');
            }
            successMessage = result.message;
            showVerificationForm = false;
            verificationCode = '';
            currentOrderId = null;
            goto('/'); 

        } catch (e) {
            console.error('Error verifying order:', e);
            error = e.message;
        }
    }

    $: {
        const calculatedTotal = cartItems.reduce((sum, item) => {
            const price = Number(item.painting?.price);
            const safePrice = isNaN(price) ? 0 : price;
            return sum + safePrice;
        }, 0);
        totalAmount = calculatedTotal;
    }

    onMount(() => {
        fetchCart();
    });
</script>

<style>
    .cart-container {
        max-width: 900px;
        margin: 2rem auto;
        padding: 1.5rem;
        background: #fff;
        border-radius: 1rem;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
    }

    h1 {
        text-align: center;
        font-size: 2.5rem;
        margin-bottom: 2rem;
        color: #333;
    }

    .cart-items {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
    }

    .cart-item {
        display: flex;
        align-items: center;
        gap: 1rem;
        border: 1px solid #eee;
        border-radius: 0.8rem;
        padding: 1rem;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    }

    .cart-item img {
        width: 100px;
        height: 100px;
        object-fit: cover;
        border-radius: 0.5rem;
    }

    .item-details {
        flex-grow: 1;
    }

    .item-details h3 {
        margin: 0 0 0.5rem;
        font-size: 1.2rem;
        color: #333;
    }

    .item-details p {
        margin: 0;
        font-size: 1rem;
        color: #555;
    }

    .item-actions {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .remove-button {
        padding: 0.5rem 0.8rem;
        background-color: #dc3545;
        color: white;
        border: none;
        border-radius: 0.5rem;
        cursor: pointer;
        transition: background-color 0.3s ease;
    }

    .remove-button:hover {
        background-color: #c82333;
    }

    .cart-summary {
        margin-top: 2rem;
        padding-top: 1.5rem;
        border-top: 1px dashed #ddd;
        text-align: right;
        font-size: 1.3rem;
        font-weight: bold;
        color: #333;
    }

    .checkout-button {
        display: block;
        width: fit-content;
        margin: 1.5rem 0 0 auto;
        padding: 1rem 2rem;
        background-color: #28a745;
        color: white;
        border: none;
        border-radius: 0.5rem;
        font-size: 1.2rem;
        cursor: pointer;
        transition: background-color 0.3s ease;
    }

    .checkout-button:hover:not(:disabled) {
        background-color: #218838;
    }

    .checkout-button:disabled {
        background-color: #cccccc;
        cursor: not-allowed;
    }

    .verification-form {
        margin-top: 2rem;
        padding: 1.5rem;
        border: 1px solid #ccc;
        border-radius: 1rem;
        background: #f0f8ff;
        text-align: center;
    }

    .verification-form h3 {
        margin-top: 0;
        color: #007bff;
    }

    .verification-form input {
        padding: 0.8rem;
        margin: 1rem 0;
        width: 200px;
        border: 1px solid #aaa;
        border-radius: 0.5rem;
        font-size: 1.1rem;
        text-align: center;
    }

    .verification-form button {
        padding: 0.8rem 1.5rem;
        background-color: #007bff;
        color: white;
        border: none;
        border-radius: 0.5rem;
        font-size: 1.1rem;
        cursor: pointer;
        transition: background-color 0.3s ease;
    }

    .verification-form button:hover {
        background-color: #0056b3;
    }

    .messages {
        text-align: center;
        margin-top: 1.5rem;
        font-size: 1.1rem;
    }

    .messages.error {
        color: red;
    }

    .messages.success {
        color: green;
    }
</style>

<div class="cart-container">
    <h1>Your Cart</h1>

    {#if isLoading}
        <p style="text-align:center;">Loading cart...</p>
    {:else if error}
        <p class="messages error">{error}</p>
    {:else if cartItems.length === 0 && !showVerificationForm}
        <p style="text-align:center;">Your cart is empty.</p>
    {:else}
        {#if !showVerificationForm}
            <div class="cart-items">
                {#each cartItems as item (item.painting._id)}
                    {#if item.painting}
                        <div class="cart-item">
                            <a href="/painting/{item.painting._id}">
                                <img src={item.painting.previewImage || '/placeholder.png'} alt={item.painting.title} />
                            </a>
                            <div class="item-details">
                                <h3>{item.painting.title}</h3>
                                <p>{item.painting.dimensions}</p>
                                <p>{item.painting.price} $</p>
                            </div>
                            <div class="item-actions">
                                <button class="remove-button" on:click={() => removeFromCart(item.painting._id)}>Remove</button>
                            </div>
                        </div>
                    {/if}
                {/each}
            </div>

            <div class="cart-summary">
                Total Amount: {totalAmount} $
            </div>
        {/if}

        {#if !showVerificationForm}
            <button class="checkout-button" on:click={checkout} disabled={cartItems.length === 0}>
                Checkout
            </button>
        {/if}
    {/if}

    {#if showVerificationForm}
        <div class="verification-form">
            <h3>Order Confirmation</h3>
            <p>{successMessage || 'A verification code has been sent to your email. Please enter it below.'}</p>
            <input type="text" placeholder="Enter code" bind:value={verificationCode} />
            <button on:click={verifyOrder}>Confirm</button>
            {#if error}
                <p class="messages error">{error}</p>
            {/if}
            {#if successMessage && !error}
                <p class="messages success">{successMessage}</p>
            {/if}
        </div>
    {/if}

    {#if successMessage && !showVerificationForm}
        <p class="messages success">{successMessage}</p>
    {/if}
</div>