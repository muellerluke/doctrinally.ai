export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <img src="/logo-transparent-bg.png" alt="Loading" className="h-10 w-10 animate-pulse rounded-xl dark:hidden" />
      <img src="/logo-orange-bg.png" alt="Loading" className="hidden h-10 w-10 animate-pulse rounded-xl dark:block" />
    </div>
  );
}
