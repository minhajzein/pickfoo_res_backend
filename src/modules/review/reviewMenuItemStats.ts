import { Types } from 'mongoose';
import Review from './review.model.js';

function menuItemIdFromLine(raw: unknown): string | null {
  if (raw == null) return null;
  if (typeof raw === 'object' && raw !== null && '_id' in raw) {
    return String((raw as { _id: unknown })._id);
  }
  return String(raw);
}

/**
 * For each menu item id, aggregate rating sum and count of reviews whose order included that item
 * (one review counts once per distinct menu line id in the order). Scoped to the owner's restaurants.
 */
export async function getReviewStatsByMenuItemForOwner(
  ownerId: Types.ObjectId
): Promise<Map<string, { sum: number; count: number }>> {
  const reviews = await Review.find()
    .populate({
      path: 'restaurant',
      match: { owner: ownerId },
      select: '_id',
    })
    .populate({
      path: 'order',
      select: 'items',
    })
    .select('rating order')
    .lean();

  const stats = new Map<string, { sum: number; count: number }>();

  for (const r of reviews) {
    if (!r.restaurant) continue;
    const order = r.order as { items?: { menuItem?: unknown }[] } | null | undefined;
    if (!order?.items?.length) continue;

    const seenLine = new Set<string>();
    for (const line of order.items) {
      const mid = menuItemIdFromLine(line.menuItem);
      if (!mid || seenLine.has(mid)) continue;
      seenLine.add(mid);

      const slot = stats.get(mid) ?? { sum: 0, count: 0 };
      slot.sum += Number(r.rating) || 0;
      slot.count += 1;
      stats.set(mid, slot);
    }
  }

  return stats;
}

export function statsToReviewFields(stats: { sum: number; count: number } | undefined): {
  reviewAverage: number | null;
  reviewCount: number;
} {
  if (!stats || stats.count < 1) {
    return { reviewAverage: null, reviewCount: 0 };
  }
  const avg = Math.round((stats.sum / stats.count) * 10) / 10;
  return { reviewAverage: avg, reviewCount: stats.count };
}
