// components/admin/Dashboard.tsx - FIXED without canViewPlant
import { useEffect, useState } from 'react';
import { useDataAccess } from '@/app/hooks/useDataAccess';
import { useUserAccess } from '@/app/hooks/useUserAccess';

interface DashboardData {
  incidents: any[];
  summary: {
    total: number;
    byStatus: Record<string, number>;
    byPlant: Record<string, number>;
  };
}

export default function Dashboard() {
  const { userAccess, loading: accessLoading } = useDataAccess(); // ✅ REMOVED canViewPlant
  const { userAccess: userAccessData } = useUserAccess();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  // ✅ ADDED: Local function to check if user can view plant data
  const canViewPlant = (hierarchyString: string): boolean => {
    if (!userAccessData) return false;
    
    // Enterprise users can see all plants
    if (userAccessData.accessScope === 'ENTERPRISE') return true;
    
    // Other users can only see data from their hierarchy
    return hierarchyString.startsWith(userAccessData.hierarchyString);
  };

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!userAccess || !userAccessData?.email) return;
      
      try {
        setLoading(true);
        
        // ✅ FIXED: Include email parameter
        const response = await fetch(`/api/get-filtered-incidents?email=${encodeURIComponent(userAccessData.email)}&limit=1000`);
        const data = await response.json();
        
        if (data.success) {
          setDashboardData({
            incidents: data.data || [],
            summary: calculateSummary(data.data || [])
          });
        } else {
          console.error('Dashboard API error:', data.error);
        }
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (userAccess && userAccessData?.email) {
      loadDashboardData();
    }
  }, [userAccess, userAccessData?.email]);

  const calculateSummary = (incidents: any[]) => {
    const summary = {
      total: incidents.length,
      byStatus: {} as Record<string, number>,
      byPlant: {} as Record<string, number>
    };

    incidents.forEach(incident => {
      // Count by status
      const status = incident.status || 'Unknown';
      summary.byStatus[status] = (summary.byStatus[status] || 0) + 1;

      // ✅ FIXED: Use local canViewPlant function
      if (incident.hierarchyString && canViewPlant(incident.hierarchyString)) {
        const plant = incident.hierarchyString.split('>').pop() || 'Unknown';
        summary.byPlant[plant] = (summary.byPlant[plant] || 0) + 1;
      }
    });

    return summary;
  };

  if (accessLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#cb4154]"></div>
      </div>
    );
  }

  if (!userAccess || !userAccessData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to view this dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* User Access Info */}
      <div className="mb-6 bg-white p-4 rounded-lg shadow border-l-4 border-[#cb4154]">
        <h2 className="text-lg font-semibold text-[#8b1538] mb-2">Your Access Level</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700">Level:</span>
            <span className="ml-2 text-[#cb4154] font-bold">{userAccessData.level}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Scope:</span>
            <span className="ml-2">{userAccessData.accessScope}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Role:</span>
            <span className="ml-2">{userAccessData.roleTitle}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Hierarchy:</span>
            <span className="ml-2 text-xs">{userAccessData.hierarchyString}</span>
          </div>
        </div>
      </div>

      {/* Dashboard Summary */}
      {dashboardData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Incidents</h3>
            <p className="text-3xl font-bold text-[#cb4154]">{dashboardData.summary.total}</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">By Status</h3>
            <div className="space-y-1">
              {Object.entries(dashboardData.summary.byStatus).map(([status, count]) => (
                <div key={status} className="flex justify-between text-sm">
                  <span>{status}:</span>
                  <span className="font-semibold">{count}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">By Location</h3>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {Object.entries(dashboardData.summary.byPlant).slice(0, 5).map(([plant, count]) => (
                <div key={plant} className="flex justify-between text-sm">
                  <span className="truncate">{plant}:</span>
                  <span className="font-semibold">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recent Incidents Table */}
      {dashboardData && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Recent Incidents</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Submission ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {dashboardData.incidents.slice(0, 10).map((incident) => (
                  <tr key={incident.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#cb4154]">
                      {incident.submissionId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        incident.status === 'Completed' ? 'bg-green-100 text-green-800' :
                        incident.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {incident.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {incident.hierarchyString?.split('>').pop() || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {incident.createdAt ? new Date(incident.createdAt).toLocaleDateString() : 'Unknown'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
