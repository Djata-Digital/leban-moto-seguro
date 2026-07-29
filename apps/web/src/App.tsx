import {
  Navigate,
  Route,
  Routes,
} from 'react-router-dom';

import {
  getHomeRoute,
  getStoredUser,
} from './auth/auth';

import {
  GlobalNotifications,
} from './components/notifications/GlobalNotifications';

import {
  AppLayout,
} from './layouts/AppLayout';

import {
  OwnerLayout,
} from './layouts/OwnerLayout';

import {
  ProtectedRoute,
} from './routes/ProtectedRoute';

import {
  LoginPage,
} from './pages/auth/LoginPage';

import {
  DashboardPage,
} from './pages/dashboard/DashboardPage';

import {
  DriversPage,
} from './pages/drivers/DriversPage';

import {
  GpsPage,
} from './pages/gps/GpsPage';

import {
  MotorcyclesPage,
} from './pages/motorcycles/MotorcyclesPage';

import {
  OwnersPage,
} from './pages/owners/OwnersPage';

import {
  PolicePage,
} from './pages/police/PolicePage';

import {
  TheftReportsPage,
} from './pages/theft-reports/TheftReportsPage';

import {
  MonitoringMapPage,
} from './pages/monitoring/MonitoringMapPage';

import {
  UsersPage,
} from './pages/users/UsersPage';

import {
  AlertsPage,
} from './pages/alerts/AlertsPage';

import {
  NocPage,
} from './pages/noc/NocPage';

import {
  GeofencesPage,
} from './pages/geofences/GeofencesPage';

import {
  PlaybackPage,
} from './pages/playback/PlaybackPage';

import {
  GpsSimulatorPage,
} from './pages/gps-simulator/GpsSimulatorPage';

import {
  Motorcycle360Page,
} from './pages/motorcycle-360/Motorcycle360Page';

import {
  PoliceDispatchesPage,
} from './pages/police-dispatches/PoliceDispatchesPage';

import {
  RecoveryReportPage,
} from './pages/recovery-report/RecoveryReportPage';

import {
  VerifyMotorcyclePage,
} from './pages/public/VerifyMotorcyclePage';

import {
  PoliceMobilePage,
} from './pages/police-mobile/PoliceMobilePage';

import {
  OwnerDashboardPage,
} from './pages/owner/OwnerDashboardPage';

import {
  OwnerGeofencesPage,
} from './pages/owner/OwnerModulePage';

import {
  OwnerDriversPage,
} from './pages/owner/OwnerDriversPage';

import {
  OwnerAlertsPage,
} from './pages/owner/OwnerAlertsPage';

import {
  OwnerCreateReportPage,
  OwnerReportDetailsPage,
  OwnerReportsPage,
} from './pages/owner/OwnerReportsPage';

import { OwnerMotorcyclesPage } from './pages/owner/OwnerMotorcyclesPage';
import { OwnerProfilePage } from './pages/owner/OwnerProfilePage';
import { OwnerTrackingPage } from './pages/owner/OwnerTrackingPage';
import { OwnerRouteHistoryPage } from './pages/owner/OwnerRouteHistoryPage';
import { OwnerMotorcycleDetailsPage } from './pages/owner/OwnerMotorcycleDetailsPage';

const adminRoles = [
  'ADMIN',
  'GLOBAL_ADMIN',
  'SUPER_ADMIN',
  'OPERATOR',
  'OPERADOR',
  'CENTRAL',
  'NOC',
];

const ownerRoles = [
  'OWNER',
  'PROPRIETARIO',
  'PROPRIETÁRIO',
  'MOTORCYCLE_OWNER',
];

const policeRoles = [
  'POLICE',
  'POLICE_OFFICER',
  'POLICIA',
  'POLÍCIA',
  ...adminRoles,
];

function HomeRedirect() {
  const user = getStoredUser();

  return (
    <Navigate
      to={getHomeRoute(user)}
      replace
    />
  );
}

export default function App() {
  return (
    <>
      <GlobalNotifications />

      <Routes>
        <Route
          path="/login"
          element={<LoginPage />}
        />

        <Route
          path="/verify/:token"
          element={<VerifyMotorcyclePage />}
        />

        <Route
          path="/police-mobile"
          element={
            <ProtectedRoute
              roles={policeRoles}
              policeAccessTypes={['PATROL']}
            >
              <PoliceMobilePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/police-operations"
          element={
            <ProtectedRoute
              roles={policeRoles}
              policeAccessTypes={['OPERATIONS']}
            >
              <PoliceDispatchesPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/owner"
          element={
            <ProtectedRoute
              roles={ownerRoles}
            >
              <OwnerLayout />
            </ProtectedRoute>
          }
        >
          <Route
            index
            element={<OwnerDashboardPage />}
          />

          <Route
            path="motorcycles"
            element={<OwnerMotorcyclesPage />}
          />

          <Route
            path="motorcycles/:id"
            element={
              <OwnerMotorcycleDetailsPage />
            }
          />

          <Route
            path="tracking"
            element={<OwnerTrackingPage />}
          />

          <Route
            path="history"
            element={
              <OwnerRouteHistoryPage />
            }
          />

          <Route
            path="drivers"
            element={<OwnerDriversPage />}
          />

          <Route
            path="reports"
            element={<OwnerReportsPage />}
          />

          <Route
            path="reports/new"
            element={
              <OwnerCreateReportPage />
            }
          />

          <Route
            path="reports/:id"
            element={<OwnerReportDetailsPage />}
          />

          <Route
            path="geofences"
            element={<OwnerGeofencesPage />}
          />

          <Route
            path="alerts"
            element={<OwnerAlertsPage />}
          />

          <Route
            path="profile"
            element={<OwnerProfilePage />}
          />
        </Route>

        <Route
          path="/"
          element={
            <ProtectedRoute
              roles={adminRoles}
            >
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route
            index
            element={<DashboardPage />}
          />

          <Route
            path="owners"
            element={<OwnersPage />}
          />

          <Route
            path="drivers"
            element={<DriversPage />}
          />

          <Route
            path="motorcycles"
            element={<MotorcyclesPage />}
          />

          <Route
            path="police"
            element={<PolicePage />}
          />

          <Route
            path="theft-reports"
            element={<TheftReportsPage />}
          />

          <Route
            path="gps"
            element={<GpsPage />}
          />

          <Route
            path="monitoring"
            element={<MonitoringMapPage />}
          />

          <Route
            path="users"
            element={<UsersPage />}
          />

          <Route
            path="alerts"
            element={<AlertsPage />}
          />

          <Route
            path="noc"
            element={<NocPage />}
          />

          <Route
            path="geofences"
            element={<GeofencesPage />}
          />

          <Route
            path="playback"
            element={<PlaybackPage />}
          />

          <Route
            path="gps-simulator"
            element={<GpsSimulatorPage />}
          />

          <Route
            path="motorcycles/:id/360"
            element={<Motorcycle360Page />}
          />

          <Route
            path="police/:id/dispatches"
            element={
              <PoliceDispatchesPage />
            }
          />

          <Route
            path="recovery-reports/:dispatchId"
            element={<RecoveryReportPage />}
          />
        </Route>

        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <HomeRedirect />
            </ProtectedRoute>
          }
        />

        <Route
          path="*"
          element={<HomeRedirect />}
        />
      </Routes>
    </>
  );
}