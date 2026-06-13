"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  LayoutDashboard, Wand2, Layers, GitBranch, Radio, BarChart3,
  Zap, Sun, Moon, LogOut, ChevronDown, PanelLeftClose, PanelLeftOpen, Menu, X,
} from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { useCurrentUser } from "@/lib/useCurrentUser";

const NAV_GROUPS = [
  {
    label: "Platform",
    items: [
      { href:"/dashboard",  label:"Dashboard",       icon:LayoutDashboard },
      { href:"/studio",     label:"Campaign Studio",  icon:Wand2 },
      { href:"/campaigns",  label:"My Campaigns",     icon:Layers },
    ],
  },
  {
    label: "Campaign",
    items: [
      { href:"/timeline",   label:"Agent Timeline",   icon:GitBranch },
      { href:"/monitor",    label:"Live Monitor",     icon:Radio },
      { href:"/insights",   label:"Insights",         icon:BarChart3 },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggle } = useTheme();
  const { user } = useCurrentUser();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    Platform: true,
    Campaign: true,
  });

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const isActive = (href: string) => {
    if (href === "/dashboard")  return pathname === "/dashboard";
    if (href === "/studio")     return pathname === "/studio";
    if (href === "/campaigns")  return pathname.startsWith("/campaigns");
    if (href === "/timeline")   return pathname.startsWith("/timeline");
    if (href === "/monitor")    return pathname.startsWith("/monitor");
    if (href === "/insights")   return pathname.startsWith("/insights");
    return false;
  };

  const handleLogout = async () => {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/login");
    router.refresh();
  };

  // Dynamic company info — fallback to Reachly while loading
  const companyName = user?.company_name || "Reachly";
  const userEmail = user?.email || "";
  const initials = companyName.slice(0, 1).toUpperCase();

  const sidebarContent = (
    <div className="sidebar-inner">
      {/* ── Logo ── */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <Zap size={16} color="white" />
        </div>
        <div className="sidebar-logo-text-container" style={{ overflow:"hidden", minWidth:0 }}>
          <div className="sidebar-logo-text">Reachly</div>
          <div className="sidebar-logo-sub">{companyName}</div>
        </div>
      </div>

      {/* ── Navigation ── */}
      <div className="sidebar-nav">
        {NAV_GROUPS.map(({ label, items }) => (
          <div key={label}>
            <button
              className="nav-group-header"
              onClick={() => setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }))}
              aria-expanded={openGroups[label]}
              style={{ width:"100%", background:"none", border:"none", cursor:"pointer" }}
            >
              <span className="nav-group-label">{label}</span>
              <ChevronDown
                size={11}
                className={`nav-group-chevron ${openGroups[label] ? "open" : "closed"}`}
              />
            </button>

            <div style={{
              overflow: "hidden",
              maxHeight: collapsed || openGroups[label] ? 400 : 0,
              transition: "max-height 0.25s cubic-bezier(0.4,0,0.2,1)",
            }}>
              {items.map(({ href, label: itemLabel, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={`nav-item${isActive(href) ? " active" : ""}`}
                  aria-current={isActive(href) ? "page" : undefined}
                  title={collapsed ? itemLabel : undefined}
                >
                  <Icon size={16} className="nav-icon" />
                  <span className="nav-label-text">{itemLabel}</span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ── User card ── */}
      <div className="user-card">
        <div className="user-avatar" title={companyName}>{initials}</div>
        <div className="user-info-container" style={{ flex:1, minWidth:0, overflow:"hidden" }}>
          <div className="user-name">{companyName}</div>
          <div className="user-role" title={userEmail}>{userEmail || "Reachly v1.0"}</div>
        </div>
        <div className="user-actions">
          <button
            className="icon-btn"
            onClick={toggle}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            title={theme === "dark" ? "Light mode" : "Dark mode"}
            id="theme-toggle-btn"
          >
            {theme === "dark" ? <Sun size={13} /> : <Moon size={13} />}
          </button>
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
  );

  return (
    <>
      {/* ── Mobile top bar ── */}
      <div className="mobile-topbar">
        <button
          className="mobile-menu-btn"
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation menu"
        >
          <Menu size={20} />
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div className="sidebar-logo-icon" style={{ width: 28, height: 28 }}>
            <Zap size={13} color="white" />
          </div>
          <span className="sidebar-logo-text" style={{ fontSize: 15 }}>Reachly</span>
        </div>
        <button
          className="icon-btn"
          onClick={toggle}
          aria-label="Toggle theme"
          style={{ marginLeft: "auto" }}
        >
          {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
        </button>
      </div>

      {/* ── Mobile overlay ── */}
      {mobileOpen && (
        <div
          className="mobile-overlay"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Mobile drawer ── */}
      <nav
        className={`sidebar mobile-drawer${mobileOpen ? " mobile-drawer-open" : ""}`}
        role="navigation"
        aria-label="Main navigation"
      >
        <button
          className="mobile-drawer-close"
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation menu"
        >
          <X size={16} />
        </button>
        {sidebarContent}
      </nav>

      {/* ── Desktop sidebar ── */}
      <nav
        className={`sidebar desktop-sidebar${collapsed ? " collapsed" : ""}`}
        role="navigation"
        aria-label="Main navigation"
      >
        {/* Desktop collapse toggle */}
        <button
          className="sidebar-collapse-btn"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? <PanelLeftOpen size={11} /> : <PanelLeftClose size={11} />}
        </button>
        {sidebarContent}
      </nav>
    </>
  );
}
