import * as React from 'react';
import {
  Badge,
  Button,
  Card,
  DataTable,
  type Column,
  EmptyState,
  FormField,
  Modal,
  Select,
  SkeletonText,
  TextField,
  useToast,
} from '@/components';
import { TableToolbar } from '@/components/toolbar/TableToolbar';
import { api, type UserRow, type RoleOption } from '@/lib/api';

const STATUS_TONE: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  active: 'success',
  inactive: 'neutral',
  suspended: 'danger',
};

const ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: 'owner', label: 'Owner' },
  { value: 'admin', label: 'Admin' },
  { value: 'finance', label: 'Finance' },
  { value: 'accountant', label: 'Accountant' },
  { value: 'hr', label: 'HR' },
  { value: 'manager', label: 'Manager' },
  { value: 'employee', label: 'Employee' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'suspended', label: 'Suspended' },
];

export default function UsersPage() {
  const { notify } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [users, setUsers] = React.useState<UserRow[]>([]);
  const [roles, setRoles] = React.useState<RoleOption[]>([]);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [filters, setFilters] = React.useState<{ search?: string; role?: string; status?: string }>({});

  const [createOpen, setCreateOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState({
    id: '',
    name: '',
    email: '',
    password: '',
    role: 'employee',
    employeeId: '',
    module: 'ess',
    status: 'active',
  });
  const [resetOpen, setResetOpen] = React.useState(false);
  const [resetId, setResetId] = React.useState('');
  const [resetPwd, setResetPwd] = React.useState('');

  function load() {
    setLoading(true);
    setError(null);
    return Promise.all([
      api.getUsers({ ...filters, pageSize: 100 }),
      api.getRoles(),
    ])
      .then(([userRes, roleRes]) => {
        setUsers(userRes.rows ?? []);
        setRoles(roleRes.roles ?? []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  React.useEffect(() => { load(); }, [filters]);

  function openCreate() {
    setForm({ id: '', name: '', email: '', password: '', role: 'employee', employeeId: '', module: 'ess', status: 'active' });
    setCreateOpen(true);
  }

  function openEdit(user: UserRow) {
    setForm({
      id: user.id,
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      employeeId: user.employeeId ?? '',
      module: user.module ?? 'ess',
      status: user.status,
    });
    setEditOpen(true);
  }

  async function submitCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.createUser(form);
      notify({ title: 'User created', tone: 'success' });
      setCreateOpen(false);
      await load();
    } catch (err: any) {
      notify({ title: 'Could not create user', description: err.message, tone: 'danger' });
    } finally {
      setSaving(false);
    }
  }

  async function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const { id, password, ...rest } = form;
      await api.updateUser(id, { ...rest, ...(password ? { password } : {}) });
      notify({ title: 'User updated', tone: 'success' });
      setEditOpen(false);
      await load();
    } catch (err: any) {
      notify({ title: 'Could not update user', description: err.message, tone: 'danger' });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await api.deleteUser(id);
      notify({ title: 'User deleted', tone: 'success' });
      await load();
    } catch (err: any) {
      notify({ title: 'Could not delete user', description: err.message, tone: 'danger' });
    }
  }

  async function handleActivate(id: string) {
    try {
      await api.activateUser(id);
      notify({ title: 'User activated', tone: 'success' });
      await load();
    } catch (err: any) {
      notify({ title: 'Could not activate user', description: err.message, tone: 'danger' });
    }
  }

  async function handleSuspend(id: string) {
    try {
      await api.suspendUser(id);
      notify({ title: 'User suspended', tone: 'success' });
      await load();
    } catch (err: any) {
      notify({ title: 'Could not suspend user', description: err.message, tone: 'danger' });
    }
  }

  function openReset(id: string) {
    setResetId(id);
    setResetPwd('');
    setResetOpen(true);
  }

  async function submitReset(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.resetUserPassword(resetId, resetPwd);
      notify({ title: 'Password reset', tone: 'success' });
      setResetOpen(false);
    } catch (err: any) {
      notify({ title: 'Could not reset password', description: err.message, tone: 'danger' });
    }
  }

  const columns: Column<UserRow>[] = [
    { key: 'name', header: 'Name', sortable: true },
    { key: 'email', header: 'Email', hideBelow: 'md' },
    {
      key: 'role',
      header: 'Role',
      render: (row) => {
        const role = roles.find((r) => r.key === row.role);
        return <Badge tone="neutral">{role?.label ?? row.role}</Badge>;
      },
    },
    {
      key: 'module',
      header: 'Module',
      hideBelow: 'lg',
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge tone={STATUS_TONE[row.status] ?? 'neutral'} withDot>{row.status}</Badge>,
    },
    {
      key: 'updatedAt',
      header: 'Last updated',
      width: '140px',
      hideBelow: 'md',
      render: (row) => row.updatedAt?.slice(0, 10),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => (
        <div className="flex justify-end gap-1">
          <Button size="sm" variant="ghost" onClick={() => openEdit(row)}>Edit</Button>
          {row.status === 'active' ? (
            <Button size="sm" variant="ghost" onClick={() => handleSuspend(row.id)}>Suspend</Button>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => handleActivate(row.id)}>Activate</Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => openReset(row.id)}>Reset</Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(row.id)}>Delete</Button>
        </div>
      ),
    },
  ];

  const moduleOptions = [
    { value: 'superadmin', label: 'Super Admin' },
    { value: 'finance', label: 'Finance' },
    { value: 'hrms', label: 'HRMS' },
    { value: 'manufacturing', label: 'Manufacturing' },
    { value: 'ess', label: 'ESS' },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <TableToolbar
        title="Users"
        subtitle="Manage user accounts, roles, and access."
        data={users}
        columns={columns}
        filename="users"
        filters={filters}
        onFiltersChange={setFilters}
        onReset={() => setFilters({})}
        showFilterBar
        filterProps={{
          searchPlaceholder: 'Search users...',
          showStatus: true,
          statusOptions: STATUS_OPTIONS,
        }}
        selectedIds={selectedIds}
        onSelectionClear={() => setSelectedIds(new Set())}
        bulkActions={[
          { label: 'Export selected', onClick: () => { /* export */ } },
        ]}
        extraActions={<Button onClick={openCreate}>+ Add user</Button>}
      >
        {loading ? (
          <Card padding="lg"><SkeletonText lines={6} /></Card>
        ) : error ? (
          <EmptyState variant="error" title="Couldn't load users" description={error} />
        ) : (
          <DataTable
            caption="Users"
            columns={columns}
            data={users}
            getRowId={(row) => row.id}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            emptyTitle="No users"
            emptyDescription="Add your first user to get started."
            emptyAction={<Button onClick={openCreate}>+ Add user</Button>}
          />
        )}
      </TableToolbar>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Add user"
        description="Create a new user account."
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" form="user-create-form" isLoading={saving} loadingLabel="Creating">Create user</Button>
          </>
        }
      >
        <form id="user-create-form" className="space-y-4" onSubmit={submitCreate}>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Full name" htmlFor="u-name" required>
              <TextField id="u-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </FormField>
            <FormField label="Email" htmlFor="u-email" required>
              <TextField id="u-email" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Password" htmlFor="u-pwd" required>
              <TextField id="u-pwd" type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
            </FormField>
            <FormField label="Role" htmlFor="u-role" required>
              <Select id="u-role" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} options={ROLE_OPTIONS} />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Employee ID (optional)" htmlFor="u-emp">
              <TextField id="u-emp" value={form.employeeId} onChange={(e) => setForm((f) => ({ ...f, employeeId: e.target.value }))} />
            </FormField>
            <FormField label="Default module" htmlFor="u-mod">
              <Select id="u-mod" value={form.module} onChange={(e) => setForm((f) => ({ ...f, module: e.target.value }))} options={moduleOptions} />
            </FormField>
          </div>
        </form>
      </Modal>

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit user"
        description={`Update ${form.name}`}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditOpen(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" form="user-edit-form" isLoading={saving} loadingLabel="Saving">Save changes</Button>
          </>
        }
      >
        <form id="user-edit-form" className="space-y-4" onSubmit={submitEdit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Full name" htmlFor="ue-name" required>
              <TextField id="ue-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </FormField>
            <FormField label="Email" htmlFor="ue-email" required>
              <TextField id="ue-email" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="New password (leave blank to keep current)" htmlFor="ue-pwd">
              <TextField id="ue-pwd" type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
            </FormField>
            <FormField label="Role" htmlFor="ue-role" required>
              <Select id="ue-role" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} options={ROLE_OPTIONS} />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Employee ID" htmlFor="ue-emp">
              <TextField id="ue-emp" value={form.employeeId} onChange={(e) => setForm((f) => ({ ...f, employeeId: e.target.value }))} />
            </FormField>
            <FormField label="Status" htmlFor="ue-status">
              <Select id="ue-status" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} options={STATUS_OPTIONS} />
            </FormField>
          </div>
        </form>
      </Modal>

      <Modal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="Reset password"
        description="Set a new password for this user."
        footer={
          <>
            <Button variant="secondary" onClick={() => setResetOpen(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" form="reset-pwd-form" isLoading={saving} loadingLabel="Saving">Reset password</Button>
          </>
        }
      >
        <form id="reset-pwd-form" className="space-y-4" onSubmit={submitReset}>
          <FormField label="New password" htmlFor="rp-pwd" required>
            <TextField id="rp-pwd" type="password" value={resetPwd} onChange={(e) => setResetPwd(e.target.value)} placeholder="Min 6 characters" />
          </FormField>
        </form>
      </Modal>
    </div>
  );
}
