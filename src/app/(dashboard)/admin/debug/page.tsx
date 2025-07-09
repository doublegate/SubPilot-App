import { auth } from '@/server/auth';
import { api } from '@/trpc/server';

export default async function DebugPage() {
  const session = await auth();

  let systemInfo = null;
  let error = null;

  try {
    systemInfo = await api.admin.getSystemInfo();
  } catch (e) {
    error = e;
  }

  return (
    <div className="p-8">
      <h1 className="mb-4 text-2xl font-bold">Debug Admin Access</h1>

      <div className="space-y-4">
        <div className="rounded border p-4">
          <h2 className="mb-2 font-semibold">Session Info:</h2>
          <pre className="overflow-auto rounded bg-gray-100 p-2">
            {JSON.stringify(session, null, 2)}
          </pre>
        </div>

        <div className="rounded border p-4">
          <h2 className="mb-2 font-semibold">API Call Result:</h2>
          {systemInfo ? (
            <pre className="overflow-auto rounded bg-green-100 p-2">
              {JSON.stringify(systemInfo, null, 2)}
            </pre>
          ) : (
            <pre className="overflow-auto rounded bg-red-100 p-2">
              Error: {error?.toString()}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
