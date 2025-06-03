<script>
    import '../styles/styles.css';
    import Header from '$lib/Header.svelte';
    import Footer from '$lib/Footer.svelte';

    export let data; 
</script>

<Header /> 

<div class="wrapper">
    <slot></slot>
</div>

<Footer {data} />