const KEY = 'bs_wishlist';

function notify() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('bs:wishlist'));
}

export function getWishlist(): string[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}

export function addToWishlist(id: string): void {
  const list = getWishlist();
  if (!list.includes(id)) { list.push(id); localStorage.setItem(KEY, JSON.stringify(list)); notify(); }
}

export function removeFromWishlist(id: string): void {
  const list = getWishlist().filter(i => i !== id);
  localStorage.setItem(KEY, JSON.stringify(list));
  notify();
}

export function isInWishlist(id: string): boolean {
  return getWishlist().includes(id);
}

export function getWishlistCount(): number {
  return getWishlist().length;
}
