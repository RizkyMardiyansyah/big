import {useGet} from '../../lib/api';import {Head,Err,Empty,Need} from '../../lib/ui';
export default function AuditLogs(){const q=useGet('/admin/audit-logs');
 return <Need p="audit_logs.view"><Head title="Audit log" sub="Latest 100 events"/><Err e={q.error}/><div className="card overflow-x-auto"><table className="w-full text-left"><thead><tr><th>Time</th><th>Action</th><th>Resource</th><th>Summary</th></tr></thead><tbody>
 {q.data?.map(l=><tr key={l.id} className="border-t border-line"><td className="whitespace-nowrap">{new Date(l.created_at).toLocaleString('en-US')}</td><td>{l.action}</td><td>{l.resource}</td><td className="text-sub">{l.summary}</td></tr>)}</tbody></table>{q.data?.length===0&&<Empty t="No entries yet."/>}</div></Need>}
