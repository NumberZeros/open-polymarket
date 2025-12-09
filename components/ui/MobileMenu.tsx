/**
 * Mobile Menu Component
 * 
 * Hamburger menu for mobile navigation with animations.
 */

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu,
  X,
  TrendingUp,
  Wallet,
  PieChart,
  ArrowDownCircle,
  ArrowUpCircle,
  Settings,
  ExternalLink,
  Shield,
} from "lucide-react";

// ============= Types =============

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  external?: boolean;
}

// ============= Constants =============

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Markets", icon: TrendingUp },
  { href: "/portfolio", label: "Portfolio", icon: PieChart },
  { href: "/wallet", label: "Wallet", icon: Wallet },
  { href: "/deposit", label: "Deposit", icon: ArrowDownCircle },
  { href: "/withdraw", label: "Withdraw", icon: ArrowUpCircle },
  { href: "/trading-setup", label: "Trading Setup", icon: Settings },
];

const EXTERNAL_LINKS: NavItem[] = [
  { href: "https://polymarket.com", label: "Polymarket", icon: ExternalLink, external: true },
];

// ============= Component =============

export function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Close menu on route change
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <div className="md:hidden">
      {/* Hamburger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg text-[#a1a1aa] hover:text-white hover:bg-[#27272a] transition-colors"
        aria-label={isOpen ? "Close menu" : "Open menu"}
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            />

            {/* Menu Panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed top-0 right-0 bottom-0 w-72 bg-[#121214] border-l border-[#27272a] z-50 overflow-y-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-[#27272a]">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-6 h-6 text-[#8b5cf6]" />
                  <span className="font-bold text-lg">BetHub</span>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-lg text-[#a1a1aa] hover:text-white hover:bg-[#27272a] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation */}
              <nav className="p-4 space-y-1">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`
                        flex items-center gap-3 px-4 py-3 rounded-xl transition-all
                        ${isActive 
                          ? "bg-[#8b5cf6]/10 text-[#8b5cf6]" 
                          : "text-[#a1a1aa] hover:text-white hover:bg-[#27272a]"
                        }
                      `}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{item.label}</span>
                      {isActive && (
                        <motion.div
                          layoutId="mobile-nav-indicator"
                          className="ml-auto w-1.5 h-1.5 bg-[#8b5cf6] rounded-full"
                        />
                      )}
                    </Link>
                  );
                })}
              </nav>

              {/* Divider */}
              <div className="mx-4 border-t border-[#27272a]" />

              {/* External Links */}
              <div className="p-4 space-y-1">
                <p className="px-4 py-2 text-xs font-medium text-[#71717a] uppercase tracking-wider">
                  External
                </p>
                {EXTERNAL_LINKS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <a
                      key={item.href}
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 px-4 py-3 rounded-xl text-[#a1a1aa] hover:text-white hover:bg-[#27272a] transition-all"
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{item.label}</span>
                      <ExternalLink className="w-4 h-4 ml-auto" />
                    </a>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-[#27272a] bg-[#121214]">
                <div className="flex items-center gap-2 text-xs text-[#71717a]">
                  <Shield className="w-4 h-4 text-[#8b5cf6]" />
                  <span>Powered by Polymarket</span>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============= Bottom Navigation (Alternative) =============

export function BottomNav() {
  const pathname = usePathname();

  const bottomItems: NavItem[] = [
    { href: "/", label: "Markets", icon: TrendingUp },
    { href: "/portfolio", label: "Portfolio", icon: PieChart },
    { href: "/wallet", label: "Wallet", icon: Wallet },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#121214]/95 backdrop-blur-lg border-t border-[#27272a] z-50 safe-area-inset-bottom">
      <nav className="flex items-center justify-around py-2">
        {bottomItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-all
                ${isActive 
                  ? "text-[#8b5cf6]" 
                  : "text-[#71717a]"
                }
              `}
            >
              <Icon className={`w-6 h-6 ${isActive ? "scale-110" : ""} transition-transform`} />
              <span className="text-xs font-medium">{item.label}</span>
              {isActive && (
                <motion.div
                  layoutId="bottom-nav-indicator"
                  className="absolute -bottom-0.5 w-8 h-0.5 bg-[#8b5cf6] rounded-full"
                />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
