import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Receipt, Loader2 } from 'lucide-react';
import { Layout, PageHeader } from '@/components/Layout';
import { InputField, SelectField } from '@/components/ui';
import api from '@/services/api';
import type { CreateBillData, SplitMethod } from '@/types';
import { cn } from '@/utils';

const CATEGORIES = [
  { value: 'food', label: '🍽️ Food' },
  { value: 'drinks', label: '🍺 Drinks' },
  { value: 'groceries', label: '🛒 Groceries' },
  { value: 'entertainment', label: '🎬 Entertainment' },
  { value: 'travel', label: '✈️ Travel' },
  { value: 'utilities', label: '💡 Utilities' },
  { value: 'rent', label: '🏠 Rent' },
  { value: 'shopping', label: '🛍️ Shopping' },
  { value: 'healthcare', label: '🏥 Healthcare' },
  { value: 'education', label: '📚 Education' },
  { value: 'other', label: '📦 Other' },
];

const SPLIT_METHODS = [
  { value: 'by_item', label: 'By Item', description: 'Each person pays for their items' },
  { value: 'equal', label: 'Equal Split', description: 'Split equally among everyone' },
  { value: 'by_percentage', label: 'By Percentage', description: 'Custom percentage per person' },
  { value: 'by_amount', label: 'By Amount', description: 'Fixed amount per person' },
];

const CURRENCIES = [
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'GBP', label: 'GBP - British Pound' },
  { value: 'CAD', label: 'CAD - Canadian Dollar' },
  { value: 'AUD', label: 'AUD - Australian Dollar' },
  { value: 'INR', label: 'INR - Indian Rupee' },
];

export function CreateBillPage() {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState<CreateBillData>({
    title: '',
    description: '',
    category: 'other',
    splitMethod: 'by_item',
    currency: 'USD',
    subtotal: 0,
    tax: { type: 'percentage', value: 0 },
    tip: { type: 'percentage', value: 0 },
    merchant: { name: '' },
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (field: keyof CreateBillData, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await api.createBill(formData);
      if (response.data?.bill) {
        navigate(`/bills/${response.data.bill._id}`);
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Failed to create bill. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      <PageHeader
        title="Create New Bill"
        description="Set up a new shared expense"
        backLink="/bills"
      />

      <form onSubmit={handleSubmit} className="max-w-2xl">
        <div className="space-y-8">
          {/* Basic Info */}
          <section className="card p-6">
            <h2 className="text-lg font-semibold text-surface-900 mb-4 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-primary-600" />
              Basic Information
            </h2>
            
            <div className="space-y-4">
              <InputField
                label="Bill Title"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                placeholder="e.g., Dinner at Joe's"
                required
              />
              
              <InputField
                label="Description (optional)"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Add any notes about this bill"
              />

              <div className="grid grid-cols-2 gap-4">
                <SelectField
                  label="Category"
                  value={formData.category}
                  onChange={(e) => handleChange('category', e.target.value)}
                  options={CATEGORIES}
                />
                
                <SelectField
                  label="Currency"
                  value={formData.currency}
                  onChange={(e) => handleChange('currency', e.target.value)}
                  options={CURRENCIES}
                />
              </div>

              <InputField
                label="Merchant/Venue (optional)"
                value={formData.merchant?.name || ''}
                onChange={(e) => handleChange('merchant', { name: e.target.value })}
                placeholder="e.g., Restaurant name"
              />
            </div>
          </section>

          {/* Split Method */}
          <section className="card p-6">
            <h2 className="text-lg font-semibold text-surface-900 mb-4">Split Method</h2>
            
            <div className="grid grid-cols-2 gap-3">
              {SPLIT_METHODS.map((method) => (
                <button
                  key={method.value}
                  type="button"
                  onClick={() => handleChange('splitMethod', method.value as SplitMethod)}
                  className={cn(
                    'p-4 rounded-xl border-2 text-left transition-all',
                    formData.splitMethod === method.value
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-surface-200 hover:border-surface-300'
                  )}
                >
                  <p className="font-medium text-surface-900">{method.label}</p>
                  <p className="text-sm text-surface-500 mt-1">{method.description}</p>
                </button>
              ))}
            </div>
          </section>

          {/* Amounts */}
          <section className="card p-6">
            <h2 className="text-lg font-semibold text-surface-900 mb-4">Amounts</h2>
            
            <div className="space-y-4">
              <InputField
                label="Subtotal"
                type="number"
                value={formData.subtotal || ''}
                onChange={(e) => handleChange('subtotal', parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                min="0"
                step="0.01"
                hint="Total before tax and tip. You can also add items later."
              />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Tax</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={formData.tax?.value || ''}
                      onChange={(e) => handleChange('tax', { 
                        ...formData.tax, 
                        value: parseFloat(e.target.value) || 0 
                      })}
                      placeholder="0"
                      min="0"
                      step="0.01"
                      className="input flex-1"
                    />
                    <select
                      value={formData.tax?.type || 'percentage'}
                      onChange={(e) => handleChange('tax', { 
                        ...formData.tax, 
                        type: e.target.value as 'percentage' | 'fixed'
                      })}
                      className="input w-20"
                    >
                      <option value="percentage">%</option>
                      <option value="fixed">$</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="label">Tip</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={formData.tip?.value || ''}
                      onChange={(e) => handleChange('tip', { 
                        ...formData.tip, 
                        value: parseFloat(e.target.value) || 0 
                      })}
                      placeholder="0"
                      min="0"
                      step="0.01"
                      className="input flex-1"
                    />
                    <select
                      value={formData.tip?.type || 'percentage'}
                      onChange={(e) => handleChange('tip', { 
                        ...formData.tip, 
                        type: e.target.value as 'percentage' | 'fixed'
                      })}
                      className="input w-20"
                    >
                      <option value="percentage">%</option>
                      <option value="fixed">$</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
              {error}
            </div>
          )}

          {/* Submit */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => navigate('/bills')}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!formData.title || isSubmitting}
              className={cn(
                'btn-primary flex-1',
                isSubmitting && 'opacity-70 cursor-not-allowed'
              )}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Bill'
              )}
            </button>
          </div>
        </div>
      </form>
    </Layout>
  );
}
