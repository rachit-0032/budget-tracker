'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Category, Expense } from '@/models/types';

interface CategoryWithStats extends Category {
  monthlyTotal: number;
  previousMonthTotal: number;
  transactions: Expense[];
}

const ExpenseCategories = () => {
  const [categories, setCategories] = useState<CategoryWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    let unsubscribeCategories: () => void;
    let unsubscribeExpenses: () => void;

    const setupListeners = async () => {
      try {
        // Get categories
        const categoriesQuery = query(
          collection(db, 'categories'),
          where('userId', '==', user.uid)
        );

        unsubscribeCategories = onSnapshot(categoriesQuery, async (categorySnapshot) => {
          const categoriesData = categorySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          })) as Category[];

          // Get current and previous month dates
          const now = new Date();
          const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
          const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

          // Get expenses
          const expensesQuery = query(
            collection(db, 'expenses'),
            where('userId', '==', user.uid),
            where('date', '>=', previousMonthStart.toISOString().split('T')[0])
          );

          unsubscribeExpenses = onSnapshot(expensesQuery, (expenseSnapshot) => {
            const expensesData = expenseSnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data(),
              date: new Date(doc.data().date),
            })) as Expense[];

            // Calculate totals for each category
            const categoriesWithStats = categoriesData.map(category => {
              const categoryExpenses = expensesData.filter(expense => 
                expense.categoryId === category.id
              );

              const currentMonthExpenses = categoryExpenses.filter(expense => 
                expense.date >= currentMonthStart
              );

              const previousMonthExpenses = categoryExpenses.filter(expense => 
                expense.date >= previousMonthStart && expense.date < currentMonthStart
              );

              const monthlyTotal = currentMonthExpenses.reduce(
                (sum, expense) => sum + expense.amount, 
                0
              );

              const previousMonthTotal = previousMonthExpenses.reduce(
                (sum, expense) => sum + expense.amount, 
                0
              );

              return {
                ...category,
                monthlyTotal,
                previousMonthTotal,
                transactions: currentMonthExpenses.sort((a, b) => 
                  b.date.getTime() - a.date.getTime()
                ).slice(0, 5) // Get only the 5 most recent transactions
              };
            }).sort((a, b) => b.monthlyTotal - a.monthlyTotal); // Sort by monthly total in descending order

            setCategories(categoriesWithStats);
            setLoading(false);
          });
        });

      } catch (err) {
        console.error('Error setting up dashboard listeners:', err);
        setError('Failed to load dashboard data');
        setLoading(false);
      }
    };

    setupListeners();

    return () => {
      if (unsubscribeCategories) unsubscribeCategories();
      if (unsubscribeExpenses) unsubscribeExpenses();
    };
  }, [user]);

  const calculatePercentageChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? '100' : '0';
    const change = ((current - previous) / previous) * 100;
    return change.toFixed(1);
  };

  if (loading) {
    return (
      <div className="w-full py-6 flex justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full py-6">
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
      </div>
    );
  }

  return (
    <div className="w-full py-6">
      <h2 className="text-2xl font-semibold mb-4 px-4">Expense Categories</h2>
      <div className="overflow-x-auto">
        <div className="flex space-x-4 px-4 pb-4 min-w-full">
          <div className="flex gap-4 pb-4 snap-x snap-mandatory overflow-x-auto">
            {categories.length === 0 ? (
              <div className="w-full text-center text-gray-500 py-8">
                No categories yet. Add some categories to start tracking expenses.
              </div>
            ) : (
              categories.map((category) => {
                const percentageChange = calculatePercentageChange(category.monthlyTotal, category.previousMonthTotal);
                const isPositive = Number(percentageChange) >= 0;

                return (
                  <motion.div
                    key={category.id}
                    className="flex-shrink-0 w-80 bg-white rounded-xl shadow-lg overflow-hidden snap-start"
                    whileHover={{ scale: 1.02 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div 
                      className="p-4"
                      style={{ backgroundColor: category.color + '10' }}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <div 
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: category.color }}
                          />
                          <h3 className="text-lg font-semibold">{category.name}</h3>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold">${category.monthlyTotal.toFixed(2)}</div>
                          <div className={`text-sm ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                            {isPositive ? '+' : ''}{percentageChange}%
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        {category.transactions.map((transaction) => (
                          <div 
                            key={transaction.id}
                            className="bg-white rounded-lg p-3 shadow-sm"
                          >
                            <div className="flex justify-between items-center">
                              <p className="text-sm text-gray-600">{transaction.description}</p>
                              <p className="font-semibold">${transaction.amount.toFixed(2)}</p>
                            </div>
                            <p className="text-xs text-gray-400 mt-1">
                              {new Date(transaction.date).toLocaleDateString()}
                            </p>
                          </div>
                        ))}
                        {category.transactions.length === 0 && (
                          <div className="text-center text-gray-500 text-sm py-4">
                            No transactions this month
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExpenseCategories;