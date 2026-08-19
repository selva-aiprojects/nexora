import { z } from 'zod';

export const salesInvoiceSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  date: z.string().min(1, 'Date is required'),
  dueDate: z.string().min(1, 'Due date is required'),
  lineItems: z.array(
    z.object({
      item: z.string().min(1, 'Item is required'),
      qty: z.coerce.number().positive('Qty must be > 0'),
      rate: z.coerce.number().nonnegative('Rate must be >= 0'),
      gstRate: z.coerce.number().nonnegative('GST must be >= 0'),
    })
  ).min(1, 'Add at least one line item'),
});

export const purchaseInvoiceSchema = z.object({
  vendorId: z.string().min(1, 'Vendor is required'),
  date: z.string().min(1, 'Date is required'),
  dueDate: z.string().min(1, 'Due date is required'),
  lineItems: z.array(
    z.object({
      item: z.string().min(1, 'Item is required'),
      qty: z.coerce.number().positive('Qty must be > 0'),
      rate: z.coerce.number().nonnegative('Rate must be >= 0'),
      gstRate: z.coerce.number().nonnegative('GST must be >= 0'),
    })
  ).min(1, 'Add at least one line item'),
});

export const employeeSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email'),
  phone: z.string().regex(/^\d{10}$/, 'Phone must be 10 digits').optional().or(z.literal('')),
  departmentId: z.string().min(1, 'Department is required'),
  designationId: z.string().min(1, 'Designation is required'),
  grade: z.string().optional(),
  dateOfJoining: z.string().min(1, 'Date of joining is required'),
  salary: z.object({
    basic: z.coerce.number().nonnegative(),
    hra: z.coerce.number().nonnegative(),
    allowances: z.coerce.number().nonnegative(),
  }).optional(),
});

export const crmCustomerSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  gstin: z.string().regex(/^[0-9A-Z]{15}$/, 'GSTIN must be 15 chars').optional().or(z.literal('')),
  billingAddress: z.string().min(1, 'Billing address is required'),
  shippingAddress: z.string().optional(),
  creditLimit: z.coerce.number().nonnegative(),
  paymentTerms: z.string().optional(),
});

export const procurementVendorSchema = z.object({
  name: z.string().min(2, 'Vendor name is required'),
  category: z.string().min(1, 'Category is required'),
  gstin: z.string().regex(/^[0-9A-Z]{15}$/, 'GSTIN must be 15 chars').optional().or(z.literal('')),
  rating: z.coerce.number().min(1).max(5).optional(),
  paymentTerms: z.string().optional(),
});

export const projectSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  code: z.string().min(1, 'Code is required'),
  description: z.string().optional(),
  status: z.string().optional(),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  budget: z.coerce.number().nonnegative('Budget must be >= 0'),
  managerId: z.string().optional(),
});

export type SalesInvoiceInput = z.infer<typeof salesInvoiceSchema>;
export type PurchaseInvoiceInput = z.infer<typeof purchaseInvoiceSchema>;
export type EmployeeInput = z.infer<typeof employeeSchema>;
export type CrmCustomerInput = z.infer<typeof crmCustomerSchema>;
export type ProcurementVendorInput = z.infer<typeof procurementVendorSchema>;
export type ProjectInput = z.infer<typeof projectSchema>;
