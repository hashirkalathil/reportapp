/* Auth layout — no sidebar, full-screen centered */
export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen bg-[#F4F6F8] flex items-center justify-center p-4">
      {children}
    </div>
  );
}
