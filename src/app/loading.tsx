export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <img src="/logo-light-mode.png" alt="Loading" className="h-10 w-10 animate-pulse rounded-xl dark:hidden" />
      <img src="/logo-dark-mode.png" alt="Loading" className="hidden h-10 w-10 animate-pulse rounded-xl dark:block" />
    </div>
  );
}
