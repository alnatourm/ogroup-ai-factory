import React, { useState, useEffect, useCallback } from 'react';
import type { AppRoute } from './types/routes.js';
import { APPROVED_ROUTES } from './types/routes.js';
import { AppShell } from './components/common/AppShell.js';
import { WorkspaceOnboardingPage } from './pages/WorkspaceOnboardingPage.js';
import { ProviderConnectionsPage } from './pages/ProviderConnectionsPage.js';
import { GatewayPlaygroundPage } from './pages/GatewayPlaygroundPage.js';
import { WorkflowBuilderPage } from './pages/WorkflowBuilderPage.js';
import { WorkflowRunsPage } from './pages/WorkflowRunsPage.js';
import { DocumentIntelligencePage } from './pages/DocumentIntelligencePage.js';
import { UsageDashboardPage } from './pages/UsageDashboardPage.js';
import { DataPolicyPage } from './pages/DataPolicyPage.js';

function getInitialRoute(): AppRoute {
  if (typeof window !== 'undefined' && window.location.hash) {
    const hash = window.location.hash.replace(/^#\/?/, '').trim();
    const valid = APPROVED_ROUTES.find((r) => r.id === hash);
    if (valid) return valid.id;
  }
  return 'workspace-onboarding';
}

export const App: React.FC = () => {
  const [currentRoute, setCurrentRoute] = useState<AppRoute>(getInitialRoute);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#\/?/, '').trim();
      const match = APPROVED_ROUTES.find((r) => r.id === hash);
      if (match && match.id !== currentRoute) {
        setCurrentRoute(match.id);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [currentRoute]);

  const handleNavigate = useCallback((route: AppRoute) => {
    setCurrentRoute(route);
    if (typeof window !== 'undefined') {
      window.location.hash = `#/${route}`;
    }
  }, []);

  const renderActivePage = () => {
    switch (currentRoute) {
      case 'workspace-onboarding':
        return (
          <WorkspaceOnboardingPage
            onCompleted={() => handleNavigate('provider-connections')}
          />
        );
      case 'provider-connections':
        return <ProviderConnectionsPage />;
      case 'gateway-playground':
        return <GatewayPlaygroundPage />;
      case 'workflow-builder':
        return <WorkflowBuilderPage />;
      case 'workflow-runs':
        return <WorkflowRunsPage />;
      case 'document-intelligence':
        return <DocumentIntelligencePage />;
      case 'usage-dashboard':
        return <UsageDashboardPage />;
      case 'data-policy':
        return <DataPolicyPage />;
      default:
        return <WorkspaceOnboardingPage />;
    }
  };

  return (
    <AppShell currentRoute={currentRoute} onNavigate={handleNavigate}>
      {renderActivePage()}
    </AppShell>
  );
};
