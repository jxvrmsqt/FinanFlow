
import { FinancialState } from './types';

export const initialData: FinancialState = {
  users: [],
  debts: [
    { 
      id: '1', 
      name: 'Cartão Nubank', 
      originalValue: 8000, 
      totalBalance: 4500, 
      monthlyInstallment: 450, 
      remainingInstallments: 10, 
      type: 'Cartão', 
      status: 'EM ANDAMENTO', 
      priorityScore: 1,
      dueDate: 10,
      interestRate: 12.5, // Juros altos
      isAgreement: false
    },
    { 
      id: '2', 
      name: 'Acordo Limpa Nome', 
      originalValue: 15000, 
      totalBalance: 12000, 
      monthlyInstallment: 800, 
      remainingInstallments: 15, 
      type: 'Acordo', 
      status: 'EM ANDAMENTO', 
      priorityScore: 5, // Prioridade máxima pois cancela se não pagar
      dueDate: 5,
      interestRate: 0, // Acordo geralmente trava juros
      isAgreement: true
    },
    { 
      id: '3', 
      name: 'Financiamento Carro', 
      originalValue: 50000, 
      totalBalance: 35000, 
      monthlyInstallment: 1200, 
      remainingInstallments: 36, 
      type: 'Financiamento', 
      status: 'EM ANDAMENTO', 
      priorityScore: 3,
      dueDate: 20,
      interestRate: 1.9,
      isAgreement: false
    },
    { 
      id: '4', 
      name: 'Dívida Amigo', 
      originalValue: 2000, 
      totalBalance: 0, 
      monthlyInstallment: 0, 
      remainingInstallments: 0, 
      type: 'Outros', 
      status: 'QUITADA', 
      priorityScore: 4,
      dueDate: 1,
      interestRate: 0,
      isAgreement: false
    },
  ],
  incomes: [
    { id: '1', source: 'Salário Principal', amount: 5500 },
    { id: '2', source: 'Freelance', amount: 1200 },
  ],
  fixedExpenses: [
    { id: '1', description: 'Aluguel', amount: 1500, paid: true, dueDate: 5, category: 'Moradia' },
    { id: '2', description: 'Energia', amount: 200, paid: true, dueDate: 10, category: 'Moradia' },
    { id: '3', description: 'Internet', amount: 100, paid: true, dueDate: 15, category: 'Moradia' },
    { id: '4', description: 'Academia', amount: 150, paid: false, dueDate: 1, category: 'Saúde' },
  ],
  history: [
    { date: '2024-01', balance: 65000 },
    { date: '2024-02', balance: 62000 },
    { date: '2024-03', balance: 58000 },
    { date: '2024-04', balance: 55000 },
    { date: '2024-05', balance: 51500 },
  ]
};
