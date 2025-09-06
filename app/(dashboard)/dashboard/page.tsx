 
import SafetyMetricsDashboard from '@/app/components/dashboard/SafetyMetricsDashboard';

export default function HomePage() {
  return (
    <div className="container mx-auto p-4">
       
      {/* Safety Metrics Dashboard */}
      <SafetyMetricsDashboard />
      
      {/* Other content */}
      <div className="mt-8">
        {/* Your existing home page content */}
      </div>
    </div>
  );
}
