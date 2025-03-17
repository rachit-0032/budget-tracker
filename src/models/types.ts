export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Expense {
  id: string;
  amount: number;
  description: string;
  date: Date;
  userId: string;
  categoryId: string;
  createdAt: Date;
  updatedAt: Date;
  category?: Category;
}

export interface ExpenseWithCategory extends Expense {
  category: Category;
}

export interface DashboardStats {
  totalExpenses: number;
  monthlyTotal: number;
  categoryTotals: CategoryTotal[];
  recentExpenses: ExpenseWithCategory[];
}

export interface CategoryTotal {
  category: Category;
  total: number;
  percentage: number;
}

export interface FormattedExpense {
  id: string;
  amount: string;
  description: string;
  date: string;
  categoryId: string;
  categoryName: string;
  categoryColor: string;
} 