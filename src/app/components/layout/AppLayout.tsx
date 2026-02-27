import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';
import { 
  LayoutDashboard, 
  Calendar as CalendarIcon, 
  CheckSquare, 
  Users, 
  Settings, 
  Bell, 
  Search, 
  Plus, 
  LogOut,
  Menu
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { usePermission } from '../../context/PermissionContext';

export function AppLayout() {
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);
  const { currentUser, members } = usePermission();

  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { name: 'Calendar', icon: CalendarIcon, path: '/calendar' },
    { name: 'Tasks', icon: CheckSquare, path: '/tasks' },
    { name: 'Team', icon: Users, path: '/team' },
    { name: 'Settings', icon: Settings, path: '/settings' },
  ];

  return (
    <div className="flex h-screen w-full bg-[#FAFAFA] text-[#333]">
      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col bg-white border-r border-[#E7E7E7] transition-transform duration-300 md:translate-x-0 md:static",
          !isSidebarOpen && "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center px-6 border-b border-[#E7E7E7]">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0079FF] text-white font-bold text-lg">
              P
            </div>
            <span className="text-xl font-bold tracking-tight text-[#1A1A1A]">Poten Manager</span>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-4 py-6">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <NavLink
                key={item.name}
                to={item.path}
                className={({ isActive }) => cn(
                  "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-[#E7F6F5] text-[#0079FF]"
                    : "text-[#666666] hover:bg-gray-50 hover:text-[#1A1A1A]"
                )}
              >
                <item.icon className={cn("h-5 w-5", isActive ? "text-[#0079FF]" : "text-[#999]")} />
                {item.name}
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-[#E7E7E7] p-4">
          <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-3">
            <img 
              src={currentUser.avatar} 
              alt={currentUser.name} 
              className="h-10 w-10 rounded-full object-cover border border-[#E7E7E7]" 
            />
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium text-[#1A1A1A]">{currentUser.name}</p>
              <p className="truncate text-xs text-[#666666]">{currentUser.jobTitle ?? "Premium Plan"}</p>
            </div>
            <button className="text-[#999] hover:text-[#1A1A1A]">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-16 items-center justify-between border-b border-[#E7E7E7] bg-white px-6 md:px-8">
          <div className="flex items-center gap-4">
            <button 
              className="md:hidden p-2 -ml-2 text-[#666]"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              <Menu className="h-6 w-6" />
            </button>
            <h1 className="text-xl font-bold text-[#1A1A1A]">
              {navItems.find(i => i.path === location.pathname)?.name || 'Dashboard'}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="hidden md:flex items-center gap-2 rounded-full border border-[#E7E7E7] bg-gray-50 px-3 py-2 w-64 focus-within:ring-2 focus-within:ring-[#0079FF] focus-within:border-transparent transition-all">
              <Search className="h-4 w-4 text-[#999]" />
              <input 
                type="text" 
                placeholder="Search tasks, goals..." 
                className="bg-transparent text-sm outline-none w-full placeholder:text-[#999]"
              />
            </div>

            {/* Team Avatars */}
            <div className="flex items-center -space-x-2">
              {members.map((member) => (
                <img 
                  key={member.id}
                  src={member.avatar}
                  alt={member.name}
                  className="h-8 w-8 rounded-full border-2 border-white object-cover ring-1 ring-gray-100"
                  title={member.name}
                />
              ))}
              <button className="flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-[#999] bg-white text-[#666] hover:border-[#0079FF] hover:text-[#0079FF] transition-colors z-10" title="Invite Member">
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <div className="h-6 w-px bg-[#E7E7E7]" />

            <button className="relative p-2 text-[#666] hover:bg-gray-50 rounded-full transition-colors">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-[#FF4D4F] ring-2 ring-white" />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-[#FAFAFA] p-6 md:p-8">
          <div className="mx-auto max-w-[1600px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}