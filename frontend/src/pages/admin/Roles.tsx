import * as React from 'react';
import { Badge, Card, PageHeader, SkeletonText, useToast } from '@/components';
import { api, type RoleOption } from '@/lib/api';
import { cn } from '@/lib/utils';

const ALL_PERMISSIONS = [
  'dashboard',
  'accounting',
  'hrms',
  'manufacturing',
  'inventory',
  'procurement',
  'projects',
  'quality',
  'crm',
  'compliance',
  'dms',
  'ess',
  'ai',
  'users',
  'settings',
  'reports',
];

export default function RolesPage() {
  const { notify } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [roles, setRoles] = React.useState<RoleOption[]>([]);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    setLoading(true);
    api.getRoles()
      .then((res) => setRoles(res.roles ?? []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function togglePermission(roleKey: string, perm: string) {
    setSaving(true);
    try {
      const role = roles.find((r) => r.key === roleKey);
      if (!role) return;
      const has = role.permissions.includes(perm);
      const newPerms = has
        ? role.permissions.filter((p) => p !== perm)
        : [...role.permissions, perm];
      setRoles((prev) => prev.map((r) => r.key === roleKey ? { ...r, permissions: newPerms } : r));
      notify({ title: has ? 'Permission removed' : 'Permission added', tone: 'success' });
    } catch (err: any) {
      notify({ title: 'Could not update permissions', description: err.message, tone: 'danger' });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <PageHeader title="Roles & Permissions" subtitle="Manage access controls." />
        <Card padding="lg"><SkeletonText lines={8} /></Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-6xl">
        <PageHeader title="Roles & Permissions" subtitle="Manage access controls." />
        <Card padding="lg" className="text-danger">{error}</Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader title="Roles & Permissions" subtitle="Manage access controls for each role." />

      <Card padding="md" className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-canvas/60 text-ink-muted">
              <th className="px-4 py-3 font-medium">Permission</th>
              {roles.map((role) => (
                <th key={role.key} className="px-4 py-3 font-medium text-center">
                  <div className="flex flex-col items-center gap-1">
                    <span>{role.label}</span>
                    {role.key === 'owner' && <Badge tone="ai" className="text-xs">Full</Badge>}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ALL_PERMISSIONS.map((perm) => (
              <tr key={perm} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-medium text-ink capitalize">{perm}</td>
                {roles.map((role) => {
                  const has = role.permissions.includes('*') || role.permissions.includes(perm);
                  return (
                    <td key={role.key} className="px-4 py-3 text-center">
                      <button
                        onClick={() => togglePermission(role.key, perm)}
                        disabled={saving || role.key === 'owner'}
                        className={cn(
                          'inline-flex h-5 w-5 items-center justify-center rounded border transition-colors',
                          has
                            ? 'border-primary bg-primary text-white'
                            : 'border-border-strong bg-surface hover:border-primary/50',
                          role.key === 'owner' && 'opacity-50 cursor-not-allowed'
                        )}
                        aria-label={`${role.label} ${perm} ${has ? 'enabled' : 'disabled'}`}
                      >
                        {has && (
                          <svg viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
