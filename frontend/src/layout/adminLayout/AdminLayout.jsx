import { SidebarProvider, useSidebar } from "../../context/SidebarContext"
import { Outlet } from "react-router-dom"

import AdminHeader from "../../components/admin/Header"
import AdminSidebar from "../../components/admin/Sidebar"
import Backdrop from "../../components/company/Backdrop" // same backdrop reuse

const AdminLayoutContent = () => {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar()

  return (
    <div className="min-h-screen xl:flex">
      {/* Sidebar + Backdrop */}
      <div>
        <AdminSidebar />
        <Backdrop />
      </div>

      {/* Main Content */}
      <div
        className={`flex-1 transition-all duration-300 ease-in-out
          ${isExpanded || isHovered ? "lg:ml-[290px]" : "lg:ml-[90px]"}
          ${isMobileOpen ? "ml-0" : ""}
        `}
      >
        <AdminHeader />

        <div className="p-4 mx-auto max-w-(--breakpoint-2xl) md:p-6">
          <Outlet />
        </div>
      </div>
    </div>
  )
}

const AdminLayout = () => {
  return (
    <SidebarProvider>
      <AdminLayoutContent />
    </SidebarProvider>
  )
}

export default AdminLayout
