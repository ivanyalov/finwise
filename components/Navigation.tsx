"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, TrendingUp, TrendingDown, PiggyBank, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/income", icon: TrendingUp, label: "Income" },
  { href: "/expenses", icon: TrendingDown, label: "Expenses" },
  { href: "/savings", icon: PiggyBank, label: "Savings" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 glass border-t-2 border-gray-200 dark:border-gray-800 z-50">
      <div className="flex justify-around items-center py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 px-4 py-2 rounded-2xl transition-all duration-200",
                "text-gray-700 dark:text-gray-400 hover:text-indigo-700 dark:hover:text-indigo-400 hover:bg-indigo-200 dark:hover:bg-gray-800/50",
                isActive && "text-indigo-600 dark:text-indigo-400 bg-indigo-300 dark:bg-indigo-900/20 font-semibold"
              )}
            >
              <Icon size={22} />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

