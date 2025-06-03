// D:\new store pj\artstore-svelte\src\hooks.server.js
import { getUserById } from '$lib/server/db';

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
    const userId = event.cookies.get('user_id');

    console.log('Hooks: Checking for user_id in cookies:', userId);

    if (userId) {
        try {
            const user = await getUserById(userId);

            console.log('Hooks: User found by ID:', !!user);

            if (user) {
                if (user.cart && Array.isArray(user.cart)) {
                    user.cart = user.cart.map(item => ({
                        ...item,
                        paintingId: item.paintingId.toString()
                    }));
                }

                event.locals.user = {
                    _id: user._id.toString(),
                    email: user.email,
                    name: user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    role: user.role,
                    cart: user.cart || []
                };
                console.log('Hooks: User set in locals.user:', event.locals.user.email);
            } else {
                event.cookies.delete('user_id', { path: '/' });
                event.locals.user = null;
                console.log('Hooks: User not found by ID, deleting cookie.');
            }
        } catch (e) {
            console.error('Hooks: Error fetching user from DB:', e);
            event.cookies.delete('user_id', { path: '/' });
            event.locals.user = null;
        }
    } else {
        event.locals.user = null;
        console.log('Hooks: No user_id cookie found. locals.user is null.');
    }

    return resolve(event);
    
}