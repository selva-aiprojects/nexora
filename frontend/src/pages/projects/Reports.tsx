import * as React from 'react';
import {
  Card,
  DataTable,
  type Column,
  EmptyState,
  PageHeader,
  Select,
  SkeletonText,
  formatINR,
} from '@/components';
import { api, type ProjectPlRow } from '@/lib/api';

export default function ProjectReports() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [report, setReport] = React.useState<ProjectPlRow[]>([]);
  const [projectId, setProjectId] = React.useState('');
  const [projects, setProjects] = React.useState<{ id: string; name: string }[]>([]);

  function load() {
    setLoading(true);
    setError(null);
    return Promise.all([
      api.getProjectPl(projectId ? { projectId } : undefined),
      api.getProjects(),
    ])
      .then(([res, proj]) => {
        setReport(res.rows ?? []);
        setProjects(proj.rows ?? []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  React.useEffect(() => { load(); }, [projectId]);

  const columns: Column<ProjectPlRow>[] = [
    { key: 'name', header: 'Project', sortable: true },
    {
      key: 'revenue',
      header: 'Budget (Revenue)',
      align: 'right',
      sortable: true,
      render: (row) => <span className="tabular-nums">{formatINR(row.revenue)}</span>,
    },
    {
      key: 'cost',
      header: 'Cost',
      align: 'right',
      sortable: true,
      render: (row) => <span className="tabular-nums">{formatINR(row.cost)}</span>,
    },
    {
      key: 'profit',
      header: 'Profit',
      align: 'right',
      sortable: true,
      render: (row) => <span className="tabular-nums font-medium" style={{ color: row.profit >= 0 ? 'var(--nx-success)' : 'var(--nx-danger)' }}>{formatINR(row.profit)}</span>,
    },
    { key: 'wbsCount', header: 'WBS', align: 'center' },
    { key: 'timeEntries', header: 'Entries', align: 'center' },
  ];

  const projectOptions = projects.map((p) => ({ value: p.id, label: p.name }));

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Project P&L"
        subtitle="Project-level profit and loss summary."
      />

      <div className="flex items-center gap-3">
        <Select
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          placeholder="All projects"
          options={[{ value: '', label: 'All projects' }, ...projectOptions]}
        />
      </div>

      {loading ? (
        <Card padding="lg"><SkeletonText lines={6} /></Card>
      ) : error ? (
        <EmptyState variant="error" title="Couldn't load report" description={error} />
      ) : (
        <DataTable
          caption="Project P&L"
          columns={columns}
          data={report}
          getRowId={(row) => row.projectId}
          emptyTitle="No data"
          emptyDescription="Projects will appear here once created."
        />
      )}
    </div>
  );
}
