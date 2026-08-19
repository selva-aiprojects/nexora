export type Role =
  | 'owner'
  | 'admin'
  | 'finance'
  | 'accountant'
  | 'hr'
  | 'manager'
  | 'employee';

export interface Tenant {
  id: string;
  name: string;
  gstin: string;
  financialYear: string;
  currency: string;
  baseCurrency: string;
}

export interface User {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  password: string;
  role: Role;
  employeeId?: string;
}

export interface AuthUser {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  role: Role;
  employeeId?: string;
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
}

export interface Paginated<T> {
  data: T[];
  pagination: Pagination;
}

export interface ApiErrorBody {
  error: string;
  message: string;
  details?: unknown;
}

/** Shape every list endpoint returns so frontend DataTable props line up. */
export interface ListResult<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
}
