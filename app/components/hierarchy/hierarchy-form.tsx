
//app/components/hierarchy/hiearchy-form.tsx
'use client';
import { useState } from 'react';
import { generateClient } from 'aws-amplify/api';
import { type Schema } from '@/amplify/data/schema';

const client = generateClient<Schema>();

interface FormData {
  enterprise: string;
  segment: string;
  platform: string;
  region: string;
  division: string;
  plant: string;
}

export function HierarchyForm() {
  const [formData, setFormData] = useState<FormData>({
    enterprise: '',
    segment: '',
    platform: '',
    region: '',
    division: '',
    plant: ''
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (level: keyof FormData, value: string) => {
    setFormData(prev => {
      const newData = { ...prev, [level]: value };
      
      // Reset child levels when parent changes
      switch(level) {
        case 'enterprise':
          return { ...newData, segment: '', platform: '', region: '', division: '', plant: '' };
        case 'segment':
          return { ...newData, platform: '', region: '', division: '', plant: '' };
        case 'platform':
          return { ...newData, region: '', division: '', plant: '' };
        case 'region':
          return { ...newData, division: '', plant: '' };
        case 'division':
          return { ...newData, plant: '' };
        default:
          return newData;
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
        await client.models.Level.create({
          name: formData.plant || formData.division || formData.region || formData.platform || formData.segment || formData.enterprise,
          type: formData.plant ? 'PLANT' : 
                formData.division ? 'DIVISION' :
                formData.region ? 'REGIONAL' :
                formData.platform ? 'PLATFORM' :
                formData.segment ? 'SEGMENT' : 'ENTERPRISE',
          parentLevelId: formData.division || formData.region || formData.platform || formData.segment || formData.enterprise || null,
          code: `${formData.enterprise}-${formData.segment}-${formData.platform}-${formData.region}-${formData.division}-${formData.plant}`.trim(),
          isActive: true,
          createdAt: new Date().toISOString(),
          createdBy: 'system',
          metadata: {}
        });
      } catch (error) {
        console.error('Error creating level:', error);
      } finally {
      setLoading(false);
    }
  };

  

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Hierarchy Level Assignment</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Enterprise</label>
          <select 
            className="w-full p-2 border rounded"
            value={formData.enterprise}
            onChange={(e) => handleChange('enterprise', e.target.value)}
          >
            <option value="">Select Enterprise</option>
            <option value="ITW">ITW</option>
          </select>
        </div>

        {formData.enterprise && (
          <div>
            <label className="block text-sm font-medium mb-1">Segment</label>
            <select 
              className="w-full p-2 border rounded"
              value={formData.segment}
              onChange={(e) => handleChange('segment', e.target.value)}
            >
              <option value="">Select Segment</option>
              <option value="Automotive OEM">Automotive OEM</option>
            </select>
          </div>
        )}

        {formData.segment && (
          <div>
            <label className="block text-sm font-medium mb-1">Platform</label>
            <select 
              className="w-full p-2 border rounded"
              value={formData.platform}
              onChange={(e) => handleChange('platform', e.target.value)}
            >
              <option value="">Select Platform</option>
              <option value="Asia BD">Asia BD</option>
              <option value="Smart Components">Smart Components</option>
              <option value="Plastic Fasteners">Plastic Fasteners</option>
            </select>
          </div>
        )}

        {formData.platform && (
          <div>
            <label className="block text-sm font-medium mb-1">Region</label>
            <select 
              className="w-full p-2 border rounded"
              value={formData.region}
              onChange={(e) => handleChange('region', e.target.value)}
            >
              <option value="">Select Region</option>
              <option value="Asia">Asia</option>
              <option value="Europe">Europe</option>
            </select>
          </div>
        )}

        <button 
          type="submit" 
          className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 disabled:bg-gray-400"
          disabled={loading}
        >
          {loading ? 'Saving...' : 'Save Hierarchy'}
        </button>
      </div>
    </form>
  );
}
