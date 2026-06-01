import { Navigate } from "react-router-dom"

/**
 * Role based route protection
 * role = "admin" | "company"
 */
export default function AuthGuard({ children, role }) {
  const adminToken = localStorage.getItem("admin_token")
  const companyToken = localStorage.getItem("company_token")

  // 🔐 ADMIN ROUTES
  if (role === "admin") {
    return adminToken ? children : <Navigate to="/admin/login" replace />
  }

  // 🏢 COMPANY ROUTES
  if (role === "company") {
    return companyToken ? children : <Navigate to="/login" replace />
  }

  // fallback
  return <Navigate to="/login" replace />
}
