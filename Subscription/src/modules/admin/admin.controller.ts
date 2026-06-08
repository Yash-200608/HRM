import type { Request, Response } from 'express';
import { adminService } from './admin.service';

export const adminController = {
  metrics: async (_req: Request, res: Response) => {
    const metrics = await adminService.getMetrics();
    res.json({ data: metrics });
  },
  revenue: async (_req: Request, res: Response) => {
    const report = await adminService.getRevenueReport();
    res.json({ data: report });
  },
  plans: async (_req: Request, res: Response) => {
    const distribution = await adminService.getPlanDistribution();
    res.json({ data: distribution });
  },
  payments: async (_req: Request, res: Response) => {
    const failures = await adminService.getPaymentFailures();
    res.json({ data: failures });
  },
  features: async (_req: Request, res: Response) => {
    const featureAdoption = await adminService.getFeatureAdoption();
    res.json({ data: featureAdoption });
  },
  operationalMetrics: async (_req: Request, res: Response) => {
    const metrics = await adminService.getOperationalMetrics();
    res.json({ data: metrics });
  },
  replayOutboxEvent: async (req: Request, res: Response) => {
    const eventId = String(req.params.id ?? '');
    const event = await adminService.replayOutboxEvent(eventId);
    res.json({ data: event });
  },
};
