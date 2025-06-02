// D:\new store pj\artstore-svelte\src\routes\api\cart\+server.js
import { json } from '@sveltejs/kit';
import { connectDB } from '$lib/server/db.js';
import { ObjectId } from 'mongodb';


export async function GET({ locals }) {
  try {
    const user = locals.user;

    if (!user) {
      return json({ error: 'User not authorized' }, { status: 401 });
    }

    const db = await connectDB();
    const userData = await db.collection('users').findOne(
      { _id: new ObjectId(user._id) },
      { projection: { cart: 1 } }
    );

    if (!userData || !userData.cart) {
      return json({ cart: [] });
    }

    const paintingIds = userData.cart.map(item => new ObjectId(item.paintingId));
    const paintings = await db.collection('paintings').find({ _id: { $in: paintingIds } }).toArray();

    const cartWithDetails = userData.cart.map(item => {
      const paintingDetail = paintings.find(p => p._id.equals(item.paintingId));
      return paintingDetail ? {
        paintingId: item.paintingId.toString(),
        addedAt: item.addedAt,
        painting: {
          _id: paintingDetail._id.toString(),
          title: paintingDetail.title,
          price: paintingDetail.price,
          previewImage: paintingDetail.previewImage,
          dimensions: paintingDetail.dimensions
        }
      } : null;
    }).filter(Boolean);

    return json({ cart: cartWithDetails });
  } catch (error) {
    console.error('Error fetching cart:', error);
    return json({ error: 'Server error' }, { status: 500 });
  }
}


export async function POST({ request, locals }) {
  try {
    const user = locals.user;

    if (!user) {
      return json({ error: 'User not authorized' }, { status: 401 });
    }

    const { paintingId } = await request.json();

    if (!ObjectId.isValid(paintingId)) {
      return json({ error: 'Invalid painting ID' }, { status: 400 });
    }

    const db = await connectDB();

    const painting = await db.collection('paintings').findOne({ _id: new ObjectId(paintingId) });
    if (!painting) {
      return json({ error: 'Painting not found' }, { status: 404 });
    }

    const userDoc = await db.collection('users').findOne({ _id: new ObjectId(user._id) });
    const itemInCart = userDoc?.cart?.find(item => item.paintingId.equals(new ObjectId(paintingId)));

    if (itemInCart) {
      return json({ message: 'Painting already in cart' }, { status: 200 });
    }

    await db.collection('users').updateOne(
      { _id: new ObjectId(user._id) },
      {
        $push: {
          cart: {
            paintingId: new ObjectId(paintingId),
            addedAt: new Date()
          }
        }
      }
    );

    return json({ message: 'Painting added to cart' }, { status: 200 });
  } catch (error) {
    console.error('Error adding to cart:', error);
    return json({ error: 'Server error' }, { status: 500 });
  }
}


export async function DELETE({ request, locals }) {
  try {
    const user = locals.user;

    if (!user) {
      return json({ error: 'User not authorized' }, { status: 401 });
    }

    const { paintingId } = await request.json();

    if (!ObjectId.isValid(paintingId)) {
      return json({ error: 'Invalid painting ID' }, { status: 400 });
    }

    const db = await connectDB();

    await db.collection('users').updateOne(
      { _id: new ObjectId(user._id) },
      {
        $pull: {
          cart: {
            paintingId: new ObjectId(paintingId)
          }
        }
      }
    );

    return json({ message: 'Painting removed from cart' }, { status: 200 });
  } catch (error) {
    console.error('Error removing from cart:', error);
    return json({ error: 'Server error' }, { status: 500 });
  }
}