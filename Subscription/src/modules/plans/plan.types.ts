export type FeatureMatrix = Record<string, boolean>;

export type PlanDefinition = {
  code: string;
  name: string;
  version: number;
  hidden: boolean;
  purchasable: boolean;
  systemManaged: boolean;
  employeeLimit: number | null;
  billingInterval: 'month' | 'year';
  priceMonthly: number;
  priceYearly: number;
  currency: string;
  features: FeatureMatrix;
};
