// app/components/dashboard/SafetyMetricsDashboard.tsx
'use client';

import { useEffect, useState } from 'react';
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
  BubbleController,
  ChartOptions,
} from 'chart.js';
import { Bar, Line, Bubble } from 'react-chartjs-2';
import { initAmplify } from '@/app/amplify-init';
import {callAppSync} from "@/lib/utils/appSync";

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    Title,
    Tooltip,
    Legend,
    BubbleController
);

initAmplify();

let dataClient: any = null;
async function getDataClient() {
  if (!dataClient) {
    const mod = await import('aws-amplify/data');
    dataClient = mod.generateClient<any>();
  }
  return dataClient;
}

interface ChartDataset {
  label: string;
  data: number[] | { x: number; y: number; r: number }[];
  backgroundColor: string | string[];
  borderColor?: string | string[];
  borderWidth?: number;
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
    data: { x: number; y: number; r: number }[];
    backgroundColor: string | string[];
    borderColor?: string | string[];
    borderWidth?: number;
  }[];
}

interface Submission {
  submissionId: string;
  recordType?: string;
  dateOfIncident?: string | null;
  injuryCategory?: string | null;
  locationOnSite?: string | null;
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
        let submissions: Submission[] | null = null;

        try {
          const client = await getDataClient();
          const resp = await client.models.Submission.list({ authMode: 'userPool' });
          if (resp?.data) submissions = resp.data as Submission[];
          if (!submissions && resp?.errors?.length) throw new Error(resp.errors[0].message);
        } catch {}

        if (!submissions) {
          const query = `
            query ListForDashboard {
              listSubmissions(limit: 1000) {
                items {
                  submissionId
                  recordType
                  dateOfIncident
                  injuryCategory
                  locationOnSite
                }
              }
            }`;
          const { data, errors } = await callAppSync(query);
          if (errors?.length) throw new Error(errors[0].message);
          submissions = (data?.listSubmissions?.items ?? []) as Submission[];
        }

        processInjuryData(submissions);
        processYearlyInjuryData(submissions);
        processInjuryTrendData(submissions);
        processInjuryBubbleData(submissions);
        processInjuryByLocationData(submissions);
      } catch (error) {
        console.error('Error fetching data for charts:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [timeRange]);

  const processInjuryData = (submissions: Submission[]) => {
    const injuriesByMonth: Record<string, number> = {};
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    submissions.forEach(s => {
      if (s.recordType === 'INJURY_REPORT' && s.dateOfIncident) {
        const d = new Date(s.dateOfIncident);
        const m = months[d.getMonth()];
        injuriesByMonth[m] = (injuriesByMonth[m] || 0) + 1;
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
    const injuriesByYear: Record<string, number> = {};

    submissions.forEach(s => {
      if (s.recordType === 'INJURY_REPORT' && s.dateOfIncident) {
        const y = new Date(s.dateOfIncident).getFullYear().toString();
        injuriesByYear[y] = (injuriesByYear[y] || 0) + 1;
      }
    });

    const years = Object.keys(injuriesByYear).sort();

    setYearlyInjuryData({
      labels: years,
      datasets: [
        {
          label: 'Injuries by Year',
          data: years.map(y => injuriesByYear[y]),
          backgroundColor: 'rgba(75, 192, 192, 0.6)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1,
        },
      ],
    });
  };

  const processInjuryTrendData = (submissions: Submission[]) => {
    const monthly: Record<string, number> = {};
    const now = new Date();
    const start = new Date();
    start.setFullYear(now.getFullYear() - 2);

    for (let d = new Date(start); d <= now; d.setMonth(d.getMonth() + 1)) {
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthly[key] = 0;
    }

    submissions.forEach(s => {
      if (s.recordType === 'INJURY_REPORT' && s.dateOfIncident) {
        const di = new Date(s.dateOfIncident);
        if (di >= start && di <= now) {
          const key = `${di.getFullYear()}-${String(di.getMonth() + 1).padStart(2, '0')}`;
          if (key in monthly) monthly[key]++;
        }
      }
    });

    const keys = Object.keys(monthly).sort();
    const values = keys.map(k => monthly[k]);
    const moving = values.map((_, i, arr) => (i < 2 ? null : (arr[i] + arr[i - 1] + arr[i - 2]) / 3));

    const labels = keys.map(k => {
      const [y, m] = k.split('-');
      const d = new Date(parseInt(y), parseInt(m) - 1);
      return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    });

    setInjuryTrendData({
      labels,
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
          pointHoverRadius: 5,
        },
        {
          label: '3-Month Moving Average',
          data: [...Array(2).fill(null), ...moving.filter(v => v !== null)] as number[],
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          borderColor: 'rgba(255, 99, 132, 1)',
          borderWidth: 2,
          fill: false,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 3,
        },
      ],
    });
  };

  const processInjuryBubbleData = (submissions: Submission[]) => {
    const loc: Record<string, { count: number; severity: number }> = {};

    submissions.forEach(s => {
      if (s.recordType === 'INJURY_REPORT' && s.locationOnSite) {
        const k = s.locationOnSite;
        loc[k] = loc[k] || { count: 0, severity: 0 };
        loc[k].count++;
        let sev = 1;
        if (s.injuryCategory === 'Medically Treated Incident (MTI)') sev = 2;
        if (s.injuryCategory === 'Medically Treated with Lost Time (LTA)') sev = 3;
        loc[k].severity += sev;
      }
    });

    const data = Object.entries(loc).map(([location, v], i) => ({
      x: i + 1,
      y: v.severity / v.count,
      r: Math.min(30, Math.max(5, v.count * 5)),
      location,
    }));

    setInjuryBubbleData({
      datasets: [
        {
          label: 'Injuries by Location (size=frequency, y=severity)',
          data,
          backgroundColor: data.map((_, i) => `hsla(${200 + (i * 30) % 160}, 70%, 60%, 0.7)`),
        },
      ],
    });
  };

  const processInjuryByLocationData = (submissions: Submission[]) => {
    const byLoc: Record<string, number> = {};

    submissions.forEach(s => {
      if (s.recordType === 'INJURY_REPORT' && s.locationOnSite) {
        byLoc[s.locationOnSite] = (byLoc[s.locationOnSite] || 0) + 1;
      }
    });

    const top = Object.entries(byLoc)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    setInjuryByLocationData({
      labels: top.map(([l]) => l),
      datasets: [
        {
          label: 'Injuries by Location',
          data: top.map(([, c]) => c),
          backgroundColor: 'rgba(153, 102, 255, 0.6)',
          borderColor: 'rgba(153, 102, 255, 1)',
          borderWidth: 1,
        },
      ],
    });
  };

  const barOptions: ChartOptions<'bar'> = {
    responsive: true,
    plugins: { legend: { position: 'top' }, title: { display: false } },
  };

  const lineOptions: ChartOptions<'line'> = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y}` } },
    },
    scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
  };

  const bubbleOptions: any = {
    responsive: true,
    plugins: {
      tooltip: {
        callbacks: {
          label: (ctx: any) => [
            `Location: ${ctx.raw.location}`,
            `Frequency: ${Math.round(ctx.raw.r / 5)}`,
            `Avg. Severity: ${ctx.raw.y.toFixed(1)}`,
          ],
        },
      },
    },
    scales: { x: { display: false }, y: { title: { display: true, text: 'Severity (1=Low, 3=High)' }, min: 0, max: 3.5 } },
  };

  if (isLoading) return <div className="p-6">Loading charts...</div>;

  return (
      <div className="p-8 bg-white rounded-lg shadow">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-[#800000]">Safety Metrics Dashboard</h2>
          <div className="flex items-center">
            <label className="mr-2 text-sm font-medium">Time Range:</label>
            <select
                value={timeRange}
                onChange={e => setTimeRange(e.target.value)}
                className="border rounded p-1 text-sm"
            >
              <option value="6months">Last 6 Months</option>
              <option value="12months">Last 12 Months</option>
              <option value="24months">Last 24 Months</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold mb-4">Injuries by Month</h3>
            <Bar data={injuryData} options={barOptions} />
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold mb-4">Injuries by Year</h3>
            <Bar data={yearlyInjuryData} options={barOptions} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 mb-6">
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold mb-4">Injury Trend (24 Months)</h3>
            <Line data={injuryTrendData} options={lineOptions} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold mb-4">Injury Severity by Location</h3>
            <div className="h-80">
              <Bubble data={injuryBubbleData} options={bubbleOptions} />
            </div>
            <div className="text-xs text-gray-500 mt-2 text-center">
              Bubble size represents frequency, Y-axis shows average severity
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold mb-4">Top Locations by Injury Count</h3>
            <Bar data={injuryByLocationData} options={barOptions} />
          </div>
        </div>
      </div>
  );
}
