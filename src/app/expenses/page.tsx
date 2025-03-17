'use client';

import { useState, useEffect } from 'react';
import { formatCurrency, formatDate } from "@/lib/utils";
import { Category, Expense } from '@/models/types';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.replace('/login');
      return;
    }

    console.log('Setting up expenses and categories listeners for user:', user.uid);
    let unsubscribeExpenses: () => void;
    let unsubscribeCategories: () => void;

    try {
      // Set up real-time listener for expenses
      const expensesQuery = query(
        collection(db, 'expenses'),
        where('userId', '==', user.uid)
      );

      unsubscribeExpenses = onSnapshot(expensesQuery, 
        (snapshot) => {
          try {
            console.log('Received expenses snapshot:', {
              size: snapshot.size,
              empty: snapshot.empty
            });
            
            const expensesData = snapshot.docs.map(doc => {
              const data = doc.data();
              console.log('Processing expense document:', { id: doc.id, data });
              return {
                id: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate(),
                updatedAt: data.updatedAt?.toDate()
              };
            }) as Expense[];
            
            setExpenses(expensesData);
            setError(null);
          } catch (err) {
            console.error('Error processing expenses data:', err);
            setError('Error processing expenses data');
          }
        },
        (error) => {
          console.error('Firestore expenses listener error:', error);
          console.error('Error code:', error.code);
          console.error('Error message:', error.message);
          setError(`Failed to load expenses: ${error.message}`);
        }
      );

      // Set up real-time listener for categories
      const categoriesQuery = query(
        collection(db, 'categories'),
        where('userId', '==', user.uid)
      );

      unsubscribeCategories = onSnapshot(categoriesQuery,
        (snapshot) => {
          try {
            console.log('Received categories snapshot:', {
              size: snapshot.size,
              empty: snapshot.empty
            });
            
            const categoriesData = snapshot.docs.map(doc => {
              const data = doc.data();
              console.log('Processing category document:', { id: doc.id, data });
              return {
                id: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate(),
                updatedAt: data.updatedAt?.toDate()
              };
            }) as Category[];
            
            setCategories(categoriesData);
            setError(null);
          } catch (err) {
            console.error('Error processing categories data:', err);
            setError('Error processing categories data');
          } finally {
            setLoading(false);
          }
        },
        (error) => {
          console.error('Firestore categories listener error:', error);
          console.error('Error code:', error.code);
          console.error('Error message:', error.message);
          setError(`Failed to load categories: ${error.message}`);
          setLoading(false);
        }
      );
    } catch (err) {
      console.error('Error setting up listeners:', err);
      setError('Failed to initialize. Please refresh the page.');
      setLoading(false);
    }

    return () => {
      console.log('Cleaning up listeners');
      if (unsubscribeExpenses) {
        unsubscribeExpenses();
      }
      if (unsubscribeCategories) {
        unsubscribeCategories();
      }
    };
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) {
      setError('You must be logged in to add expenses');
      return;
    }

    try {
      setError(null);
      const formData = new FormData(e.currentTarget);
      
      const newExpense = {
        description: formData.get('description') as string,
        amount: parseFloat(formData.get('amount') as string),
        date: formData.get('date') as string,
        categoryId: formData.get('categoryId') as string,
        userId: user.uid,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      console.log('Creating new expense:', newExpense);
      const docRef = await addDoc(collection(db, 'expenses'), newExpense);
      console.log('Expense created successfully with ID:', docRef.id);

      // Reset form
      (e.target as HTMLFormElement).reset();
    } catch (err) {
      console.error('Error adding expense:', err);
      setError(err instanceof Error ? err.message : 'Failed to add expense. Please try again.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!user) {
      setError('You must be logged in to delete expenses');
      return;
    }

    try {
      setError(null);
      const docRef = doc(db, 'expenses', id);
      await deleteDoc(docRef);
      console.log('Expense deleted successfully:', id);
    } catch (err) {
      console.error('Error deleting expense:', err);
      setError('Failed to delete expense. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-gray-800">Expenses</h1>
      
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
      
      {/* Add Expense Form */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium text-gray-700 mb-4">Add New Expense</h2>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <input
                type="text"
                id="description"
                name="description"
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="What did you spend on?"
                required
              />
            </div>

            <div>
              <label htmlFor="categoryId" className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <div className="relative">
                <select
                  id="categoryId"
                  name="categoryId"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 pr-10"
                  required
                >
                  <option value="">Select a category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
                Amount
              </label>
              <input
                type="number"
                id="amount"
                name="amount"
                step="0.01"
                min="0"
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="0.00"
                required
              />
            </div>

            <div>
              <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
                Date
              </label>
              <input
                type="date"
                id="date"
                name="date"
                defaultValue={new Date().toISOString().split('T')[0]}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
            </div>
          </div>
          
          <div className="flex justify-end">
            <button
              type="submit"
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              Add Expense
            </button>
          </div>
        </form>
      </div>
      
      {/* Expenses List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-700">Your Expenses</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {expenses.map((expense) => {
                const category = categories.find(c => c.id === expense.categoryId);
                return (
                  <tr key={expense.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {expense.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        {category && (
                          <div 
                            className="w-3 h-3 rounded-full mr-2"
                            style={{ backgroundColor: category.color }}
                          />
                        )}
                        {category?.name || 'Unknown'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(expense.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatCurrency(expense.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleDelete(expense.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
} 