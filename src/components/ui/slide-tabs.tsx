import { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface Tab {
  path: string;
  label: string;
  icon?: LucideIcon;
  exact?: boolean;
}

interface SlideTabsProps {
  tabs: Tab[];
  className?: string;
}

interface Position {
  left: number;
  width: number;
  opacity: number;
}

export function SlideTabs({ tabs, className }: SlideTabsProps) {
  const location = useLocation();
  const [position, setPosition] = useState<Position>({
    left: 0,
    width: 0,
    opacity: 0,
  });
  const [activePosition, setActivePosition] = useState<Position>({
    left: 0,
    width: 0,
    opacity: 1,
  });
  const containerRef = useRef<HTMLDivElement>(null);

  const isActive = (tab: Tab) => {
    if (tab.exact) {
      return location.pathname === tab.path;
    }
    return location.pathname.startsWith(tab.path);
  };

  useEffect(() => {
    const activeTab = tabs.find((tab) => isActive(tab));
    if (activeTab && containerRef.current) {
      const activeElement = containerRef.current.querySelector(
        `[data-path="${activeTab.path}"]`
      ) as HTMLElement;
      if (activeElement) {
        const { offsetLeft, offsetWidth } = activeElement;
        setActivePosition({
          left: offsetLeft,
          width: offsetWidth,
          opacity: 1,
        });
      }
    }
  }, [location.pathname, tabs]);

  return (
    <div
      ref={containerRef}
      onMouseLeave={() => {
        setPosition((prev) => ({
          ...prev,
          opacity: 0,
        }));
      }}
      className={cn(
        "relative flex w-fit rounded-full border border-border bg-card p-1",
        className
      )}
    >
      {tabs.map((tab) => (
        <Tab
          key={tab.path}
          tab={tab}
          isActive={isActive(tab)}
          setPosition={setPosition}
        />
      ))}

      {/* Hover indicator */}
      <motion.div
        animate={{
          ...position,
        }}
        className="absolute z-0 h-8 rounded-full bg-muted"
        style={{ top: "4px" }}
      />

      {/* Active indicator */}
      <motion.div
        animate={{
          ...activePosition,
        }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="absolute z-0 h-8 rounded-full bg-primary"
        style={{ top: "4px" }}
      />
    </div>
  );
}

interface TabProps {
  tab: Tab;
  isActive: boolean;
  setPosition: (position: Position) => void;
}

function Tab({ tab, isActive, setPosition }: TabProps) {
  const ref = useRef<HTMLAnchorElement>(null);

  return (
    <Link
      ref={ref}
      to={tab.path}
      data-path={tab.path}
      onMouseEnter={() => {
        if (!ref.current) return;
        const { offsetLeft, offsetWidth } = ref.current;
        setPosition({
          left: offsetLeft,
          width: offsetWidth,
          opacity: 1,
        });
      }}
      className={cn(
        "relative z-10 flex items-center gap-2 cursor-pointer px-4 py-1.5 text-sm font-medium transition-colors",
        isActive
          ? "text-primary-foreground"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {tab.icon && <tab.icon className="h-4 w-4" />}
      <span className="hidden sm:inline">{tab.label}</span>
    </Link>
  );
}
