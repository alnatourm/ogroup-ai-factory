import React, { useCallback, useEffect, useState } from 'react';
import type { AppRoute } from './types/routes.js';
import { APPROVED_ROUTES } from './types/routes.js';
import { getApiConfig } from './api/config.js';
import { AUTHENTICATION_REQUIRED_EVENT } from './api/client.js';
import { AccessGate } from './components/common/AccessGate.js';
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
    const valid = APPROVED_ROUTES.find((route) => route.id === hash);
    if (valid) return valid.id;
  }
  return 'workspace-onboarding';
}

export const App: React.FC = () => {
  const [currentRoute, setCurrentRoute] = useState<AppRoute>(getInitialRoute);
  const [authenticated, setAuthenticated] = useState(() => Boolean(getApiConfig().apiKey));
  const [authReason, setAuthReason] = useState<'session_expired' | undefined>();

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#\/?/, '').trim();
      const match = APPROVED_ROUTES.find((route) => route.id === hash);
      if (match && match.id !== currentRoute) setCurrentRoute(match.id);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [currentRoute]);

  useEffect(() => {
    const handleAuthenticationRequired = () => {
      setAuthReason('session_expired');
      setAuthenticated(false);
    };
    window.addEventListener(AUTHENTICATION_REQUIRED_EVENT, handleAuthenticationRequired);
    return () => window.removeEventListener(AUTHENTICATION_REQUIRED_EVENT, handleAuthenticationRequired);
  }, []);

  const handleAuthenticated = useCallback(() => {
    setAuthReason(undefined);
    setAuthenticated(true);
  }, []);

  const handleNavigate = useCallback((route: AppRoute) => {
    setCurrentRoute(route);
    if (typeof window !== 'undefined') window.location.hash = `#/${route}`;
  }, []);

  if (!authenticated) {
    return <AccessGate reason={authReason} onAuthenticated={handleAuthenticated} />;
  }

  const pages: Record<AppRoute, React.ReactNode> = {
    'workspace-onboarding': <WorkspaceOnboardingPage onCompleted={() => handleNavigate('provider-connections')} />,
    'provider-connections': <ProviderConnectionsPage />,
    'gateway-playground': <GatewayPlaygroundPage />,
    'workflow-builder': <WorkflowBuilderPage />,
    'workflow-runs': <WorkflowRunsPage />,
    'document-intelligence': <DocumentIntelligencePage />,
    'usage-dashboard': <UsageDashboardPage />,
    'data-policy': <DataPolicyPage />,
  };

  return (
    <AppShell currentRoute={currentRoute} onNavigate={handleNavigate}>
      {pages[currentRoute]}
    </AppShell>
  );
};
