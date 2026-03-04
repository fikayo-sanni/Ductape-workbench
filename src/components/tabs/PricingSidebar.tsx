import { Receipt, TrendingUp, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWorkbenchStore } from "@/stores/workbench-store";

type BillingView = "expenses" | "revenue" | "bundles";

const NAV_ITEMS: { id: BillingView; label: string; description: string; icon: typeof Receipt; disabled?: boolean }[] = [
  {
    id: "expenses",
    label: "Expenses",
    description: "Costs and payouts",
    icon: Receipt,
  },
  {
    id: "revenue",
    label: "Revenue",
    description: "Income and MRR",
    icon: TrendingUp,
    disabled: true,
  },
  {
    id: "bundles",
    label: "Bundles",
    description: "Pricing plans",
    icon: Package,
    disabled: true,
  },
];

export default function PricingSidebar() {
  const { billingView, setBillingView } = useWorkbenchStore();

  return (
    <div className="w-full h-full flex flex-col border-r border-grey-300 bg-white min-w-0">
      {/* Header - matches ProductsSidebar / EnvironmentsSidebar */}
      <div className="p-4 border-b border-grey-400">
        <h2 className="text-lg font-semibold text-grey mb-3">Pricing & Billing</h2>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5" aria-label="Billing sections">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = billingView === item.id;
          const isDisabled = item.disabled;

          return (
            <button
              key={item.id}
              type="button"
              disabled={isDisabled}
              onClick={() => !isDisabled && setBillingView(item.id)}
              className={cn(
                "w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                isDisabled && "cursor-not-allowed text-grey-700 border border-transparent",
                !isDisabled && isActive
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : !isDisabled && "text-grey-700 hover:bg-grey-100 border border-transparent"
              )}
              aria-current={isActive ? "page" : undefined}
              aria-disabled={isDisabled}
            >
              <span
                className={cn(
                  "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md",
                  isDisabled && "bg-grey-100 text-grey-600",
                  !isDisabled && isActive ? "bg-primary text-white" : !isDisabled && "bg-grey-100 text-grey-600"
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <span className="block text-sm font-medium truncate">
                  {item.label}
                </span>
                <span
                  className={cn(
                    "block text-xs truncate mt-0.5",
                    isDisabled && "text-grey-500",
                    !isDisabled && isActive ? "text-primary/80" : !isDisabled && "text-grey-500"
                  )}
                >
                  {item.description}
                </span>
              </div>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
