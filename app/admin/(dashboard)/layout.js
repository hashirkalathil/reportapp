import AdminSidebar from "../AdminSidebar";

export default function DashboardLayout({ children }) {
  return (
    <div className="flex min-h-screen bg-[#F4F6F8]">
      <AdminSidebar />
      <main className="flex-1 overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
