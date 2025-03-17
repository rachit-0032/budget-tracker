'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ExpenseCategories from '@/components/ExpenseCategories';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Expense } from '@/models/types';
import { formatCurrency } from '@/lib/utils';

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalExpenses: 0,
    monthlyTotal: 0,
    categoriesCount: 0
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;

    let unsubscribeExpenses: () => void;
    let unsubscribeCategories: () => void;

    const setupListeners = async () => {
      try {
        // Get current month's start date
        const now = new Date();
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        // Listen for expenses
        const expensesQuery = query(
          collection(db, 'expenses'),
          where('userId', '==', user.uid)
        );

        unsubscribeExpenses = onSnapshot(expensesQuery, (snapshot) => {
          const expenses = snapshot.docs.map(doc => ({
            ...doc.data(),
            date: new Date(doc.data().date)
          })) as Expense[];

          // Calculate totals
          const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
          const monthlyTotal = expenses
            .filter(expense => expense.date >= currentMonthStart)
            .reduce((sum, expense) => sum + expense.amount, 0);

          setStats(prev => ({
            ...prev,
            totalExpenses,
            monthlyTotal
          }));
        });

        // Listen for categories count
        const categoriesQuery = query(
          collection(db, 'categories'),
          where('userId', '==', user.uid)
        );

        unsubscribeCategories = onSnapshot(categoriesQuery, (snapshot) => {
          setStats(prev => ({
            ...prev,
            categoriesCount: snapshot.size
          }));
          setLoading(false);
        });

      } catch (err) {
        console.error('Error setting up dashboard listeners:', err);
        setError('Failed to load dashboard data');
        setLoading(false);
      }
    };

    setupListeners();

    return () => {
      if (unsubscribeExpenses) unsubscribeExpenses();
      if (unsubscribeCategories) unsubscribeCategories();
    };
  }, [user]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">
        Welcome back{user?.displayName ? `, ${user.displayName}` : ''}!
      </h1>
      
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Expense Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Total Expenses</h3>
          <p className="text-3xl font-bold text-indigo-600">{formatCurrency(stats.totalExpenses)}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">This Month</h3>
          <p className="text-3xl font-bold text-green-600">{formatCurrency(stats.monthlyTotal)}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Categories</h3>
          <p className="text-3xl font-bold text-purple-600">{stats.categoriesCount}</p>
        </div>
      </div>

      {/* Expense Categories Component */}
      <ExpenseCategories />
    </div>
  );
} 