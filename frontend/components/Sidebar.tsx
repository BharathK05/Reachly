"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  LayoutDashboard, Wand2, Layers, GitBranch, Radio, BarChart3,
  Zap, Sun, Moon, LogOut, ChevronDown, PanelLeftClose, PanelLeftOpen,
} from "lucide-react";
import { useTheme } from "./ThemeProvider";

const PLATFORM_ITEMS = [
  { href: "/dashboard",  label: "Dashboard",       icon: LayoutDashboard },
  { href: "/studio",     label: "Campaign Studio",  icon: Wand2 },
  { href: "/campaigns",  label: "My Campaigns",     icon: Layers },
];

const CAMPAIGN_ITEMS = [
  { href: "/timeline",   label: "Agent Timeline",   icon: GitBranch },
  { href: "/monitor",    label: "Live Monitor",      icon: Radio },
  { href: "/insights",   label: "Insights",          icon: BarChart3 },
];

function NavGroup({
  label,
  items,
  collapsed: sidebarCollapsed,
  isActive,
}: {
  label: string;
  items: { href: string; label: string; icon: React.ElementType }[];
  collapsed: boolean;
  isActive: (href: string) => boolean;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div>
      {!sidebarCollapsed && (
        <button
          onClick={() => setOpen(!open)}
          className="nav-group-header"
          style={{ width: "100%", background: "none", border: "none", cursor: "pointer" }}
          aria-expanded={open}
        >
          <span className="nav-group-label">{label}</span>
          <ChevronDown
            size={12}
            className={`nav-group-chevron ${open ? "open" : "closed"}`}
          />
        </button>
      )}

      <div
        className={`collapsible-body ${open || sidebarCollapsed ? "open" : "closed"}`}
        style={{ maxHeight: open || sidebarCollapsed ? "400px" : "0" }}
      >
        {items.map(({ href, label: itemLabel, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`nav-item ${isActive(href) ? "active" : ""}`}
            aria-current={isActive(href) ? "page" : undefined}
            title={sidebarCollapsed ? itemLabel : undefined}
          >
            <Icon className="nav-icon" />
            <span className="nav-label-text">{itemLabel}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggle } = useTheme();
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (href: string) => {
    if (href === "/timeline")  return pathname.startsWith("/timeline");
    if (href === "/monitor")   return pathname.startsWith("/monitor");
    if (href === "/insights")  return pathname.startsWith("/insights");
    if (href === "/campaigns") return pathname.startsWith("/campaigns");
    return pathname === href;
  };

  const handleLogout = async () => {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/login");
    router.refresh();
  };

  return (
    <nav
      className={`sidebar ${collapsed ? "collapsed" : ""}`}
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Collapse toggle button */}
      <button
        className="sidebar-collapse-btn"
        onClick={() => setCollapsed(!collapsed)}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        title={collapsed ? "Expand" : "Collapse"}
      >
        {collapsed
          ? <PanelLeftOpen size={12} />
          : <PanelLeftClose size={12} />
        }
      </button>

      <div className="sidebar-inner">
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <Zap size={16} color="white" />
          </div>
          {!collapsed && (
            <div>
              <div className="sidebar-logo-text">Reachly</div>
              <div className="sidebar-logo-sub">Starbucks India</div>
            </div>
          )}
        </div>

        {/* Nav groups */}
        <div className="sidebar-nav">
          <NavGroup
            label="Platform"
            items={PLATFORM_ITEMS}
            collapsed={collapsed}
            isActive={isActive}
          />
          <div style={{ height: 4 }} />
          <NavGroup
            label="Campaign"
            items={CAMPAIGN_ITEMS}
            collapsed={collapsed}
            isActive={isActive}
          />
        </div>

        {/* User card */}
        <div className="user-card">
          <div className="user-avatar" title="Admin">A</div>

          {!collapsed && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="user-name">Admin</div>
              <div className="user-role">Reachly v1.0</div>
            </div>
          )}

          <div className="user-actions">
            {/* Theme toggle */}
            <button
              className="icon-btn"
              onClick={toggle}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              title={theme === "dark" ? "Light mode" : "Dark mode"}
              id="theme-toggle-btn"
            >
              {theme === "dark"
                ? <Sun size={13} />
                : <Moon size={13} />
              }
            </button>

            {/* Logout */}
            <button
              className="icon-btn"
              onClick={handleLogout}
              aria-label="Sign out"
              title="Sign out"
              id="logout-btn"
            >
              <LogOut size={13} />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
