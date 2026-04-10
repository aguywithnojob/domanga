export const CATEGORIES = [
  { id: 'rent',          label: 'Rent',          emoji: '🏠' },
  { id: 'grocery',       label: 'Grocery',        emoji: '🛒' },
  { id: 'utilities',     label: 'Utilities',      emoji: '💡' },
  { id: 'food',          label: 'Food & Dining',  emoji: '🍽️' },
  { id: 'entertainment', label: 'Entertainment',  emoji: '🎬' },
  { id: 'transport',     label: 'Transport',      emoji: '🚗' },
  { id: 'healthcare',    label: 'Healthcare',     emoji: '💊' },
  { id: 'shopping',      label: 'Shopping',       emoji: '🛍️' },
  { id: 'travel',        label: 'Travel',         emoji: '✈️' },
  { id: 'credit_card',   label: 'Credit Card',    emoji: '💳' },
  { id: 'laundry',       label: 'Laundry',        emoji: '👕' },
  { id: 'car',           label: 'Car',            emoji: '🚘' },
  { id: 'bike',          label: 'Bike',           emoji: '🏍️' },
  { id: 'trip',          label: 'Trip',           emoji: '🗺️' },
  { id: 'others',        label: 'Others',         emoji: '📦' },
]

export function getCategoryMeta(id) {
  return CATEGORIES.find(c => c.id === id) || { id, label: id, emoji: '📦' }
}

export const CATEGORY_COLORS = {
  rent:          '#0891b2',
  grocery:       '#ec4899',
  utilities:     '#f59e0b',
  food:          '#10b981',
  entertainment: '#3b82f6',
  transport:     '#06b6d4',
  healthcare:    '#ef4444',
  shopping:      '#8b5cf6',
  travel:        '#f97316',
  credit_card:   '#64748b',
  laundry:       '#0ea5e9',
  car:           '#d97706',
  bike:          '#16a34a',
  trip:          '#a21caf',
  others:        '#6b7280',
}
