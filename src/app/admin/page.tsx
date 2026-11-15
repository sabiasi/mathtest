import { AdminView } from "@/features/admin/AdminView";

// /admin — the founders' page. Who may see it is checked on the server (/api/admin/*, table public.admins).
export default function AdminPage() {
  return <AdminView />;
}
