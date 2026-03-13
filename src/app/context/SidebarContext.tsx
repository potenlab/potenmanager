import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from "react";

interface SidebarContextType {
  width: number;
  setWidth: (width: number) => void;
  isResizing: boolean;
  startResizing: () => void;
  isMobile: boolean;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  isCollapsed: boolean;
  toggleCollapse: () => void;
}

const defaultValue: SidebarContextType = {
  width: 300,
  setWidth: () => {},
  isResizing: false,
  startResizing: () => {},
  isMobile: false,
  isOpen: false,
  setIsOpen: () => {},
  toggleSidebar: () => {},
  isCollapsed: false,
  toggleCollapse: () => {},
};

const SidebarContext = createContext<SidebarContextType>(defaultValue);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [width, setWidth] = useState(300);
  const [isResizing, setIsResizing] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try { return localStorage.getItem('poten_sidebar_collapsed') === 'true'; } catch { return false; }
  });

  const toggleSidebar = useCallback(() => setIsOpen((prev) => !prev), []);
  const toggleCollapse = useCallback(() => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem('poten_sidebar_collapsed', String(next)); } catch {}
      return next;
    });
  }, []);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setIsOpen(false); // close drawer when resizing to desktop
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const startResizing = () => {
    if (isMobile) return;
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = Math.max(200, Math.min(600, e.clientX));
      setWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    } else {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing]);

  return (
    <SidebarContext.Provider value={{ width, setWidth, isResizing, startResizing, isMobile, isOpen, setIsOpen, toggleSidebar, isCollapsed, toggleCollapse }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  return useContext(SidebarContext);
}