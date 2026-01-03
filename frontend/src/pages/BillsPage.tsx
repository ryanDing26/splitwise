import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Receipt, Search, Filter } from 'lucide-react';
import { Layout, PageHeader } from '@/components/Layout';
import { BillCard } from '@/components/BillCard';
import { Spinner, EmptyState, Tabs } from '@/components/ui';
import api from '@/services/api';
import type { Bill, BillStatus } from '@/types';

const STATUS_TABS = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'settled', label: 'Settled' },
  { id: 'draft', label: 'Draft' },
];

export function BillsPage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchBills = async () => {
      setIsLoading(true);
      try {
        const params: { status?: BillStatus } = {};
        if (activeTab !== 'all') {
          params.status = activeTab as BillStatus;
        }
        
        const response = await api.getBills(params);
        if (response.data) {
          setBills(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch bills:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBills();
  }, [activeTab]);

  const filteredBills = bills.filter(bill => 
    bill.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    bill.merchant?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const tabsWithCounts = STATUS_TABS.map(tab => ({
    ...tab,
    count: tab.id === 'all' 
      ? bills.length 
      : bills.filter(b => b.status === tab.id).length,
  }));

  return (
    <Layout>
      <PageHeader
        title="Bills"
        description="Manage and track all your shared expenses"
        action={
          <Link to="/bills/new" className="btn-primary">
            <Plus className="w-4 h-4" />
            New Bill
          </Link>
        }
      />

      <div className="space-y-6">
        {/* Filters Row */}
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
            <input
              type="text"
              placeholder="Search bills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-10"
            />
          </div>
          
          {/* Filter button (placeholder for future filters) */}
          <button className="btn-secondary hidden sm:inline-flex">
            <Filter className="w-4 h-4" />
            Filters
          </button>
        </div>

        {/* Status Tabs */}
        <Tabs
          tabs={tabsWithCounts}
          activeTab={activeTab}
          onChange={setActiveTab}
        />

        {/* Bills List */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : filteredBills.length === 0 ? (
          <EmptyState
            icon={<Receipt className="w-12 h-12" />}
            title={searchQuery ? 'No bills found' : 'No bills yet'}
            description={
              searchQuery 
                ? 'Try adjusting your search or filters'
                : 'Create your first bill to start splitting expenses'
            }
            action={
              !searchQuery && (
                <Link to="/bills/new" className="btn-primary">
                  <Plus className="w-4 h-4" />
                  Create Bill
                </Link>
              )
            }
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 animate-stagger">
            {filteredBills.map((bill) => (
              <BillCard key={bill._id} bill={bill} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
