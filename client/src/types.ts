export type Region = 'AU' | 'NZ';
export type TransactionType = 'INCOME' | 'EXPENSE';

export interface User {
  id: string;
  name: string;
  email: string;
  region: Region;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amountCents: number;
  category: string;
  description: string | null;
  date: string;
  gstApplicable: boolean;
}

export type TransactionInput = Omit<Transaction, 'id'>;

export interface TransactionPage {
  items: Transaction[];
  total: number;
  page: number;
  pageSize: number;
}

export interface Summary {
  fy: number;
  label: string;
  range: { from: string; to: string };
  totals: {
    income: number;
    expense: number;
    net: number;
    gstCollected: number;
    gstPaid: number;
    netGst: number;
  };
  monthly: { month: string; income: number; expense: number }[];
  expenseByCategory: { category: string; total: number }[];
}
