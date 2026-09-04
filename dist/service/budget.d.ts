type BudgetInput = {
    min_budget: number | null;
    max_budget: number | null;
};
type BudgetResult = {
    minBudget: number | null;
    maxBudget: number | null;
    flags: string[];
};
export declare function normalizeBudget(llmOutput: BudgetInput, originalPrompt: string): BudgetResult;
export {};
//# sourceMappingURL=budget.d.ts.map