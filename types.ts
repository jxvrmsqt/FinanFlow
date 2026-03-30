
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  income: number;
  avatar?: string;
  role: 'ADMIN' | 'MEMBER';
}

export type DebtType = 'Cartão' | 'Empréstimo' | 'Financiamento' | 'Acordo' | 'Outros';
export type DebtStatus = 'EM ANDAMENTO' | 'QUITADA' | 'CORRENTE' | 'ACORDO';

export interface DebtPayment {
  id: string;
  date: string;
  amount: number;
  discount?: number; // Valor economizado (ex: desconto por antecipação)
  type: 'TOTAL' | 'PARCIAL' | 'ANTECIPACAO';
}

export interface Debt {
  id: string;
  name: string;
  originalValue: number; // Valor da dívida inicial (antes de qualquer negociação)
  totalBalance: number; // Saldo devedor atual
  monthlyInstallment: number; // Valor da parcela mensal (0 se for CORRENTE)
  remainingInstallments: number;
  type: DebtType;
  status: DebtStatus;
  priorityScore: number;
  dueDate: number; // Dia do vencimento
  interestRate: number; // Taxa mensal em %
  isAgreement: boolean; // Se for acordo, quebra gera cancelamento
  agreementValue?: number; // Valor total do acordo fechado
  payments?: DebtPayment[];
  createdAt?: string;
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
  savingsFromNegotiation?: number; // Economia acumulada por descontos/antecipações
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
