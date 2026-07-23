export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-sidebar-bg">
      <div className="w-full max-w-md px-4">
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-xl font-bold text-white">
            H
          </div>
          <h1 className="mt-4 text-2xl font-bold text-white">HomeBase</h1>
          <p className="mt-1 text-sm text-sidebar-text">
            Property Portfolio Management
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
