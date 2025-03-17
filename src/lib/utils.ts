export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
}

export function formatDateInput(date: Date): string {
  const d = new Date(date);
  const year = d.getFullYear();
  // Month is 0-indexed, so add 1 and pad with a leading zero if needed
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

export function calculateMonthlyTotal(expenses: { amount: number; date: Date }[]): number {
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  
  return expenses
    .filter((expense) => new Date(expense.date) >= firstDayOfMonth)
    .reduce((total, expense) => total + expense.amount, 0);
}

export function getMonthName(month: number): string {
  const date = new Date();
  date.setMonth(month);
  
  return date.toLocaleString('en-US', { month: 'long' });
}

export function calculateCategoryTotals(
  expenses: { amount: number; categoryId: string; category: { id: string; name: string; color: string } }[]
) {
  const categoryMap = new Map<string, { total: number; category: { id: string; name: string; color: string } }>();
  
  // Calculate total expenses
  const totalAmount = expenses.reduce((total, expense) => total + expense.amount, 0);
  
  // Group expenses by category
  expenses.forEach((expense) => {
    const existing = categoryMap.get(expense.categoryId);
    
    if (existing) {
      existing.total += expense.amount;
    } else {
      categoryMap.set(expense.categoryId, {
        total: expense.amount,
        category: expense.category,
      });
    }
  });
  
  // Convert map to array and calculate percentages
  return Array.from(categoryMap.values()).map((item) => ({
    category: item.category,
    total: item.total,
    percentage: totalAmount > 0 ? (item.total / totalAmount) * 100 : 0,
  }));
} 