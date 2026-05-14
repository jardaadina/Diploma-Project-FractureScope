import { createBrowserRouter, Navigate } from 'react-router';
import { RootLayout } from './components/layouts/RootLayout';
import { OverviewPage } from './pages/OverviewPage';
import { AuthPage } from './pages/AuthPage';
import { TestPage } from './pages/TestPage';
import { StatisticsPage } from './pages/StatisticsPage';
import { RadiographiesPage } from './pages/RadiographiesPage';

export const router = createBrowserRouter([
    {
        path: '/',
        Component: RootLayout,
        children: [
            { index: true, Component: OverviewPage },
            { path: 'auth', Component: AuthPage },
            { path: 'test', Component: TestPage },
            { path: 'radiographies', Component: RadiographiesPage },
            { path: 'statistics', Component: StatisticsPage },
            { path: '*', element: <Navigate to="/" replace /> },
        ],
    },
]);