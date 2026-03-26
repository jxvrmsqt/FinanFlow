
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  income: number;
  avatar?: string;
  role: 'ADMIN' | 'MEMBER';
}

export interface Debt {
  id: string;
  name: string;
  originalValue: number;
  totalBalance: number;
  monthlyInstallment: number;
  remainingInstallments: number;
  type: 'Cartão' | 'Empréstimo' | 'Financiamento' | 'Acordo' | 'Outros';
  status: 'EM ANDAMENTO' | 'QUITADA';
  priorityScore: number;
  dueDate: number; // Dia do vencimento
  interestRate: number; // Taxa mensal em %
  isAgreement: boolean; // Se for acordo, quebra gera cancelamento
}

export interface Income {
  id: string;
  source: string;
  amount: number;
  isExtra?: boolean; // Identifica se é renda extra
}

export interface FixedExpense {
  id: string;
  description: string;
  amount: number;
  paid: boolean;
  actualAmount?: number;
  dueDate: number; // Dia do vencimento
  category: 'Moradia' | 'Alimentação' | 'Saúde' | 'Transporte' | 'Lazer' | 'Outros';
}

export interface HistoryPoint {
  date: string;
  balance: number;
}

export interface FinancialState {
  users: UserProfile[]; // Lista de membros da família
  debts: Debt[];
  incomes: Income[];
  fixedExpenses: FixedExpense[];
  history: HistoryPoint[];
}

export interface AppSettings {
  googleSheetsUrl: string;
  lastSync: string | null;
}
