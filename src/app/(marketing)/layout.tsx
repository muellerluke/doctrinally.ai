import { MarketingHeader } from "@/components/layouts/marketing-header";
import { MarketingFooter } from "@/components/layouts/marketing-footer";
import { MarketingSchema } from "@/components/schema/marketing-schema";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <MarketingSchema />
      <MarketingHeader />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
    </>
  );
}
