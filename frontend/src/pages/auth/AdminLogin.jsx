import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "react-toastify"

export default function AdminLogin() {
  const navigate = useNavigate()

  const [form, setForm] = useState({
    login_id: "",
    password: ""
  })

  const [loading, setLoading] = useState(false)

  const handleChange = (name, value) => {
    setForm(prev => ({ ...prev, [name]: value }))
  }

const handleLogin = async e => {
  e.preventDefault()

  if (!form.login_id) {
    toast.error("Login ID is required")
    return
  }

  if (!form.password) {
    toast.error("Password is required")
    return
  }

  try {
    setLoading(true)

    // ✅ ADMIN TOKEN SET KARO
    localStorage.setItem("admin_token", "logged_in")

    toast.success("Admin login successful")

    // ✅ ADMIN DASHBOARD PAR REDIRECT
    navigate("/admin")
  } catch (err) {
    toast.error("Invalid Login ID or Password")
  } finally {
    setLoading(false)
  }
}



  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-md p-8">
        <h2 className="text-2xl font-bold text-center mb-6">
          Admin Login
        </h2>

        <form onSubmit={handleLogin} className="space-y-4">
          {/* Login ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Login ID
            </label>
            <input
              type="text"
              value={form.login_id}
              onChange={e => handleChange("login_id", e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter Login ID"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={form.password}
              onChange={e => handleChange("password", e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter Password"
            />
          </div>

          {/* Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  )
}
