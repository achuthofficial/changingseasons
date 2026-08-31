import { useSyncExternalStore } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext.jsx'
import { getConnectionState, subscribeConnection } from './lib/connectionStatus.js'
import ServerDown from './pages/ServerDown.jsx'
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
import RecentlyDeleted from './pages/RecentlyDeleted.jsx'
import './styles/shared.css'

function App() {
  const connection = useSyncExternalStore(subscribeConnection, getConnectionState)

  // Sits above AuthProvider and the router deliberately: when the database
  // is unreachable, signing in fails too, so a gate any lower down would
  // strand the user on a login form that cannot possibly work. Unmounting
  // the tree also tears down the realtime channels, and they reconnect
  // cleanly when the app remounts.
  if (connection === 'offline') return <ServerDown />

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
            <Route path="recently-deleted" element={<RecentlyDeleted />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
