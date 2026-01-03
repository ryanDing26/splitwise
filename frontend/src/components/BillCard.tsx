import React from 'react';
import { Link } from 'react-router-dom';
import { Users, Calendar, ChevronRight } from 'lucide-react';
import type { Bill } from '@/types';
import { Avatar, ProgressBar } from '@/components/ui';
import { 
  formatCurrency, 
  formatRelativeDate, 
  getBillStatusColor,
  getCategoryIcon,
  calculatePercentage,
  cn
} from '@/utils';

interface BillCardProps {
  bill: Bill;
}

export function BillCard({ bill }: BillCardProps) {
  const totalPaid = bill.participants.reduce((sum, p) => sum + p.amountPaid, 0);
  const paidPercentage = calculatePercentage(totalPaid, bill.total);

  return (
    <Link to={`/bills/${bill._id}`} className="card-hover block p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          {/* Category Icon */}
          <div className="w-12 h-12 rounded-xl bg-surface-100 flex items-center justify-center text-2xl flex-shrink-0">
            {getCategoryIcon(bill.category)}
          </div>
          
          {/* Bill Info */}
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-surface-900 truncate">
                {bill.title}
              </h3>
              <span className={cn(getBillStatusColor(bill.status))}>
                {bill.status}
              </span>
            </div>
            
            <div className="flex items-center gap-4 text-sm text-surface-500">
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                {bill.participants.length}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {formatRelativeDate(bill.createdAt)}
              </span>
            </div>
          </div>
        </div>

        {/* Amount */}
        <div className="text-right flex-shrink-0">
          <p className="font-display font-bold text-lg text-surface-900">
            {formatCurrency(bill.total, bill.currency)}
          </p>
          {bill.status !== 'settled' && bill.participants.length > 0 && (
            <p className="text-xs text-surface-500">
              {formatCurrency(bill.total - totalPaid, bill.currency)} remaining
            </p>
          )}
        </div>
      </div>

      {/* Progress */}
      {bill.status === 'active' && bill.participants.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-surface-500 mb-1.5">
            <span>Settled</span>
            <span>{paidPercentage}%</span>
          </div>
          <ProgressBar 
            value={paidPercentage} 
            color={paidPercentage === 100 ? 'success' : 'primary'} 
          />
        </div>
      )}

      {/* Participants Preview */}
      {bill.participants.length > 0 && (
        <div className="mt-4 flex items-center justify-between">
          <div className="flex -space-x-2">
            {bill.participants.slice(0, 5).map((p) => (
              <Avatar
                key={p._id}
                src={p.user?.avatar}
                name={p.user?.name || p.name || p.phoneNumber}
                size="sm"
                className="ring-2 ring-white"
              />
            ))}
            {bill.participants.length > 5 && (
              <div className="w-8 h-8 rounded-full bg-surface-100 text-surface-600 text-xs font-medium flex items-center justify-center ring-2 ring-white">
                +{bill.participants.length - 5}
              </div>
            )}
          </div>
          <ChevronRight className="w-5 h-5 text-surface-400" />
        </div>
      )}
    </Link>
  );
}

// Compact version for lists
interface BillCardCompactProps {
  bill: Bill;
}

export function BillCardCompact({ bill }: BillCardCompactProps) {
  return (
    <Link 
      to={`/bills/${bill._id}`} 
      className="flex items-center gap-4 p-4 hover:bg-surface-50 rounded-xl transition-colors"
    >
      <div className="w-10 h-10 rounded-lg bg-surface-100 flex items-center justify-center text-xl flex-shrink-0">
        {getCategoryIcon(bill.category)}
      </div>
      
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-surface-900 truncate">{bill.title}</h4>
        <p className="text-sm text-surface-500">
          {bill.participants.length} people · {formatRelativeDate(bill.createdAt)}
        </p>
      </div>
      
      <div className="text-right">
        <p className="font-semibold text-surface-900">
          {formatCurrency(bill.total, bill.currency)}
        </p>
        <span className={cn('text-xs', getBillStatusColor(bill.status))}>
          {bill.status}
        </span>
      </div>
    </Link>
  );
}
