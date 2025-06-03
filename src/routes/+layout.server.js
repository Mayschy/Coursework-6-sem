// D:\new store pj\artstore-svelte\src\routes\+layout.server.js
import { connectDB } from '$lib/server/db';
import { ObjectId } from 'mongodb';

export async function load({ locals }) {
  let userForSession = null; 
  let calculatedCartCount = 0;

  if (locals.user) {
    userForSession = locals.user;

    if (userForSession.cart && Array.isArray(userForSession.cart)) {
      calculatedCartCount = userForSession.cart.length;
    } else {
      const db = await connectDB();
      const userDataWithCart = await db.collection('users').findOne(
        { _id: new ObjectId(userForSession._id) },
        { projection: { cart: 1 } }
      );

      if (userDataWithCart && userDataWithCart.cart && Array.isArray(userDataWithCart.cart)) {
        userForSession.cart = userDataWithCart.cart.map(item => ({
          ...item,
          paintingId: item.paintingId.toString()
        }));
        calculatedCartCount = userForSession.cart.length;
      } else {
        userForSession.cart = []; 
        calculatedCartCount = 0;
      }
    }
  }

  return {
    session: {
      user: userForSession,
      cartCount: calculatedCartCount
    }
  };
}