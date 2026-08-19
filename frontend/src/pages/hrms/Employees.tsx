import * as React from 'react';
import { Badge, Button, Card, DataTable, type Column, FormField, Modal, PageHeader, Select, TextField, useToast } from '@/components';
import { api, type CreateHRMSEmployeeInput, type HRMSDepartment, type HRMSDesignation, type HRMSEmployee } from '@/lib/api';
import { cn, formatDate } from '@/lib/utils';

const STATUS_TONE: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  active: 'success',
  inactive: 'neutral',
};

const EMPTY_FORM: CreateHRMSEmployeeInput & { phone: string; dateOfJoining: string; basic: string; hra: string; allowances: string } = {
  name: '',
  email: '',
  phone: '',
  departmentId: '',
  designationId: '',
  grade: '',
  dateOfJoining: '',
  basic: '',
  hra: '',
  allowances: '',
};

function Employees() {
  const { notify } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [employees, setEmployees] = React.useState<HRMSEmployee[]>([]);
  const [departments, setDepartments] = React.useState<HRMSDepartment[]>([]);
  const [designations, setDesignations] = React.useState<HRMSDesignation[]>([]);
  const [page, setPage] = React.useState(1);
  const [total, setTotal] = React.useState(0);

  const [createOpen, setCreateOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = React.useState<Record<string, string>>({});

  const [detail, setDetail] = React.useState<HRSEmployeeDetail | null>(null);

  const deptMap = React.useMemo(
    () => Object.fromEntries(departments.map((d) => [d.id, d.name])),
    [departments]
  );

  const desigMap = React.useMemo(
    () => Object.fromEntries(designations.map((d) => [d.id, d.title])),
    [designations]
  );

  const load = React.useCallback(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      api.getHRMSEmployees({ pageSize: 20, page }),
      api.getHRMSDepartments(),
      api.getHRMSDesignations(),
    ])
      .then(([res, deps, desigs]) => {
        if (cancelled) return;
        setEmployees(res.rows ?? []);
        setTotal(res.total ?? 0);
        setDepartments(deps);
        setDesignations(desigs);
      })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [page]);

  React.useEffect(() => load(), [load]);

  function openCreate() {
    setForm(EMPTY_FORM);
    setFormErrors({});
    setCreateOpen(true);
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    if (!form.email.trim()) errs.email = 'Email is required';
    if (!form.departmentId) errs.departmentId = 'Select a department';
    if (!form.designationId) errs.designationId = 'Select a designation';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function submitCreate() {
    if (!validate()) return;
    setSaving(true);
    try {
      const basic = Number(form.basic) || 0;
      const hra = Number(form.hra) || 0;
      const allowances = Number(form.allowances) || 0;
      const payload: CreateHRMSEmployeeInput = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        departmentId: form.departmentId,
        designationId: form.designationId,
        grade: form.grade?.trim() || undefined,
        dateOfJoining: form.dateOfJoining || undefined,
        salary: { basic, hra, allowances },
      };
      await api.createHRMSEmployee(payload);
      notify({ title: 'Employee added', description: `${payload.name} is now active.`, tone: 'success' });
      setCreateOpen(false);
      setPage(1);
      load();
    } catch (err: any) {
      notify({ title: 'Could not save', description: err.message, tone: 'danger' });
    } finally {
      setSaving(false);
    }
  }

  async function openDetail(emp: HRMSEmployee) {
    try {
      const full = await api.getHRMSEmployee(emp.id);
      setDetail({
        ...full,
        departmentName: deptMap[full.departmentId] ?? full.departmentId,
        designationName: desigMap[full.designationId] ?? full.designationId,
      });
    } catch (err: any) {
      notify({ title: 'Could not load employee', description: err.message, tone: 'danger' });
    }
  }

  const columns: Column<HRMSEmployee>[] = [
    { key: 'employeeCode', header: 'Emp Code', sortable: true },
    { key: 'name', header: 'Name', sortable: true },
    { key: 'email', header: 'Email', hideBelow: 'md' },
    {
      key: 'departmentId',
      header: 'Department',
      render: (row) => deptMap[row.departmentId] ?? row.departmentId,
    },
    {
      key: 'designationId',
      header: 'Designation',
      render: (row) => desigMap[row.designationId] ?? row.designationId,
    },
    {
      key: 'grade',
      header: 'Grade',
      render: (row) => row.grade || '—',
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge tone={STATUS_TONE[row.status] ?? 'neutral'} withDot>{row.status}</Badge>,
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Employees"
        description="Employee directory, onboarding and organization structure."
        actions={
          <Button onClick={openCreate}>Add employee</Button>
        }
      />

      <DataTable
        caption="Employees"
        columns={columns}
        data={employees}
        getRowId={(row) => row.id}
        isLoading={loading}
        error={error ?? undefined}
        onRetry={load}
        onRowClick={openDetail}
        pagination={{ page, pageSize: 20, total, onPageChange: setPage }}
        emptyTitle="No employees"
        emptyDescription="Add employees to see them here."
        emptyAction={<Button onClick={openCreate}>Add employee</Button>}
      />

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Add employee"
        description="Create a new active employee record."
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={submitCreate} isLoading={saving}>Save employee</Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Name" htmlFor="name" required error={formErrors.name}>
            <TextField id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" />
          </FormField>
          <FormField label="Email" htmlFor="email" required error={formErrors.email}>
            <TextField id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="name@acme.in" />
          </FormField>
          <FormField label="Phone" htmlFor="phone">
            <TextField id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="9876500000" />
          </FormField>
          <FormField label="Date of joining" htmlFor="doj">
            <TextField id="doj" type="date" value={form.dateOfJoining} onChange={(e) => setForm({ ...form, dateOfJoining: e.target.value })} />
          </FormField>
          <FormField label="Department" htmlFor="department" required error={formErrors.departmentId}>
            <Select
              id="department"
              placeholder="Select department"
              value={form.departmentId}
              onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
              options={departments.map((d) => ({ value: d.id, label: d.name }))}
            />
          </FormField>
          <FormField label="Designation" htmlFor="designation" required error={formErrors.designationId}>
            <Select
              id="designation"
              placeholder="Select designation"
              value={form.designationId}
              onChange={(e) => setForm({ ...form, designationId: e.target.value })}
              options={designations.map((d) => ({ value: d.id, label: d.title }))}
            />
          </FormField>
          <FormField label="Grade" htmlFor="grade">
            <TextField id="grade" value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} placeholder="E1, M2…" />
          </FormField>
          <div className="sm:col-span-2">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Salary (per month)</p>
          </div>
          <FormField label="Basic" htmlFor="basic">
            <TextField id="basic" type="number" min={0} value={form.basic} onChange={(e) => setForm({ ...form, basic: e.target.value })} placeholder="0" />
          </FormField>
          <FormField label="HRA" htmlFor="hra">
            <TextField id="hra" type="number" min={0} value={form.hra} onChange={(e) => setForm({ ...form, hra: e.target.value })} placeholder="0" />
          </FormField>
          <FormField label="Allowances" htmlFor="allowances">
            <TextField id="allowances" type="number" min={0} value={form.allowances} onChange={(e) => setForm({ ...form, allowances: e.target.value })} placeholder="0" />
          </FormField>
        </div>
      </Modal>

      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail?.name ?? 'Employee'}
        description={detail?.employeeCode}
        size="lg"
      >
        {detail && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <DetailRow label="Email" value={detail.email} />
              <DetailRow label="Phone" value={detail.phone || '—'} />
              <DetailRow label="Department" value={detail.departmentName ?? detail.departmentId} />
              <DetailRow label="Designation" value={detail.designationName ?? detail.designationId} />
              <DetailRow label="Grade" value={detail.grade || '—'} />
              <DetailRow label="Date of joining" value={formatDate(detail.dateOfJoining)} />
              <DetailRow
                label="Status"
                value={<Badge tone={STATUS_TONE[detail.status] ?? 'neutral'} withDot>{detail.status}</Badge>}
              />
            </div>
            <Card padding="sm">
              <h3 className="text-sm font-semibold text-ink">Salary</h3>
              <dl className="mt-2 grid grid-cols-3 gap-3 text-sm">
                <DetailRow label="Basic" value={`₹${detail.salary.basic.toLocaleString('en-IN')}`} />
                <DetailRow label="HRA" value={`₹${detail.salary.hra.toLocaleString('en-IN')}`} />
                <DetailRow label="Allowances" value={`₹${detail.salary.allowances.toLocaleString('en-IN')}`} />
              </dl>
            </Card>
          </div>
        )}
      </Modal>
    </div>
  );
}

interface HRSEmployeeDetail extends HRMSEmployee {
  departmentName?: string;
  designationName?: string;
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className={cn('mt-0.5 text-sm text-ink', typeof value !== 'string' && 'inline-flex')}>{value}</dd>
    </div>
  );
}

export default Employees;
