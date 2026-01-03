import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Users, 
  Package, 
  CreditCard, 
  Plus, 
  Trash2, 
  Check,
  Calendar,
  MapPin,
  Share2,
  MoreVertical,
  Edit
} from 'lucide-react';
import { Layout, PageHeader } from '@/components/Layout';
import { 
  Spinner, 
  Avatar, 
  Tabs, 
  Modal, 
  InputField, 
  SelectField,
  EmptyState,
  ProgressBar
} from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/services/api';
import type { Bill, Item, Payment, CreateItemData, CreatePaymentData } from '@/types';
import { 
  formatCurrency, 
  formatDate, 
  getBillStatusColor, 
  getPaymentStatusColor,
  getCategoryIcon,
  calculatePercentage,
  cn
} from '@/utils';

type TabId = 'items' | 'participants' | 'payments';

export function BillDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [bill, setBill] = useState<Bill | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('items');
  
  // Modal states
  const [showAddItem, setShowAddItem] = useState(false);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [showAddParticipant, setShowAddParticipant] = useState(false);

  const isOwner = bill?.createdBy.id === user?.id;

  useEffect(() => {
    const fetchBill = async () => {
      if (!id) return;
      
      try {
        const response = await api.getBill(id);
        if (response.data) {
          setBill(response.data.bill);
          setItems(response.data.items);
          setPayments(response.data.payments);
        }
      } catch (error) {
        console.error('Failed to fetch bill:', error);
        navigate('/bills');
      } finally {
        setIsLoading(false);
      }
    };

    fetchBill();
  }, [id, navigate]);

  const handleAddItem = async (data: CreateItemData) => {
    if (!bill) return;
    
    try {
      const response = await api.createItem(bill._id, data);
      if (response.data?.item) {
        setItems([...items, response.data.item]);
        setShowAddItem(false);
      }
    } catch (error) {
      console.error('Failed to add item:', error);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!bill) return;
    
    try {
      await api.deleteItem(bill._id, itemId);
      setItems(items.filter(i => i._id !== itemId));
    } catch (error) {
      console.error('Failed to delete item:', error);
    }
  };

  const handleAddPayment = async (data: CreatePaymentData) => {
    if (!bill) return;
    
    try {
      const response = await api.createPayment(bill._id, data);
      if (response.data?.payment) {
        setPayments([...payments, response.data.payment]);
        setShowAddPayment(false);
        // Refresh bill to update participant amounts
        const billResponse = await api.getBill(bill._id);
        if (billResponse.data) {
          setBill(billResponse.data.bill);
        }
      }
    } catch (error) {
      console.error('Failed to add payment:', error);
    }
  };

  const handleAddParticipant = async (data: { phoneNumber?: string; name?: string }) => {
    if (!bill) return;
    
    try {
      const response = await api.addParticipant(bill._id, data);
      if (response.data?.bill) {
        setBill(response.data.bill);
        setShowAddParticipant(false);
      }
    } catch (error) {
      console.error('Failed to add participant:', error);
    }
  };

  const handleRemoveParticipant = async (participantId: string) => {
    if (!bill) return;
    
    try {
      const response = await api.removeParticipant(bill._id, participantId);
      if (response.data?.bill) {
        setBill(response.data.bill);
      }
    } catch (error) {
      console.error('Failed to remove participant:', error);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      </Layout>
    );
  }

  if (!bill) {
    return (
      <Layout>
        <EmptyState
          title="Bill not found"
          description="This bill may have been deleted or you don't have access to it"
          action={
            <button onClick={() => navigate('/bills')} className="btn-primary">
              Back to Bills
            </button>
          }
        />
      </Layout>
    );
  }

  const totalPaid = bill.participants.reduce((sum, p) => sum + p.amountPaid, 0);
  const paidPercentage = calculatePercentage(totalPaid, bill.total);

  const tabs = [
    { id: 'items' as const, label: 'Items', count: items.length },
    { id: 'participants' as const, label: 'People', count: bill.participants.length },
    { id: 'payments' as const, label: 'Payments', count: payments.length },
  ];

  return (
    <Layout>
      <PageHeader
        title={bill.title}
        backLink="/bills"
        action={
          isOwner && (
            <div className="flex gap-2">
              <button className="btn-secondary">
                <Share2 className="w-4 h-4" />
                Share
              </button>
              <button className="btn-ghost">
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>
          )
        }
      />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Bill Summary Card */}
          <div className="card p-6">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-14 h-14 rounded-xl bg-surface-100 flex items-center justify-center text-3xl">
                {getCategoryIcon(bill.category)}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn(getBillStatusColor(bill.status))}>
                    {bill.status}
                  </span>
                  <span className="text-surface-400">•</span>
                  <span className="text-sm text-surface-500">
                    Code: {bill.code}
                  </span>
                </div>
                <p className="text-3xl font-display font-bold text-surface-900">
                  {formatCurrency(bill.total, bill.currency)}
                </p>
              </div>
            </div>

            {/* Progress */}
            {bill.status === 'active' && (
              <div className="mb-6">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-surface-500">Settlement Progress</span>
                  <span className="font-medium text-surface-900">
                    {formatCurrency(totalPaid, bill.currency)} of {formatCurrency(bill.total, bill.currency)}
                  </span>
                </div>
                <ProgressBar 
                  value={paidPercentage} 
                  color={paidPercentage === 100 ? 'success' : 'primary'} 
                />
              </div>
            )}

            {/* Meta Info */}
            <div className="flex flex-wrap gap-4 text-sm text-surface-500">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                {formatDate(bill.expenseDate)}
              </span>
              {bill.merchant?.name && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  {bill.merchant.name}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4" />
                {bill.participants.length} people
              </span>
            </div>
          </div>

          {/* Tabs */}
          <Tabs tabs={tabs} activeTab={activeTab} onChange={(id) => setActiveTab(id as TabId)} />

          {/* Tab Content */}
          <div className="card">
            {activeTab === 'items' && (
              <ItemsList 
                items={items} 
                bill={bill}
                isOwner={isOwner}
                onAddItem={() => setShowAddItem(true)}
                onDeleteItem={handleDeleteItem}
              />
            )}
            {activeTab === 'participants' && (
              <ParticipantsList 
                bill={bill}
                isOwner={isOwner}
                onAddParticipant={() => setShowAddParticipant(true)}
                onRemoveParticipant={handleRemoveParticipant}
              />
            )}
            {activeTab === 'payments' && (
              <PaymentsList 
                payments={payments}
                bill={bill}
                onAddPayment={() => setShowAddPayment(true)}
              />
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Breakdown */}
          <div className="card p-5">
            <h3 className="font-semibold text-surface-900 mb-4">Breakdown</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-surface-500">Subtotal</span>
                <span className="font-medium">{formatCurrency(bill.subtotal, bill.currency)}</span>
              </div>
              {bill.tax.amount > 0 && (
                <div className="flex justify-between">
                  <span className="text-surface-500">Tax</span>
                  <span className="font-medium">{formatCurrency(bill.tax.amount, bill.currency)}</span>
                </div>
              )}
              {bill.tip.amount > 0 && (
                <div className="flex justify-between">
                  <span className="text-surface-500">Tip</span>
                  <span className="font-medium">{formatCurrency(bill.tip.amount, bill.currency)}</span>
                </div>
              )}
              <hr className="border-surface-100" />
              <div className="flex justify-between text-base">
                <span className="font-semibold">Total</span>
                <span className="font-bold text-primary-600">
                  {formatCurrency(bill.total, bill.currency)}
                </span>
              </div>
            </div>
          </div>

          {/* Created By */}
          <div className="card p-5">
            <h3 className="font-semibold text-surface-900 mb-4">Created by</h3>
            <div className="flex items-center gap-3">
              <Avatar 
                src={bill.createdBy.avatar} 
                name={bill.createdBy.name || bill.createdBy.phoneNumber}
                size="md"
              />
              <div>
                <p className="font-medium text-surface-900">
                  {bill.createdBy.name || bill.createdBy.displayName}
                </p>
                <p className="text-sm text-surface-500">
                  {formatDate(bill.createdAt)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <AddItemModal 
        isOpen={showAddItem} 
        onClose={() => setShowAddItem(false)}
        onSubmit={handleAddItem}
      />
      <AddPaymentModal
        isOpen={showAddPayment}
        onClose={() => setShowAddPayment(false)}
        onSubmit={handleAddPayment}
        participants={bill.participants}
        currency={bill.currency}
      />
      <AddParticipantModal
        isOpen={showAddParticipant}
        onClose={() => setShowAddParticipant(false)}
        onSubmit={handleAddParticipant}
      />
    </Layout>
  );
}

// Items List Component
interface ItemsListProps {
  items: Item[];
  bill: Bill;
  isOwner: boolean;
  onAddItem: () => void;
  onDeleteItem: (id: string) => void;
}

function ItemsList({ items, bill, isOwner, onAddItem, onDeleteItem }: ItemsListProps) {
  if (items.length === 0) {
    return (
      <div className="p-6">
        <EmptyState
          icon={<Package className="w-10 h-10" />}
          title="No items yet"
          description="Add items to split among participants"
          action={
            isOwner && (
              <button onClick={onAddItem} className="btn-primary">
                <Plus className="w-4 h-4" />
                Add Item
              </button>
            )
          }
        />
      </div>
    );
  }

  return (
    <div>
      <div className="px-5 py-3 border-b border-surface-100 flex justify-between items-center">
        <span className="text-sm text-surface-500">{items.length} items</span>
        {isOwner && (
          <button onClick={onAddItem} className="btn-ghost text-sm">
            <Plus className="w-4 h-4" />
            Add
          </button>
        )}
      </div>
      <div className="divide-y divide-surface-100">
        {items.map((item) => (
          <div key={item._id} className="px-5 py-4 flex items-center justify-between hover:bg-surface-50">
            <div className="flex-1">
              <h4 className="font-medium text-surface-900">{item.name}</h4>
              <p className="text-sm text-surface-500">
                {item.quantity} × {formatCurrency(item.unitPrice, bill.currency)}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-semibold text-surface-900">
                {formatCurrency(item.totalPrice, bill.currency)}
              </span>
              {isOwner && (
                <button 
                  onClick={() => onDeleteItem(item._id)}
                  className="p-1.5 text-surface-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Participants List Component
interface ParticipantsListProps {
  bill: Bill;
  isOwner: boolean;
  onAddParticipant: () => void;
  onRemoveParticipant: (id: string) => void;
}

function ParticipantsList({ bill, isOwner, onAddParticipant, onRemoveParticipant }: ParticipantsListProps) {
  if (bill.participants.length === 0) {
    return (
      <div className="p-6">
        <EmptyState
          icon={<Users className="w-10 h-10" />}
          title="No participants yet"
          description="Add people to split this bill with"
          action={
            isOwner && (
              <button onClick={onAddParticipant} className="btn-primary">
                <Plus className="w-4 h-4" />
                Add Person
              </button>
            )
          }
        />
      </div>
    );
  }

  return (
    <div>
      <div className="px-5 py-3 border-b border-surface-100 flex justify-between items-center">
        <span className="text-sm text-surface-500">{bill.participants.length} people</span>
        {isOwner && (
          <button onClick={onAddParticipant} className="btn-ghost text-sm">
            <Plus className="w-4 h-4" />
            Add
          </button>
        )}
      </div>
      <div className="divide-y divide-surface-100">
        {bill.participants.map((p) => (
          <div key={p._id} className="px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar 
                src={p.user?.avatar} 
                name={p.user?.name || p.name || p.phoneNumber}
                size="md"
              />
              <div>
                <h4 className="font-medium text-surface-900">
                  {p.user?.name || p.name || p.phoneNumber}
                </h4>
                <span className={cn('text-sm', getPaymentStatusColor(p.paymentStatus))}>
                  {p.paymentStatus}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="font-semibold text-surface-900">
                  {formatCurrency(p.totalOwed, bill.currency)}
                </p>
                {p.amountPaid > 0 && (
                  <p className="text-sm text-green-600">
                    Paid: {formatCurrency(p.amountPaid, bill.currency)}
                  </p>
                )}
              </div>
              {isOwner && (
                <button 
                  onClick={() => onRemoveParticipant(p._id)}
                  className="p-1.5 text-surface-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Payments List Component
interface PaymentsListProps {
  payments: Payment[];
  bill: Bill;
  onAddPayment: () => void;
}

function PaymentsList({ payments, bill, onAddPayment }: PaymentsListProps) {
  if (payments.length === 0) {
    return (
      <div className="p-6">
        <EmptyState
          icon={<CreditCard className="w-10 h-10" />}
          title="No payments yet"
          description="Record payments as participants settle up"
          action={
            <button onClick={onAddPayment} className="btn-primary">
              <Plus className="w-4 h-4" />
              Record Payment
            </button>
          }
        />
      </div>
    );
  }

  return (
    <div>
      <div className="px-5 py-3 border-b border-surface-100 flex justify-between items-center">
        <span className="text-sm text-surface-500">{payments.length} payments</span>
        <button onClick={onAddPayment} className="btn-ghost text-sm">
          <Plus className="w-4 h-4" />
          Record
        </button>
      </div>
      <div className="divide-y divide-surface-100">
        {payments.map((payment) => (
          <div key={payment._id} className="px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <Check className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h4 className="font-medium text-surface-900">
                  {payment.payer?.name || payment.payerName || 'Unknown'}
                </h4>
                <p className="text-sm text-surface-500">
                  {payment.method} • {formatDate(payment.createdAt)}
                </p>
              </div>
            </div>
            <span className="font-semibold text-green-600">
              +{formatCurrency(payment.amount, bill.currency)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Add Item Modal
interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateItemData) => void;
}

function AddItemModal({ isOpen, onClose, onSubmit }: AddItemModalProps) {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unitPrice, setUnitPrice] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      quantity: parseFloat(quantity) || 1,
      unitPrice: parseFloat(unitPrice) || 0,
    });
    setName('');
    setQuantity('1');
    setUnitPrice('');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Item">
      <form onSubmit={handleSubmit} className="space-y-4">
        <InputField
          label="Item name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Burger"
          required
        />
        <div className="grid grid-cols-2 gap-4">
          <InputField
            label="Quantity"
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            min="0.01"
            step="0.01"
          />
          <InputField
            label="Unit price"
            type="number"
            value={unitPrice}
            onChange={(e) => setUnitPrice(e.target.value)}
            placeholder="0.00"
            min="0"
            step="0.01"
            required
          />
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">
            Cancel
          </button>
          <button type="submit" className="btn-primary flex-1">
            Add Item
          </button>
        </div>
      </form>
    </Modal>
  );
}

// Add Payment Modal
interface AddPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreatePaymentData) => void;
  participants: Bill['participants'];
  currency: string;
}

function AddPaymentModal({ isOpen, onClose, onSubmit, participants, currency }: AddPaymentModalProps) {
  const [participantId, setParticipantId] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('other');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      participantId,
      amount: parseFloat(amount) || 0,
      method: method as CreatePaymentData['method'],
    });
    setParticipantId('');
    setAmount('');
    setMethod('other');
  };

  const participantOptions = participants.map(p => ({
    value: p._id,
    label: `${p.user?.name || p.name || p.phoneNumber} (owes ${formatCurrency(p.totalOwed - p.amountPaid, currency)})`,
  }));

  const methodOptions = [
    { value: 'cash', label: 'Cash' },
    { value: 'venmo', label: 'Venmo' },
    { value: 'paypal', label: 'PayPal' },
    { value: 'zelle', label: 'Zelle' },
    { value: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'other', label: 'Other' },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Record Payment">
      <form onSubmit={handleSubmit} className="space-y-4">
        <SelectField
          label="Who paid?"
          value={participantId}
          onChange={(e) => setParticipantId(e.target.value)}
          options={[{ value: '', label: 'Select person...' }, ...participantOptions]}
          required
        />
        <InputField
          label="Amount"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          min="0.01"
          step="0.01"
          required
        />
        <SelectField
          label="Payment method"
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          options={methodOptions}
        />
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">
            Cancel
          </button>
          <button type="submit" className="btn-primary flex-1">
            Record Payment
          </button>
        </div>
      </form>
    </Modal>
  );
}

// Add Participant Modal
interface AddParticipantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { phoneNumber?: string; name?: string }) => void;
}

function AddParticipantModal({ isOpen, onClose, onSubmit }: AddParticipantModalProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ phoneNumber: phoneNumber || undefined, name: name || undefined });
    setPhoneNumber('');
    setName('');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Participant">
      <form onSubmit={handleSubmit} className="space-y-4">
        <InputField
          label="Phone number"
          type="tel"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          placeholder="(555) 123-4567"
        />
        <InputField
          label="Name (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="John Doe"
        />
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">
            Cancel
          </button>
          <button type="submit" className="btn-primary flex-1">
            Add Person
          </button>
        </div>
      </form>
    </Modal>
  );
}
