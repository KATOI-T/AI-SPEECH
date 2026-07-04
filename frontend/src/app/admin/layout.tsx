import { AdminLayout } from "@/components/admin/AdminLayout";
import { Toaster } from "@/components/ui/toaster";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AdminLayout>
      {children}
      <Toaster />
    </AdminLayout>
  );
}
