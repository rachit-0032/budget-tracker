'use client';

import { useState, useEffect } from 'react';
import { Category } from '@/models/types';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function CategoriesPage() {
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

    console.log('Setting up categories listener for user:', user.uid);
    let unsubscribe: () => void;

    try {
      // Set up real-time listener for categories
      const q = query(
        collection(db, 'categories'),
        where('userId', '==', user.uid)
      );

      unsubscribe = onSnapshot(q, 
        (snapshot) => {
          try {
            console.log('Received categories snapshot:', {
              size: snapshot.size,
              empty: snapshot.empty
            });
            
            const categoriesData = snapshot.docs.map(doc => {
              const data = doc.data();
              console.log('Processing document:', { id: doc.id, data });
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
          console.error('Firestore listener error:', error);
          console.error('Error code:', error.code);
          console.error('Error message:', error.message);
          setError(`Failed to load categories: ${error.message}`);
          setLoading(false);
        }
      );
    } catch (err) {
      console.error('Error setting up categories listener:', err);
      setError('Failed to initialize categories. Please refresh the page.');
      setLoading(false);
    }

    return () => {
      console.log('Cleaning up categories listener');
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) {
      setError('You must be logged in to add categories');
      return;
    }

    try {
      setError(null);
      const formData = new FormData(e.currentTarget);
      
      const newCategory = {
        name: formData.get('name') as string,
        color: formData.get('color') as string || '#6366F1',
        userId: user.uid,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      const docRef = await addDoc(collection(db, 'categories'), newCategory);
      console.log('Category created successfully with ID:', docRef.id);

      // Reset form
      (e.target as HTMLFormElement).reset();
    } catch (err) {
      console.error('Error adding category:', err);
      setError(err instanceof Error ? err.message : 'Failed to add category. Please try again.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!user) {
      setError('You must be logged in to delete categories');
      return;
    }

    try {
      setError(null);
      const docRef = doc(db, 'categories', id);
      await deleteDoc(docRef);
      console.log('Category deleted successfully:', id);
    } catch (err) {
      console.error('Error deleting category:', err);
      setError('Failed to delete category. Please try again.');
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
      <h1 className="text-3xl font-bold text-gray-800">Categories</h1>
      
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
      
      {/* Add Category Form */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium text-gray-700 mb-4">Add New Category</h2>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Category Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="e.g. Groceries, Rent, Entertainment"
                required
              />
            </div>
            
            <div>
              <label htmlFor="color" className="block text-sm font-medium text-gray-700 mb-1">
                Color
              </label>
              <input
                type="color"
                id="color"
                name="color"
                className="w-full h-10 rounded-md border border-gray-300 px-1 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                defaultValue="#6366F1"
              />
            </div>
          </div>
          
          <div className="flex justify-end">
            <button
              type="submit"
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              Add Category
            </button>
          </div>
        </form>
      </div>
      
      {/* Categories List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-700">Your Categories</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {categories.length === 0 ? (
            <div className="px-6 py-4 text-gray-500 text-center">
              No categories yet. Add your first category above.
            </div>
          ) : (
            categories.map((category) => (
              <div key={category.id} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center">
                  <div 
                    className="w-4 h-4 rounded-full mr-3"
                    style={{ backgroundColor: category.color }}
                  ></div>
                  <span className="text-gray-900">{category.name}</span>
                </div>
                <button
                  onClick={() => handleDelete(category.id)}
                  className="text-red-600 hover:text-red-900"
                >
                  Delete
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
} 