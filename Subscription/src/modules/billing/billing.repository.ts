import type { ClientSession } from 'mongoose';
import { InvoiceModel } from './invoice.model';
import { PaymentModel } from './payment.model';
import { CreditLedgerModel } from './credit-ledger.model';

type DbOptions = { session?: ClientSession };

export const billingRepository = {
  createInvoice: (payload: Record<string, unknown>, options?: DbOptions) =>
    InvoiceModel.create([payload], options ? { session: options.session } : undefined).then((docs) => docs[0]),
  findInvoiceById: (id: string, options?: DbOptions) => InvoiceModel.findById(id).session(options?.session ?? null).lean(),
  findInvoiceByPublicId: (publicId: string, options?: DbOptions) => InvoiceModel.findOne({ publicId }).session(options?.session ?? null).lean(),
  findInvoiceByInvoiceKey: (invoiceKey: string, options?: DbOptions) =>
    InvoiceModel.findOne({ invoiceKey }).session(options?.session ?? null).lean(),
  findInvoiceByProviderInvoiceId: (providerInvoiceId: string, options?: DbOptions) =>
    InvoiceModel.findOne({ providerInvoiceId }).session(options?.session ?? null).lean(),
  findInvoiceByProviderOrderId: (providerOrderId: string, options?: DbOptions) =>
    InvoiceModel.findOne({ providerOrderId }).session(options?.session ?? null).lean(),
  createPayment: (payload: Record<string, unknown>, options?: DbOptions) =>
    PaymentModel.create([payload], options ? { session: options.session } : undefined).then((docs) => docs[0]),
  findPaymentById: (id: string, options?: DbOptions) => PaymentModel.findById(id).session(options?.session ?? null).lean(),
  findPaymentByProviderId: (providerPaymentId: string, options?: DbOptions) =>
    PaymentModel.findOne({ providerPaymentId }).session(options?.session ?? null).lean(),
  findPaymentByProviderOrderId: (providerOrderId: string, options?: DbOptions) =>
    PaymentModel.findOne({ providerOrderId }).session(options?.session ?? null).lean(),
  updatePaymentById: (id: string, update: Record<string, unknown>, options?: DbOptions) =>
    PaymentModel.findByIdAndUpdate(id, update, { new: true, session: options?.session }).lean(),
  updateInvoice: (id: string, update: Record<string, unknown>, options?: DbOptions) =>
    InvoiceModel.findByIdAndUpdate(id, update, { new: true, session: options?.session }).lean(),
  updateInvoiceByProviderInvoiceId: (providerInvoiceId: string, update: Record<string, unknown>, options?: DbOptions) =>
    InvoiceModel.findOneAndUpdate({ providerInvoiceId }, update, { new: true, session: options?.session }).lean(),
  updateInvoiceById: (id: string, update: Record<string, unknown>, options?: DbOptions) =>
    InvoiceModel.findByIdAndUpdate(id, update, { new: true, session: options?.session }).lean(),
  updateInvoiceIfStatusIn: (id: string, statuses: string[], update: Record<string, unknown>, options?: DbOptions) =>
    InvoiceModel.findOneAndUpdate({ _id: id, status: { $in: statuses } }, update, { new: true, session: options?.session }).lean(),
  createCreditEntry: (payload: Record<string, unknown>, options?: DbOptions) =>
    CreditLedgerModel.create([payload], options ? { session: options.session } : undefined).then((docs) => docs[0]),
  findCreditEntryByEntryKey: (entryKey: string, options?: DbOptions) =>
    CreditLedgerModel.findOne({ entryKey }).session(options?.session ?? null).lean(),
  findCreditsByOrganization: (organizationId: string, options?: DbOptions) =>
    CreditLedgerModel.find({ organization: organizationId }).session(options?.session ?? null).sort({ createdAt: -1 }).lean(),
};
