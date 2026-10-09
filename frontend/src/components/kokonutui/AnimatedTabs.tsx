import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export interface TabItem {
  id: string;
  label: string;
}

interface AnimatedTabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export function AnimatedTabs({
  tabs,
  activeTab,
  onChange,
  className,
}: AnimatedTabsProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-6 border-b border-gray-200 text-sm font-medium",
        className,
      )}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              "relative pb-2 transition-colors duration-200 text-sm",
              isActive
                ? "text-neutral-900 font-semibold"
                : "text-gray-500 hover:text-neutral-800",
            )}
          >
            <span>{tab.label}</span>
            {isActive && (
              <motion.span
                layoutId="activeTabUnderline"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-neutral-950"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
