import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';

export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  const d = new Date(date);
  
  if (isToday(d)) {
    return `Today at ${format(d, 'h:mm a')}`;
  }
  
  if (isYesterday(d)) {
    return `Yesterday at ${format(d, 'h:mm a')}`;
  }
  
  return format(d, 'MMM d, yyyy');
}

export function formatRelativeDate(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  
  return phone;
}

export function getInitials(name?: string): string {
  if (!name) return '?';
  
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function getBillStatusColor(status: string): string {
  switch (status) {
    case 'draft':
      return 'badge-neutral';
    case 'active':
      return 'badge-info';
    case 'settled':
      return 'badge-success';
    case 'cancelled':
      return 'badge-danger';
    default:
      return 'badge-neutral';
  }
}

export function getPaymentStatusColor(status: string): string {
  switch (status) {
    case 'pending':
      return 'badge-warning';
    case 'partial':
      return 'badge-info';
    case 'paid':
      return 'badge-success';
    default:
      return 'badge-neutral';
  }
}

export function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    food: '🍽️',
    drinks: '🍺',
    groceries: '🛒',
    entertainment: '🎬',
    travel: '✈️',
    utilities: '💡',
    rent: '🏠',
    shopping: '🛍️',
    healthcare: '🏥',
    education: '📚',
    other: '📦',
  };
  
  return icons[category] || icons.other;
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}

export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}
