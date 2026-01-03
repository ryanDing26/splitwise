import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Plus, 
  Receipt, 
  TrendingUp, 
  TrendingDown, 
  ArrowRight,
  Wallet
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Layout, PageHeader } from '@/components/Layout';
import { BillCard } from '@/components/BillCard';
import { Spinner, EmptyState } from '@/components/ui';
import api from '@/services/api';
import type { Bill } from '@/types';
import { formatCurrency } from '@/utils';

interface DashboardStats {
  totalBills: number;
  activeBills: number;
  totalOwed: number;
  totalOwing: number;
}

export function DashboardPage() {
  const { user } = useAuth();
  const [bills, setBills] = useState<Bill[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalBills: 0,
    activeBills: 0,
    totalOwed: 0,
    totalOwing: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [billsRes] = await Promise.all([
          api.getBills({ limit: 5 }),
        ]);

        if (billsRes.data) {
          setBills(billsRes.data);
          
          // Calculate stats from bills
          const activeBills = billsRes.data.filter(b => b.status === 'active');
          let totalOwed = 0;
          let totalOwing = 0;

          billsRes.data.forEach((bill) => {
            const isCreator = bill.createdBy.id === user?.id;
            
            if (isCreator) {
              // Sum what others owe you
              bill.participants.forEach(p => {
                if (p.user?.id !== user?.id) {
                  totalOwed += (p.totalOwed - p.amountPaid);
                }
              });
            } else {
              // Find your share
              const myParticipant = bill.participants.find(
                p => p.user?.id === user?.id
              );
              if (myParticipant) {
                totalOwing += (myParticipant.totalOwed - myParticipant.amountPaid);
              }
            }
          });

          setStats({
            totalBills: billsRes.data.length,
            activeBills: activeBills.length,
            totalOwed,
            totalOwing,
          });
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user?.id]);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <Layout>
      <PageHeader
        title={`${greeting()}, ${user?.name || 'there'}!`}
        description="Here's what's happening with your bills"
        action={
          <Link to="/bills/new" className="btn-primary">
            <Plus className="w-4 h-4" />
            New Bill
          </Link>
        }
      />

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="space-y-8 animate-stagger">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={<Receipt className="w-5 h-5" />}
              label="Total Bills"
              value={stats.totalBills.toString()}
              color="primary"
            />
            <StatCard
              icon={<Wallet className="w-5 h-5" />}
              label="Active"
              value={stats.activeBills.toString()}
              color="blue"
            />
            <StatCard
              icon={<TrendingUp className="w-5 h-5" />}
              label="You're Owed"
              value={formatCurrency(stats.totalOwed)}
              color="green"
            />
            <StatCard
              icon={<TrendingDown className="w-5 h-5" />}
              label="You Owe"
              value={formatCurrency(stats.totalOwing)}
              color="orange"
            />
          </div>

          {/* Recent Bills */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-surface-900">Recent Bills</h2>
              <Link 
                to="/bills" 
                className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
              >
                View all <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {bills.length === 0 ? (
              <EmptyState
                icon={<Receipt className="w-12 h-12" />}
                title="No bills yet"
                description="Create your first bill to start splitting expenses with friends"
                action={
                  <Link to="/bills/new" className="btn-primary">
                    <Plus className="w-4 h-4" />
                    Create Bill
                  </Link>
                }
              />
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {bills.map((bill) => (
                  <BillCard key={bill._id} bill={bill} />
                ))}
              </div>
            )}
          </section>

          {/* Quick Actions */}
          <section>
            <h2 className="text-lg font-semibold text-surface-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <QuickAction
                icon={<Plus className="w-5 h-5" />}
                label="New Bill"
                to="/bills/new"
              />
              <QuickAction
                icon={<Receipt className="w-5 h-5" />}
                label="All Bills"
                to="/bills"
              />
              <QuickAction
                icon={<TrendingUp className="w-5 h-5" />}
                label="Payments"
                to="/payments"
              />
              <QuickAction
                icon={<Wallet className="w-5 h-5" />}
                label="Settle Up"
                to="/payments"
              />
            </div>
          </section>
        </div>
      )}
    </Layout>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: 'primary' | 'blue' | 'green' | 'orange';
}

function StatCard({ icon, label, value, color }: StatCardProps) {
  const colorClasses = {
    primary: 'bg-primary-50 text-primary-600',
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    orange: 'bg-orange-50 text-orange-600',
  };

  return (
    <div className="card p-5">
      <div className={`w-10 h-10 rounded-xl ${colorClasses[color]} flex items-center justify-center mb-3`}>
        {icon}
      </div>
      <p className="text-sm text-surface-500 mb-1">{label}</p>
      <p className="text-2xl font-display font-bold text-surface-900">{value}</p>
    </div>
  );
}

interface QuickActionProps {
  icon: React.ReactNode;
  label: string;
  to: string;
}

function QuickAction({ icon, label, to }: QuickActionProps) {
  return (
    <Link
      to={to}
      className="flex flex-col items-center gap-2 p-4 rounded-xl border border-surface-200 hover:border-primary-200 hover:bg-primary-50/50 transition-colors"
    >
      <div className="w-10 h-10 rounded-full bg-surface-100 flex items-center justify-center text-surface-600">
        {icon}
      </div>
      <span className="text-sm font-medium text-surface-700">{label}</span>
    </Link>
  );
}
