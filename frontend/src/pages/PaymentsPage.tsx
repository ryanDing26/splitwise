import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  CreditCard, 
  TrendingUp, 
  TrendingDown, 
  Check,
  ArrowUpRight,
  ArrowDownLeft
} from 'lucide-react';
import { Layout, PageHeader } from '@/components/Layout';
import { Spinner, EmptyState, Tabs, Avatar } from '@/components/ui';
import api from '@/services/api';
import type { Payment } from '@/types';
import { formatCurrency, formatDate, cn } from '@/utils';

export function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [summary, setSummary] = useState({
    totalSent: 0,
    totalReceived: 0,
    sentCount: 0,
    receivedCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [paymentsRes, summaryRes] = await Promise.all([
          api.getMyPayments(),
          api.getPaymentSummary(),
        ]);

        if (paymentsRes.data?.payments) {
          setPayments(paymentsRes.data.payments);
        }
        if (summaryRes.data?.summary) {
          setSummary(summaryRes.data.summary as typeof summary);
        }
      } catch (error) {
        console.error('Failed to fetch payments:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredPayments = activeTab === 'all' 
    ? payments 
    : payments.filter(p => {
        // This is a simplified filter - in reality you'd check against current user ID
        if (activeTab === 'sent') return true; // payments where user is payer
        if (activeTab === 'received') return true; // payments where user is receiver
        return true;
      });

  const tabs = [
    { id: 'all', label: 'All', count: payments.length },
    { id: 'sent', label: 'Sent', count: summary.sentCount },
    { id: 'received', label: 'Received', count: summary.receivedCount },
  ];

  return (
    <Layout>
      <PageHeader
        title="Payments"
        description="Track all your payment activity"
      />

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="card p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <span className="text-sm text-surface-500">Total Received</span>
              </div>
              <p className="text-2xl font-display font-bold text-green-600">
                +{formatCurrency(summary.totalReceived)}
              </p>
              <p className="text-sm text-surface-500 mt-1">
                {summary.receivedCount} payments
              </p>
            </div>

            <div className="card p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                  <TrendingDown className="w-5 h-5 text-orange-600" />
                </div>
                <span className="text-sm text-surface-500">Total Sent</span>
              </div>
              <p className="text-2xl font-display font-bold text-orange-600">
                -{formatCurrency(summary.totalSent)}
              </p>
              <p className="text-sm text-surface-500 mt-1">
                {summary.sentCount} payments
              </p>
            </div>
          </div>

          {/* Tabs */}
          <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

          {/* Payments List */}
          {filteredPayments.length === 0 ? (
            <EmptyState
              icon={<CreditCard className="w-12 h-12" />}
              title="No payments yet"
              description="Payments will appear here when you or others settle up on bills"
            />
          ) : (
            <div className="card divide-y divide-surface-100">
              {filteredPayments.map((payment) => (
                <PaymentRow key={payment._id} payment={payment} />
              ))}
            </div>
          )}
        </div>
      )}
    </Layout>
  );
}

interface PaymentRowProps {
  payment: Payment;
}

function PaymentRow({ payment }: PaymentRowProps) {
  const isSent = true; // In reality, compare with current user ID

  return (
    <div className="p-4 flex items-center gap-4 hover:bg-surface-50 transition-colors">
      <div className={cn(
        'w-10 h-10 rounded-full flex items-center justify-center',
        isSent ? 'bg-orange-100' : 'bg-green-100'
      )}>
        {isSent ? (
          <ArrowUpRight className="w-5 h-5 text-orange-600" />
        ) : (
          <ArrowDownLeft className="w-5 h-5 text-green-600" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium text-surface-900">
          {isSent ? 'Paid to' : 'Received from'}{' '}
          {payment.receiver?.name || payment.payer?.name || 'Unknown'}
        </p>
        <p className="text-sm text-surface-500">
          {payment.method} • {formatDate(payment.createdAt)}
        </p>
      </div>

      <div className="text-right">
        <p className={cn(
          'font-semibold',
          isSent ? 'text-orange-600' : 'text-green-600'
        )}>
          {isSent ? '-' : '+'}{formatCurrency(payment.amount, payment.currency)}
        </p>
        {payment.status === 'completed' && (
          <span className="inline-flex items-center gap-1 text-xs text-green-600">
            <Check className="w-3 h-3" />
            Confirmed
          </span>
        )}
      </div>
    </div>
  );
}
