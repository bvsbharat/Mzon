import React, { useState, useRef, useEffect } from "react";
// FIX: Updated import to use types.ts to prevent circular dependencies.
import { View } from "../types";
import Icon from "./Icon";
import { UserCircleIcon } from "./icons/UserCircleIcon";
import Tooltip from "./Tooltip";
import { useAuth } from "../contexts/AuthContext";

interface SidebarProps {
  activeView: View;
  setActiveView: (view: View) => void;
  credits: number;
  isOpen: boolean;
  onClose: () => void;
}

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
  isCollapsed?: boolean;
}

const NavItem: React.FC<NavItemProps> = ({
  icon,
  label,
  isActive,
  onClick,
  isCollapsed = false,
}) => {
  const buttonContent = (
    <button
      onClick={onClick}
      className={`w-full flex items-center ${
        isCollapsed ? "justify-center" : "gap-3"
      } px-3 py-2.5 rounded-lg text-sm transition-colors duration-200 ease-in-out ${
        isActive
          ? "bg-gray-800 text-white font-semibold shadow-sm"
          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 font-medium"
      }`}
      aria-current={isActive ? "page" : undefined}
    >
      {icon}
      {!isCollapsed && <span>{label}</span>}
    </button>
  );

  if (isCollapsed) {
    return (
      <Tooltip content={label} position="right">
        {buttonContent}
      </Tooltip>
    );
  }

  return buttonContent;
};

const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  setActiveView,
  credits,
  isOpen,
  onClose,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { user, logout, isLoading } = useAuth();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      setIsMenuOpen(false);
      await logout();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <>
      {/* Backdrop for mobile */}
      <div
        className={`fixed inset-0 bg-black/40 z-40 transition-opacity md:hidden ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden="true"
      ></div>
      <aside
        className={`fixed inset-y-0 left-0 z-50 ${
          isCollapsed ? "w-16" : "w-64"
        } bg-white flex flex-col border-r border-gray-200
                           transform transition-all duration-300 ease-in-out md:static md:translate-x-0 md:flex-shrink-0
                           ${isOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between shrink-0 px-4 h-16">
          <div className="hidden md:flex items-center gap-2">
            <Icon icon="sparkles" className="w-6 h-6 text-gray-800" />
            {!isCollapsed && (
              <h1 className="text-lg font-semibold tracking-tight text-gray-900">
                Mzon
              </h1>
            )}
          </div>
          {/* Collapse toggle button for desktop */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden md:block -mr-2 p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <Icon
              icon={isCollapsed ? "chevronsRight" : "chevronsLeft"}
              className="w-4 h-4"
            />
          </button>
          {/* Empty div for spacing on mobile, so close button goes right */}
          <div className="md:hidden" />
          <button
            onClick={onClose}
            className="md:hidden -mr-2 p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200"
            aria-label="Close menu"
          >
            <Icon icon="x" className="w-6 h-6" />
          </button>
        </div>

        <div className="border-t border-gray-200"></div>

        <nav className="flex-grow p-4 overflow-y-auto space-y-4">
          <div>
            {!isCollapsed && (
              <h2 className="px-3 text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-2">
                Playground
              </h2>
            )}
            <div className="space-y-1">
              <NavItem
                icon={<Icon icon="camera" className="w-5 h-5" />}
                label="Photo Studio"
                isActive={activeView === "photo"}
                onClick={() => setActiveView("photo")}
                isCollapsed={isCollapsed}
              />
              <NavItem
                icon={<Icon icon="grid" className="w-5 h-5" />}
                label="Create Variation"
                isActive={activeView === "variation"}
                onClick={() => setActiveView("variation")}
                isCollapsed={isCollapsed}
              />
              <NavItem
                icon={<Icon icon="layers" className="w-5 h-5" />}
                label="Image Composer"
                isActive={activeView === "composer"}
                onClick={() => setActiveView("composer")}
                isCollapsed={isCollapsed}
              />
              <NavItem
                icon={<Icon icon="magicWand" className="w-5 h-5" />}
                label="Magic Edit"
                isActive={activeView === "edit"}
                onClick={() => setActiveView("edit")}
                isCollapsed={isCollapsed}
              />
              <NavItem
                icon={<Icon icon="image" className="w-5 h-5" />}
                label="Image Generator"
                isActive={activeView === "imageGenerator"}
                onClick={() => setActiveView("imageGenerator")}
                isCollapsed={isCollapsed}
              />
            </div>
          </div>
          <div className="pt-4 border-t border-gray-200">
            {!isCollapsed && (
              <h2 className="px-3 text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-2">
                Social Media
              </h2>
            )}
            <div className="space-y-1">
              <NavItem
                icon={<Icon icon="newspaper" className="w-5 h-5" />}
                label="Latest News"
                isActive={activeView === "newsHub"}
                onClick={() => setActiveView("newsHub")}
                isCollapsed={isCollapsed}
              />
              <NavItem
                icon={<Icon icon="edit" className="w-5 h-5" />}
                label="Create Content"
                isActive={activeView === "contentCreator"}
                onClick={() => setActiveView("contentCreator")}
                isCollapsed={isCollapsed}
              />
              <NavItem
                icon={<Icon icon="calendar" className="w-5 h-5" />}
                label="Schedule Posts"
                isActive={activeView === "socialScheduler"}
                onClick={() => setActiveView("socialScheduler")}
                isCollapsed={isCollapsed}
              />
            </div>
          </div>
          <div className="pt-4 border-t border-gray-200">
            {!isCollapsed && (
              <h2 className="px-3 text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-2">
                Campaigns
              </h2>
            )}
            <div className="space-y-1">
              <NavItem
                icon={<Icon icon="compass" className="w-5 h-5" />}
                label="Campaign Builder"
                isActive={activeView === "campaign"}
                onClick={() => setActiveView("campaign")}
                isCollapsed={isCollapsed}
              />
              <NavItem
                icon={<Icon icon="crop" className="w-5 h-5" />}
                label="Platform Studio"
                isActive={activeView === "platform"}
                onClick={() => setActiveView("platform")}
                isCollapsed={isCollapsed}
              />
            </div>
          </div>
          <div className="pt-4 border-t border-gray-200">
            <NavItem
              icon={<Icon icon="colorPalette" className="w-5 h-5" />}
              label="Asset Library"
              isActive={activeView === "library"}
              onClick={() => setActiveView("library")}
              isCollapsed={isCollapsed}
            />
          </div>
        </nav>

        <div className="flex-shrink-0 mt-auto p-4 border-t border-gray-200">
          <div
            className={`px-3 flex items-center ${
              isCollapsed ? "justify-center" : "justify-between"
            }`}
          >
            {isCollapsed ? (
              <Tooltip content={`${credits} Credits`} position="right">
                <div className="flex items-center text-gray-600">
                  <Icon icon="bolt" className="w-5 h-5" />
                </div>
              </Tooltip>
            ) : (
              <>
                <div className="flex items-center gap-3 text-gray-600">
                  <Icon icon="bolt" className="w-5 h-5" />
                  <span className="text-sm font-medium">Credits</span>
                </div>
                <div className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                  <span className="text-sm font-bold">{credits}</span>
                </div>
              </>
            )}
          </div>

          {!isCollapsed && (
            <div className="hidden md:block pt-4">
              <div className="relative" ref={menuRef}>
                {isMenuOpen && (
                  <div className="absolute bottom-full left-0 right-0 mb-2 w-full origin-bottom rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                    <div className="py-1">
                      <button
                        className="text-gray-700 block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Account Settings
                      </button>
                      <button
                        className="text-gray-700 block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
                        onClick={handleLogout}
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <>
                            <div className="animate-spin w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full"></div>
                            Signing Out...
                          </>
                        ) : (
                          <>
                            <Icon icon="arrowLeft" className="w-3 h-3" />
                            Sign Out
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="w-full flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <UserCircleIcon className="w-8 h-8 text-gray-500 flex-shrink-0" />
                    <div className="truncate">
                      <p className="text-sm font-semibold text-gray-800 text-left truncate">
                        {user?.name || "User"}
                      </p>
                      <p className="text-xs text-gray-500 text-left truncate">
                        {user?.email || "user@example.com"}
                      </p>
                    </div>
                  </div>
                  <Icon
                    icon="chevronsUpDown"
                    className="w-5 h-5 text-gray-400"
                  />
                </button>
              </div>
            </div>
          )}
          {isCollapsed && (
            <div className="hidden md:block pt-4">
              <Tooltip
                content={user?.email || "user@example.com"}
                position="right"
              >
                <div className="flex justify-center">
                  <UserCircleIcon className="w-8 h-8 text-gray-500" />
                </div>
              </Tooltip>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
