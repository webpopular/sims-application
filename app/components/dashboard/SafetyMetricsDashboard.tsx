// app/components/dashboard/SafetyMetricsDashboard.tsx
'use client';

import { useEffect, useState } from 'react';
import { generateClient } from 'aws-amplify/data';
import { type Schema } from '@/amplify/data/schema';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  LineElement,
  PointElement,
  Title, 
  Tooltip, 
  Legend,
  ArcElement,
  BubbleController,
  RadialLinearScale,
  ScatterController,
  ChartOptions
} from 'chart.js';
import { Bar, Line, Pie, Bubble, Scatter } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale, 
  LinearScale, 
  BarElement, 
  LineElement,
  PointElement,
  Title, 
  Tooltip, 
  Legend,
  ArcElement,
  BubbleController,
  RadialLinearScale,
  ScatterController
);

const client = generateClient<Schema>();

// Define types for chart data
interface ChartDataset {
  label: string;
  data: number[] | {x: number, y: number, r: number}[];
  backgroundColor: string | string[];
  borderColor: string | string[];
  borderWidth: number;
  fill?: boolean;
  tension?: number;
  pointRadius?: number;
  pointHoverRadius?: number;
}

interface ChartDataType {
  labels: string[];
  datasets: ChartDataset[];
}

interface BubbleChartDataType {
  datasets: {
    label: string;
    data: {x: number, y: number, r: number}[];
    backgroundColor: string | string[];
    borderColor?: string | string[];
    borderWidth?: number;
  }[];
}

interface Submission {
  id: string | null;
  submissionId: string;
  recordType?: string;
  status?: string;
  location?: string;
  submissionType?: string;
  dateOfIncident?: string | null;
  injuryCategory?: string;
  locationOnSite?: string;
  // Other properties...
  
  lessonsLearned?: Array<{
    uploadedAt: string;
    uploadedBy: string;
    llid: string | null;
    lessonsLearnedAuthor: string | null;
    lessonsLearnedTitle: string | null;
    lessonsLearnedSegment: string | null;
    lessonsLearnedApprovalStatus?: string | null;
    lessonsLearnedSentforApprovalBy?: string | null;
    lessonsLearnedSentforApprovalAt?: string | null;
    lessonsLearnedSenttoApprover?: string | null;
    [key: string]: any;
  } | null> | null;
  
  [key: string]: any;
}

export default function SafetyMetricsDashboard() {
  const [injuryData, setInjuryData] = useState<ChartDataType>({ labels: [], datasets: [] });
  const [yearlyInjuryData, setYearlyInjuryData] = useState<ChartDataType>({ labels: [], datasets: [] });
  const [injuryTrendData, setInjuryTrendData] = useState<ChartDataType>({ labels: [], datasets: [] });
  const [injuryBubbleData, setInjuryBubbleData] = useState<BubbleChartDataType>({ datasets: [] });
  const [injuryByLocationData, setInjuryByLocationData] = useState<ChartDataType>({ labels: [], datasets: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('12months');

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: submissions } = await client.models.Submission.list();
        
        if (submissions) {
          const typedSubmissions = submissions as unknown as Submission[];
          processInjuryData(typedSubmissions);
          processYearlyInjuryData(typedSubmissions);
          processInjuryTrendData(typedSubmissions);
          processInjuryBubbleData(typedSubmissions);
          processInjuryByLocationData(typedSubmissions);
        }
      } catch (error) {
        console.error('Error fetching data for charts:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  const processInjuryData = (submissions: Submission[]) => {
    // Group injuries by month
    const injuriesByMonth: Record<string, number> = {};
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    submissions.forEach(submission => {
      if (submission.recordType === 'INJURY_REPORT' && submission.dateOfIncident) {
        const date = new Date(submission.dateOfIncident);
        const monthIndex = date.getMonth();
        const monthName = months[monthIndex];
        
        if (!injuriesByMonth[monthName]) {
          injuriesByMonth[monthName] = 0;
        }
        injuriesByMonth[monthName]++;
      }
    });
    
    setInjuryData({
      labels: Object.keys(injuriesByMonth),
      datasets: [
        {
          label: 'Injuries by Month',
          data: Object.values(injuriesByMonth),
          backgroundColor: 'rgba(203, 65, 84, 0.6)',
          borderColor: 'rgba(203, 65, 84, 1)',
          borderWidth: 1,
        },
      ],
    });
  };

  const processYearlyInjuryData = (submissions: Submission[]) => {
    // Group injuries by year
    const injuriesByYear: Record<string, number> = {};
    
    submissions.forEach(submission => {
      if (submission.recordType === 'INJURY_REPORT' && submission.dateOfIncident) {
        const date = new Date(submission.dateOfIncident);
        const year = date.getFullYear().toString();
        
        if (!injuriesByYear[year]) {
          injuriesByYear[year] = 0;
        }
        injuriesByYear[year]++;
      }
    });
    
    // Sort years chronologically
    const sortedYears = Object.keys(injuriesByYear).sort();
    
    setYearlyInjuryData({
      labels: sortedYears,
      datasets: [
        {
          label: 'Injuries by Year',
          data: sortedYears.map(year => injuriesByYear[year]),
          backgroundColor: 'rgba(75, 192, 192, 0.6)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1,
        },
      ],
    });
  };

  const processInjuryTrendData = (submissions: Submission[]) => {
    // Create monthly trend data for the last 24 months
    const monthlyData: Record<string, number> = {};
    const now = new Date();
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(now.getFullYear() - 2);
    
    // Initialize all months with zero
    for (let d = new Date(twoYearsAgo); d <= now; d.setMonth(d.getMonth() + 1)) {
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyData[key] = 0;
    }
    
    // Fill in actual data
    submissions.forEach(submission => {
      if (submission.recordType === 'INJURY_REPORT' && submission.dateOfIncident) {
        const date = new Date(submission.dateOfIncident);
        if (date >= twoYearsAgo && date <= now) {
          const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          if (key in monthlyData) {
            monthlyData[key]++;
          }
        }
      }
    });
    
    // Calculate 3-month moving average
    const keys = Object.keys(monthlyData).sort();
    const values = keys.map(k => monthlyData[k]);
    const movingAvg = values.map((_, i, arr) => {
      if (i < 2) return null;
      return (arr[i] + arr[i-1] + arr[i-2]) / 3;
    }).filter(v => v !== null) as number[];
    
    // Format labels for display (e.g., "Jan 2023")
    const formattedLabels = keys.map(key => {
      const [year, month] = key.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1);
      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    });
    
    setInjuryTrendData({
      labels: formattedLabels,
      datasets: [
        {
          label: 'Monthly Injuries',
          data: values,
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1,
          fill: false,
          tension: 0.1,
          pointRadius: 3,
          pointHoverRadius: 5
        },
        {
          label: '3-Month Moving Average',
          data: [...Array(2).fill(null), ...movingAvg],
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          borderColor: 'rgba(255, 99, 132, 1)',
          borderWidth: 2,
          fill: false,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 3
        }
      ],
    });
  };

  const processInjuryBubbleData = (submissions: Submission[]) => {
    // Create bubble chart data showing injury severity by location and frequency
    const locationData: Record<string, { count: number, severity: number }> = {};
    
    submissions.forEach(submission => {
      if (submission.recordType === 'INJURY_REPORT' && submission.locationOnSite) {
        const location = submission.locationOnSite;
        
        if (!locationData[location]) {
          locationData[location] = { count: 0, severity: 0 };
        }
        
        locationData[location].count++;
        
        // Calculate severity based on injury category
        let severityScore = 1; // Default
        if (submission.injuryCategory === 'First Aid') {
          severityScore = 1;
        } else if (submission.injuryCategory === 'Medically Treated Incident (MTI)') {
          severityScore = 2;
        } else if (submission.injuryCategory === 'Medically Treated with Lost Time (LTA)') {
          severityScore = 3;
        }
        
        locationData[location].severity += severityScore;
      }
    });
    
    // Convert to bubble chart format
    const bubbleData = Object.entries(locationData).map(([location, data], index) => {
      return {
        x: index + 1, // X-axis position (arbitrary for display)
        y: data.severity / data.count, // Y-axis: average severity
        r: Math.min(30, Math.max(5, data.count * 5)), // Bubble size based on count (min 5, max 30)
        location // Custom property for tooltip
      };
    });
    
    setInjuryBubbleData({
      datasets: [
        {
          label: 'Injuries by Location (size = frequency, y = severity)',
          data: bubbleData,
          backgroundColor: bubbleData.map((_, i) => 
            `hsla(${200 + (i * 30) % 160}, 70%, 60%, 0.7)`
          )
        }
      ]
    });
  };

  const processInjuryByLocationData = (submissions: Submission[]) => {
    // Group injuries by location
    const injuriesByLocation: Record<string, number> = {};
    
    submissions.forEach(submission => {
      if (submission.recordType === 'INJURY_REPORT' && submission.locationOnSite) {
        const location = submission.locationOnSite;
        
        if (!injuriesByLocation[location]) {
          injuriesByLocation[location] = 0;
        }
        injuriesByLocation[location]++;
      }
    });
    
    // Sort locations by injury count (descending)
    const sortedLocations = Object.entries(injuriesByLocation)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10); // Top 10 locations
    
    setInjuryByLocationData({
      labels: sortedLocations.map(([location]) => location),
      datasets: [
        {
          label: 'Injuries by Location',
          data: sortedLocations.map(([_, count]) => count),
          backgroundColor: 'rgba(153, 102, 255, 0.6)',
          borderColor: 'rgba(153, 102, 255, 1)',
          borderWidth: 1,
        },
      ],
    });
  };

  // Chart options with proper typing
  const barOptions: ChartOptions<'bar'> = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: false,
      }
    }
  };

  const lineOptions: ChartOptions<'line'> = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `${context.dataset.label}: ${context.parsed.y}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0
        }
      }
    }
  };

  const bubbleOptions = {
    responsive: true,
    plugins: {
      tooltip: {
        callbacks: {
          label: function(context: any) {
            return [
              `Location: ${context.raw.location}`,
              `Frequency: ${Math.round(context.raw.r / 5)}`,
              `Avg. Severity: ${context.raw.y.toFixed(1)}`
            ];
          }
        }
      }
    },
    scales: {
      x: {
        display: false,
      },
      y: {
        title: {
          display: true,
          text: 'Severity (1=Low, 3=High)'
        },
        min: 0,
        max: 3.5
      }
    }
  };

  if (isLoading) {
    return <div className="p-6">Loading charts...</div>;
  }

  return (
    <div className="p-8 bg-white rounded-lg shadow">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-[#800000]">Safety Metrics Dashboard</h2>
        <div className="flex items-center">
          <label className="mr-2 text-sm font-medium">Time Range:</label>
          <select 
            value={timeRange} 
            onChange={(e) => setTimeRange(e.target.value)}
            className="border rounded p-1 text-sm"
          >
            <option value="6months">Last 6 Months</option>
            <option value="12months">Last 12 Months</option>
            <option value="24months">Last 24 Months</option>
          </select>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Injuries by Month */}
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Injuries by Month</h3>
          <Bar data={injuryData} options={barOptions} />
        </div>
        
        {/* Injuries by Year */}
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Injuries by Year</h3>
          <Bar data={yearlyInjuryData} options={barOptions} />
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-6 mb-6">
        {/* Injury Trend Line Chart */}
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Injury Trend (24 Months)</h3>
          <Line data={injuryTrendData} options={lineOptions} />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Bubble Chart: Injury Severity by Location */}
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Injury Severity by Location</h3>
          <div className="h-80">
            <Bubble data={injuryBubbleData} options={bubbleOptions} />
          </div>
          <div className="text-xs text-gray-500 mt-2 text-center">
            Bubble size represents frequency, Y-axis shows average severity
          </div>
        </div>
        
        {/* Top Locations Bar Chart */}
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Top Locations by Injury Count</h3>
          <Bar data={injuryByLocationData} options={barOptions} />
        </div>
      </div>
    </div>
  );
}
