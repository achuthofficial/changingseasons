import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext.jsx'
import RequireAuth from './components/RequireAuth.jsx'
import Layout from './layout/Layout.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Users from './pages/Users.jsx'
import Orders from './pages/Orders.jsx'
import Staff from './pages/Staff.jsx'
import Transactions from './pages/Transactions.jsx'
import Expenses from './pages/Expenses.jsx'
import History from './pages/History.jsx'
import './styles/shared.css'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            element={
              <RequireAuth>
                <Layout />
              </RequireAuth>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="users" element={<Users />} />
            <Route path="orders" element={<Orders />} />
            <Route path="staff" element={<Staff />} />
            <Route path="transactions" element={<Transactions />} />
            <Route path="expenses" element={<Expenses />} />
            <Route path="history" element={<History />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
