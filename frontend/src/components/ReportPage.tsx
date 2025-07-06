import React, { useState } from 'react';
import { useKeycloak } from '@react-keycloak/web';

interface ReportData {
  userId: string;
  reportId: string;
  generatedAt: string;
  period: {
    from: string;
    to: string;
  };
  prosthetics: Array<{
    id: string;
    type: string;
    model: string;
    activationDate: string;
    batteryStats: {
      averageLifetime: string;
      chargesCycles: number;
      currentHealthPercentage: number;
    };
    usageStats: {
      totalHours: number;
      averageDailyUsage: string;
      mostUsedGestures: string[];
      responseTime: string;
    };
    maintenanceHistory: Array<{
      date: string;
      type: string;
      description: string;
    }>;
  }>;
  summary: {
    totalDevices: number;
    activeDevices: number;
    alertsCount: number;
    recommendedActions: string[];
  };
}

const ReportPage: React.FC = () => {
  const { keycloak, initialized } = useKeycloak();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<ReportData | null>(null);

  const downloadReport = async () => {
    if (!keycloak?.token) {
      setError('Not authenticated');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${process.env.REACT_APP_API_URL}/reports`, {
        headers: {
          'Authorization': `Bearer ${keycloak.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication failed. Please log in again.');
        } else if (response.status === 403) {
          throw new Error('Access denied. You need prothetic_user role to view reports.');
        } else {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      }

      const result = await response.json();
      setReportData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const downloadReportFile = async () => {
    if (!keycloak?.token) {
      setError('Not authenticated');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${process.env.REACT_APP_API_URL}/reports/download`, {
        headers: {
          'Authorization': `Bearer ${keycloak.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication failed. Please log in again.');
        } else if (response.status === 403) {
          throw new Error('Access denied. You need prothetic_user role to download reports.');
        } else {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bionic_report_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!initialized) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  if (!keycloak.authenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
        <button
          onClick={() => keycloak.login()}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Login
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold mb-6 text-gray-800">BionicPRO Usage Reports</h1>
          
          <div className="flex gap-4 mb-6">
            <button
              onClick={downloadReport}
              disabled={loading}
              className={`px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors ${
                loading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {loading ? 'Loading...' : 'View Report'}
            </button>
            
            <button
              onClick={downloadReportFile}
              disabled={loading}
              className={`px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors ${
                loading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {loading ? 'Downloading...' : 'Download Report'}
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          {reportData && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold mb-2">Report Information</h3>
                  <p><strong>Report ID:</strong> {reportData.reportId}</p>
                  <p><strong>Generated:</strong> {new Date(reportData.generatedAt).toLocaleString()}</p>
                  <p><strong>Period:</strong> {new Date(reportData.period.from).toLocaleDateString()} - {new Date(reportData.period.to).toLocaleDateString()}</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold mb-2">Summary</h3>
                  <p><strong>Total Devices:</strong> {reportData.summary.totalDevices}</p>
                  <p><strong>Active Devices:</strong> {reportData.summary.activeDevices}</p>
                  <p><strong>Alerts:</strong> {reportData.summary.alertsCount}</p>
                </div>
              </div>

              {reportData.prosthetics.map((prosthetic) => (
                <div key={prosthetic.id} className="bg-white border rounded-lg p-6">
                  <h3 className="text-xl font-semibold mb-4">{prosthetic.type} - {prosthetic.model}</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <h4 className="font-semibold mb-2">Battery Statistics</h4>
                      <ul className="space-y-1 text-sm">
                        <li>Average Lifetime: {prosthetic.batteryStats.averageLifetime}</li>
                        <li>Charge Cycles: {prosthetic.batteryStats.chargesCycles}</li>
                        <li>Health: {prosthetic.batteryStats.currentHealthPercentage}%</li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">Usage Statistics</h4>
                      <ul className="space-y-1 text-sm">
                        <li>Total Hours: {prosthetic.usageStats.totalHours}</li>
                        <li>Daily Average: {prosthetic.usageStats.averageDailyUsage}</li>
                        <li>Response Time: {prosthetic.usageStats.responseTime}</li>
                      </ul>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Most Used Gestures</h4>
                    <div className="flex flex-wrap gap-2">
                      {prosthetic.usageStats.mostUsedGestures.map((gesture, index) => (
                        <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                          {gesture}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}

              <div className="bg-yellow-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-2">Recommended Actions</h3>
                <ul className="list-disc pl-5 space-y-1">
                  {reportData.summary.recommendedActions.map((action, index) => (
                    <li key={index}>{action}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportPage;