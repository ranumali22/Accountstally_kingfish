import { SidebarProvider, useSidebar } from "../../context/SidebarContext"
import { Outlet } from "react-router"
import AppHeader from "../../components/company/AppHeader"
import Backdrop from "../../components/company/Backdrop"
import AppSidebar from "../../components/company/AppSidebar"

const LayoutContent = () => {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar()

  return (
    <div className="min-h-screen ">
      <div>
        <AppSidebar />
        <Backdrop />
      </div>
      {/* <div
        className={`flex-1 transition-all duration-300 ease-in-out ${
          isExpanded || isHovered ? "lg:ml-[290px]" : "lg:ml-[90px]"
        } ${isMobileOpen ? "ml-0" : ""}`}
      > */}<div
        className={`
    flex-1 min-h-screen
    transition-all duration-300 ease-in-out
    ${isMobileOpen ? "ml-0" : isExpanded || isHovered ? "lg:ml-[220px]" : "lg:ml-[90px]"}
  `}
      >
        {/* 
        <AppHeader />
        <div className="p-4 mx-auto max-w-(--breakpoint-2xl) md:p-4"> */}
        <AppHeader />
        <div className=" mx-auto max-w-(--breakpoint-2xl)  overflow-x-hidden">

          <Outlet />
        </div>
      </div>
    </div>
  )
}

const AppLayout = () => {
  return (
    <SidebarProvider>
      <LayoutContent />
    </SidebarProvider>
  )
}

export default AppLayout
