<main>
    <h1>About Us</h1>
    <p>Welcome to ArtStore, the best place for unique paintings.</p>

    <div class="content-section right-image">
        <div class="text-content">
            <p>
                At ArtStore, we believe that art should be accessible to everyone.
                We have curated a collection of works from talented artists around the world,
                offering you unique and inspiring pieces that will become
                the highlight of your home or office. Every painting in our gallery
                tells its own story, inviting you into a world of color, form, and emotion.
            </p>
            <p>
                Our mission is not just to sell paintings, but also to foster
                the development of artistic culture, supporting both established masters
                and emerging talents. We strive to create a platform where every
                art lover can find something special that resonates with their soul,
                bringing beauty and harmony into everyday life.
            </p>
        </div>
        <div class="image-container">
            <img src="/about1.jpg" alt="Image 1" />
        </div>
    </div>

    <div class="divider"></div>

    <div class="content-section left-image">
        <div class="image-container">
            <img src="/about2.jpg" alt="Image 2" />
        </div>
        <div class="text-content">
            <p>
                We are proud to offer not only aesthetic pleasure but also
                the highest quality. All paintings are carefully selected and undergo
                strict quality control to guarantee their authenticity and durability.
                We work directly with artists, which allows us to offer
                exclusive works at fair prices, bypassing intermediaries.
            </p>
            <p>
                Join the ArtStore community and discover a world
                where every brushstroke, every line, and every color is filled with meaning.
                Whether it's an abstraction, a landscape, or a portrait, you will find a piece
                that will inspire you and become a reflection of your individuality.
                Thank you for choosing ArtStore – your journey to art begins here.
            </p>
        </div>
    </div>
</main>

<style>
    main {
        max-width: 900px; 
        margin: 40px auto;
        padding: 20px;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
        color: #333;
        line-height: 1.6;
    }

    h1 {
        text-align: center;
        color: #555;
        font-size: 2.5em;
        margin-bottom: 30px;
        letter-spacing: 1px;
    }

    main > p { 
        text-align: center;
        font-size: 1.1em;
        margin-bottom: 50px;
        color: #666;
    }

    .content-section {
        display: flex;
        align-items: center;
        gap: 40px; 
        margin-bottom: 60px; 
    }

    .content-section .text-content {
        flex: 1;
        padding: 15px;
        background-color: rgba(255, 255, 255, 0.8); 
        border-radius: 8px;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05); 
    }

    .content-section .text-content p {
        margin-bottom: 15px;
        font-size: 1em;
        color: #444;
    }

    .content-section .text-content p:last-child {
        margin-bottom: 0;
    }

    .content-section .image-container {
        flex-shrink: 0; 
        width: 350px; 
        height: 350px; 
        overflow: hidden; 
        border-radius: 10px; 
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1); 
    }

    .content-section img {
        width: 100%;
        height: 100%;
        object-fit: cover; 
        display: block; 
    }

    .right-image {
        flex-direction: row-reverse; 
    }

    .left-image {
        flex-direction: row; 
    }

    .divider {
        width: 20%; 
        height: 3px;
        background-color: #333; 
        margin: 50px auto; 
        border-radius: 2px;
    }

    
    @media (max-width: 768px) {
        .content-section {
            flex-direction: column; 
            text-align: center;
        }

        .content-section .image-container {
            width: 80%; 
            max-width: 300px; 
            height: auto; 
            margin-bottom: 20px; 
        }

        .content-section .text-content {
            padding: 10px;
        }

        .right-image, .left-image {
            flex-direction: column; 
        }
    }
</style>