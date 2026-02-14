import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useWorkbenchStore } from "@/stores/workbench-store";

type BillingView =
  | "expenses"
  | "revenue"
  | "bundles";

export default function PricingSidebar() {

  const { billingView, setBillingView } = useWorkbenchStore();
  const [open, setOpen] = useState(true);

  const items: { id: BillingView; label: string }[] = [
    {
      id: "expenses",
      label: "View Expenses",
    },
    {
      id: "revenue",
      label: "View Revenue",
    },
    {
      id: "bundles",
      label: "View Bundles",
    },
  ];

  return (
    <div className="w-64 h-full border-r bg-white px-3 py-4">

      {/* TITLE */}
      <p className="text-xl font-bold text-grey mb-3">
        Pricing & Billing
      </p>

      {/* DROPDOWN */}
      <div className="relative">

        {/* TRIGGER */}
        <button
          onClick={() => setOpen(!open)}
          className="w-full h-9 flex items-center justify-between px-3 py-2 text-sm border rounded-md bg-gray-50 hover:bg-gray-100"
        >
          <span className="text-sm font-semibold text-grey-700">
            {items.find(i => i.id === billingView)?.label}
          </span>

          <ChevronDown
            className={cn(
              "h-4 w-4 transition",
              open && "rotate-180"
            )}
          />
        </button>

        {/* MENU */}
        {open && (
          <div className="mt-1 border rounded-md shadow-sm bg-white overflow-hidden">

            {items.map((item) => {

              const active = billingView === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setBillingView(item.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 text-sm font-semibold text-[#171717] hover:bg-gray-100",
                    active && "bg-gray-100"
                  )}
                >
                  <span>{item.label}</span>

                  {active && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </button>
              );
            })}

          </div>
        )}

      </div>

    </div>
  );
}
