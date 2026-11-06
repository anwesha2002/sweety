import { createBrowserRouter, Navigate } from 'react-router';
import { AppLayout } from '../components/layout/AppLayout';
import { LoginPage } from '../pages/auth/LoginPage';
import { RegisterPage } from '../pages/auth/RegisterPage';
import { DashboardPage } from '../pages/dashboard/DashboardPage';
import { ReadingsPage } from '../pages/readings/ReadingsPage';
import { ReportsPage } from '../pages/reports/ReportsPage';
import { GuestRoute } from './GuestRoute';
import { ProtectedRoute } from './ProtectedRoute';
import { RootRoute } from './RootRoute';

export const router = createBrowserRouter([
  {
    element: <RootRoute />,
    children: [
      {
        element: <GuestRoute />,
        children: [
          { path: '/login', element: <LoginPage /> },
          { path: '/register', element: <RegisterPage /> },
        ],
      },
      {
        element: <ProtectedRoute />,
        children: [
          {
            element: <AppLayout />,
            children: [
              { path: '/dashboard', element: <DashboardPage /> },
              { path: '/readings', element: <ReadingsPage /> },
              { path: '/reports', element: <ReportsPage /> },
            ],
          },
        ],
      },
      { path: '/', element: <Navigate to="/dashboard" replace /> },
      { path: '*', element: <Navigate to="/dashboard" replace /> },
    ],
  },
]);
