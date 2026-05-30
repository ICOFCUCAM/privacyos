import { Sidebar } from "@/components/sidebar";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const live = isSupabaseConfigured();
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border px-6 py-3">
          <p className="text-sm text-slate-400">
            Protecting <span className="font-medium text-white">Jordan Vance</span>
          </p>
          <span
            className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs font-medium text-slate-300"
            title={live ? "Connected to Supabase" : "Running on the built-in demo dataset"}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${live ? "bg-risk-low" : "bg-risk-medium"}`}
            />
            {live ? "Live data" : "Demo data"}
          </span>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
