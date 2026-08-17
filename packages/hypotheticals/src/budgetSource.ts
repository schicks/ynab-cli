export interface Category {
  id: string;
  group: string;
  name: string;
  target: number;
}

export interface TargetUpdate {
  id: string;
  target: number;
}

/**
 * Everything the UI needs from a budget backend. The mock implementation
 * below stands in for the real YNAB API (see pitch: "Not this cycle, but
 * not rejected" — real OAuth is future work) so that wiring up auth later
 * only means swapping the implementation passed to App, not touching the UI.
 */
export interface BudgetSource {
  fetchBudget(): Promise<{ income: number; categories: Category[] }>;
  applyTargets(updates: TargetUpdate[]): Promise<{ ok: boolean }>;
}

export const GROUP_ORDER = [
  "Immediate Obligations",
  "True Expenses",
  "Debt Payments",
  "Quality of Life",
  "Savings Goals",
];

const SEED_CATEGORIES: Category[] = [
  { id: "mortgage", group: "Immediate Obligations", name: "Mortgage", target: 2400 },
  { id: "utilities", group: "Immediate Obligations", name: "Utilities", target: 320 },
  { id: "insurance", group: "Immediate Obligations", name: "Home & Auto Insurance", target: 260 },
  { id: "groceries", group: "Immediate Obligations", name: "Groceries", target: 900 },
  { id: "charging", group: "Immediate Obligations", name: "Fuel & Charging", target: 140 },

  { id: "homemaint", group: "True Expenses", name: "Home Maintenance", target: 150 },
  { id: "carmaint", group: "True Expenses", name: "Car Maintenance", target: 100 },
  { id: "medical", group: "True Expenses", name: "Medical", target: 120 },
  { id: "household", group: "True Expenses", name: "Household Supplies", target: 60 },

  { id: "carloan", group: "Debt Payments", name: "Car Loan", target: 480 },

  { id: "dining", group: "Quality of Life", name: "Dining Out", target: 250 },
  { id: "subs", group: "Quality of Life", name: "Subscriptions", target: 90 },
  { id: "kidsactivities", group: "Quality of Life", name: "Kids' Activities", target: 150 },
  { id: "personalcare", group: "Quality of Life", name: "Personal Care", target: 80 },

  { id: "retirement", group: "Savings Goals", name: "Retirement", target: 600 },
  { id: "emergency", group: "Savings Goals", name: "Emergency Fund", target: 200 },
  { id: "kids529", group: "Savings Goals", name: "Kids' 529", target: 300 },
  { id: "vacation", group: "Savings Goals", name: "Vacation", target: 150 },
];

function wait(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}

/**
 * Mock YNAB DB stub. Holds the "server" state of targets and income, and
 * simulates network latency on read/write, so the UI can be built and
 * tested against something that behaves like a real API without one.
 */
function createMockBudgetSource(): BudgetSource {
  const categories = SEED_CATEGORIES.map((c) => ({ ...c }));
  const income = 7850; // estimated from trailing 6mo of historical transactions

  return {
    async fetchBudget() {
      await wait(450);
      return {
        income,
        categories: categories.map((c) => ({ ...c })),
      };
    },

    async applyTargets(updates) {
      await wait(800);
      updates.forEach(({ id, target }) => {
        const cat = categories.find((c) => c.id === id);
        if (cat) cat.target = target;
      });
      return { ok: true };
    },
  };
}

export const mockBudgetSource: BudgetSource = createMockBudgetSource();
