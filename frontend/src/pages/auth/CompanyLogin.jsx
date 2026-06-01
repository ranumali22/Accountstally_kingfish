import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "react-toastify"
import axios from "axios"

const API_BASE = `${import.meta.env.VITE_SERVER_URL}/api`

export default function CompanyLogin() {
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

    // 🔹 Validation
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

      // ✅ API CALL
      const res = await axios.post(
        `${API_BASE}/company/login`,
        form
      )

      if (!res.data.success) {
        toast.error(res.data.message || "Login failed")
        return
      }

      // 🔐 Save token & company data
      localStorage.setItem("company_token", res.data.token)
      localStorage.setItem(
        "company_data",
        JSON.stringify(res.data.company)
      )

      toast.success("Login successful")

      // ✅ Redirect to company dashboard
      navigate("/")
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Invalid Login ID or Password"
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-md p-8">
        <h2 className="text-2xl font-bold text-center mb-6">
          Company Login
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
              onChange={e =>
                handleChange("login_id", e.target.value)
              }
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
              onChange={e =>
                handleChange("password", e.target.value)
              }
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
