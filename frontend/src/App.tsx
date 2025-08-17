import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from './stores/authStore';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import DashboardTest from './pages/DashboardTest';
import Portfolios from './pages/Portfolios';
import PortfolioDetail from './pages/PortfolioDetail';
import Transactions from './pages/Transactions';
import Assets from './pages/Assets';
import Import from './pages/Import';
import Settings from './pages/Settings';
import Reports from './pages/Reports';
import Dividends from './pages/Dividends';
import Optimization from './pages/Optimization';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const token = useAuthStore((state) => state.token);
  
  console.log('PrivateRoute - Auth check:', { isAuthenticated, hasToken: !!token, redirecting: !isAuthenticated });
  
  if (!isAuthenticated) {
    console.log('PrivateRoute - Not authenticated, redirecting to /login');
    return <Navigate to="/login" />;
  }
  
  console.log('PrivateRoute - Authenticated, rendering children');
  return <>{children}</>;
}

function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const token = useAuthStore((state) => state.token);
  const loadUser = useAuthStore((state) => state.loadUser);

  // Initialize auth state on app load
  useEffect(() => {
    console.log('App - Initializing auth state...', { isAuthenticated, hasToken: !!token });
    if (token && !isAuthenticated) {
      console.log('App - Found token but not authenticated, loading user...');
      loadUser();
    }
  }, [token, isAuthenticated, loadUser]);

  return (
    <Routes>
      <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/dashboard" />} />
      <Route path="/register" element={!isAuthenticated ? <Register /> : <Navigate to="/dashboard" />} />
      
      {/* Debug route to test auth without redirect */}
      <Route 
        path="/debug" 
        element={
          <div style={{ padding: '20px', fontFamily: 'monospace' }}>
            <h2>🐛 Debug Auth State</h2>
            <p><strong>isAuthenticated:</strong> {String(isAuthenticated)}</p>
            <p><strong>hasToken:</strong> {String(!!token)}</p>
            <p><strong>localStorage:</strong> {localStorage.getItem('auth-storage')?.slice(0, 100)}...</p>
            <hr />
            <p>Se tudo estiver correto, <a href="/dashboard">clique aqui para ir ao dashboard</a></p>
            <p>Se não estiver logado, <a href="/login">faça login primeiro</a></p>
          </div>
        } 
      />
      
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="dashboard-test" element={<DashboardTest />} />
        <Route path="portfolios" element={<Portfolios />} />
        <Route path="portfolios/:id" element={<PortfolioDetail />} />
        <Route path="transactions" element={<Transactions />} />
        <Route path="assets" element={<Assets />} />
        <Route path="import" element={<Import />} />
        <Route path="reports" element={<Reports />} />
        <Route path="dividends" element={<Dividends />} />
        <Route path="optimization" element={<Optimization />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}

export default App;
