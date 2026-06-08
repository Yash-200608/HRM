import { hrmReconciliationService } from './hrm-reconciliation.service';

export async function processReconciliation() {
  const reports = await hrmReconciliationService.reconcileAllOrganizations();
  return {
    processed: reports.length,
    reports,
  };
}
