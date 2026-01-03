// User types
export interface User {
  id: string;
  phoneNumber: string;
  name?: string;
  displayName: string;
  email?: string;
  avatar?: string;
  isVerified: boolean;
}

export interface UserPreferences {
  currency: string;
  notifications: {
    sms: boolean;
    push: boolean;
    email: boolean;
  };
  language: string;
}

// Auth types
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
  isNewUser: boolean;
}

// Bill types
export type BillStatus = 'draft' | 'active' | 'settled' | 'cancelled';
export type SplitMethod = 'equal' | 'by_item' | 'by_percentage' | 'by_amount' | 'by_shares';
export type PaymentStatus = 'pending' | 'partial' | 'paid';

export interface Merchant {
  name?: string;
  address?: string;
  phone?: string;
  category?: string;
}

export interface TaxTip {
  type: 'percentage' | 'fixed';
  value: number;
  amount: number;
  splitMethod: 'proportional' | 'equal';
}

export interface Fee {
  name: string;
  type: 'percentage' | 'fixed';
  value: number;
  amount: number;
}

export interface Participant {
  _id: string;
  user?: User;
  phoneNumber?: string;
  name?: string;
  shares: number;
  percentage?: number;
  fixedAmount?: number;
  itemsTotal: number;
  taxAmount: number;
  tipAmount: number;
  feesAmount: number;
  discountAmount: number;
  totalOwed: number;
  amountPaid: number;
  paymentStatus: PaymentStatus;
  addedAt: string;
  paidAt?: string;
}

export interface Bill {
  _id: string;
  code: string;
  title: string;
  description?: string;
  createdBy: User;
  status: BillStatus;
  splitMethod: SplitMethod;
  currency: string;
  merchant?: Merchant;
  expenseDate: string;
  subtotal: number;
  tax: TaxTip;
  tip: TaxTip;
  fees: Fee[];
  discounts: Fee[];
  total: number;
  participants: Participant[];
  category: string;
  notes?: string;
  tags: string[];
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBillData {
  title: string;
  description?: string;
  splitMethod?: SplitMethod;
  currency?: string;
  merchant?: Merchant;
  expenseDate?: string;
  subtotal?: number;
  tax?: Partial<TaxTip>;
  tip?: Partial<TaxTip>;
  category?: string;
  notes?: string;
  tags?: string[];
}

// Item types
export type AssignmentType = 'equal' | 'specific' | 'proportional';

export interface Assignment {
  _id: string;
  participantId: string;
  user?: string;
  phoneNumber?: string;
  shares: number;
  percentage?: number;
  fixedAmount?: number;
  calculatedAmount: number;
}

export interface Item {
  _id: string;
  bill: string;
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  category?: string;
  taxable: boolean;
  assignmentType: AssignmentType;
  assignments: Assignment[];
  isManuallyEdited: boolean;
  sortOrder: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateItemData {
  name: string;
  description?: string;
  quantity?: number;
  unitPrice: number;
  category?: string;
  taxable?: boolean;
}

// Payment types
export type PaymentMethod = 
  | 'cash' 
  | 'venmo' 
  | 'paypal' 
  | 'zelle' 
  | 'apple_pay' 
  | 'google_pay' 
  | 'bank_transfer' 
  | 'credit_card' 
  | 'other';

export interface Payment {
  _id: string;
  bill: string;
  payer?: User;
  payerPhone?: string;
  payerName?: string;
  participantId: string;
  receiver?: User;
  amount: number;
  currency: string;
  method: PaymentMethod;
  status: 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled';
  notes?: string;
  createdAt: string;
  confirmedAt?: string;
}

export interface CreatePaymentData {
  participantId: string;
  amount: number;
  method?: PaymentMethod;
  notes?: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  meta?: {
    pagination?: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  };
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
}
