export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatCurrencyCompact(amount: number): string {
  if (Math.abs(amount) >= 10000000) {
    return `₹${(amount / 10000000).toFixed(1)}Cr`;
  }
  if (Math.abs(amount) >= 100000) {
    return `₹${(amount / 100000).toFixed(1)}L`;
  }
  if (Math.abs(amount) >= 1000) {
    return `₹${(amount / 1000).toFixed(1)}K`;
  }
  return `₹${amount}`;
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;

  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

export function formatFullDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export const EXPENSE_CATEGORIES = [
  { label: 'Food & Dining', value: 'food', icon: 'fast-food' as const },
  { label: 'Transport', value: 'transport', icon: 'car' as const },
  { label: 'Shopping', value: 'shopping', icon: 'cart' as const },
  { label: 'Bills & Utilities', value: 'bills', icon: 'receipt' as const },
  { label: 'Entertainment', value: 'entertainment', icon: 'film' as const },
  { label: 'Health', value: 'health', icon: 'fitness' as const },
  { label: 'Education', value: 'education', icon: 'school' as const },
  { label: 'Other', value: 'other', icon: 'ellipsis-horizontal' as const },
];

export const INCOME_CATEGORIES = [
  { label: 'Salary', value: 'salary', icon: 'cash' as const },
  { label: 'Rental', value: 'rental', icon: 'home' as const },
  { label: 'FD Interest', value: 'fd_interest', icon: 'trending-up' as const },
  { label: 'Business', value: 'business', icon: 'business' as const },
  { label: 'Dividend', value: 'dividend', icon: 'stats-chart' as const },
  { label: 'Freelance', value: 'freelance', icon: 'laptop' as const },
  { label: 'Other', value: 'other', icon: 'ellipsis-horizontal' as const },
];

export const PAYMENT_MODES = [
  { label: 'Cash', value: 'cash', icon: 'cash-outline' as const },
  { label: 'UPI', value: 'upi', icon: 'phone-portrait-outline' as const },
  { label: 'Card', value: 'card', icon: 'card-outline' as const },
  { label: 'Bank Transfer', value: 'bank_transfer', icon: 'swap-horizontal-outline' as const },
  { label: 'Other', value: 'other', icon: 'ellipsis-horizontal-outline' as const },
];

export const CATEGORY_ICON_MAP: Record<string, keyof typeof import('@expo/vector-icons').Ionicons extends never ? string : string> = {
  food: 'fast-food',
  transport: 'car',
  shopping: 'cart',
  bills: 'receipt',
  entertainment: 'film',
  health: 'fitness',
  education: 'school',
  other: 'ellipsis-horizontal',
  salary: 'cash',
  rental: 'home',
  fd_interest: 'trending-up',
  business: 'business',
  dividend: 'stats-chart',
  freelance: 'laptop',
};
