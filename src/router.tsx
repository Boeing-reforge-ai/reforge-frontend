import { createBrowserRouter } from 'react-router';
import AppLayout from '@/components/AppLayout';
import ScanPage from '@/pages/ScanPage';
import AnalysisPage from '@/pages/AnalysisPage';
import ScenarioPage from '@/pages/ScenarioPage';
import ProposalPage from '@/pages/ProposalPage';

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <ScanPage /> },
      { path: '/scans/:scanId/analysis', element: <AnalysisPage /> },
      { path: '/scans/:scanId/scenarios', element: <ScenarioPage /> },
      { path: '/proposals/:proposalId', element: <ProposalPage /> },
    ],
  },
]);
