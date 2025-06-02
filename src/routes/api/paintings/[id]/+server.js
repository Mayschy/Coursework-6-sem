import { json } from '@sveltejs/kit';
import { connectDB } from '$lib/server/db.js';
import { ObjectId } from 'mongodb';

export async function GET({ params }) {
  try {
    const db = await connectDB();
    const id = params.id;

    if (!ObjectId.isValid(id)) {
      return json({ error: 'Invalid ID' }, { status: 400 });
    }

    const painting = await db.collection('paintings').findOne({ _id: new ObjectId(id) });

    if (!painting) {
      return json({ error: 'Painting not found' }, { status: 404 });
    }

    painting._id = painting._id.toString();

    return json(painting);
  } catch (error) {
    console.error('Error fetching painting:', error);
    return json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PUT({ params, request, locals }) {
  try {
    const user = locals.user;

    if (!user || user.role !== 'admin') {
      return json({ error: 'Access denied' }, { status: 403 });
    }

    const id = params.id;

    if (!ObjectId.isValid(id)) {
      return json({ error: 'Invalid ID' }, { status: 400 });
    }

    const data = await request.json();

    const update = {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.price !== undefined && { price: Number(data.price) }),
      ...(data.dimensions !== undefined && { dimensions: data.dimensions }),
      ...(data.previewImage !== undefined && { previewImage: data.previewImage }),
      ...(data.hoverPreviewImage !== undefined && { hoverPreviewImage: data.hoverPreviewImage }),
      ...(Array.isArray(data.detailImages) && { detailImages: data.detailImages }),
      ...(data.saleFileUrl !== undefined && { saleFileUrl: data.saleFileUrl })
    };

    if (Object.keys(update).length === 0) {
      return json({ message: 'No data to update' }, { status: 200 });
    }

    const db = await connectDB();
    const result = await db.collection('paintings').updateOne(
      { _id: new ObjectId(id) },
      { $set: update }
    );

    if (result.matchedCount === 0) {
      return json({ error: 'Painting not found' }, { status: 404 });
    }

    return json({ message: 'Painting updated successfully' });
  } catch (error) {
    console.error('Error updating painting:', error);
    return json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE({ params, locals }) {
  try {
    const user = locals.user;

    if (!user || user.role !== 'admin') {
      return json({ error: 'Access denied' }, { status: 403 });
    }

    const id = params.id;

    if (!ObjectId.isValid(id)) {
      return json({ error: 'Invalid ID' }, { status: 400 });
    }

    const db = await connectDB();
    const result = await db.collection('paintings').deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return json({ error: 'Painting not found' }, { status: 404 });
    }

    return json({ message: 'Painting deleted successfully' });
  } catch (error) {
    console.error('Error deleting painting:', error);
    return json({ error: 'Server error' }, { status: 500 });
  }
}