// app/components/admin/ReferenceDataManager.tsx
'use client';

import { useState, useEffect } from 'react';
import { generateClient } from 'aws-amplify/api';
import { type Schema } from '@/amplify/data/schema';
import { fetchAuthSession } from 'aws-amplify/auth';
//import { Classification } from 'aws-cdk-lib/aws-stepfunctions-tasks';
//import { Yesteryear } from 'next/font/google';

const client = generateClient<Schema>();

interface ReferenceDataItem {
    id: string;
    category: string;
    value: string;
    label: string;
    isActive: boolean;
    createdAt: string;
    createdBy: string;
    order?: number;
    updatedAt?: string;
    updatedBy?: string;
    owner?: string | null;
    metadata?: any;
  }

  
  export default function ReferenceDataManager() {
    const [category, setCategory] = useState('ageRanges');
    const [items, setItems] = useState<ReferenceDataItem[]>([]);
    const [newItem, setNewItem] = useState({
      value: '',
      label: ''
    });
    const [editingItem, setEditingItem] = useState<ReferenceDataItem | null>(null);
  
    // Fetch data when category changes
    useEffect(() => {
      fetchReferenceData();
    }, [category]);
  

    const fetchReferenceData = async () => {
      try {
        console.log('Fetching reference data for category:', category);
        const session = await fetchAuthSession();
        console.log('Auth Session:', {
          groups: session.tokens?.accessToken?.payload['cognito:groups'],
          username: session.tokens?.accessToken?.payload['username'],
          identityId: session.identityId
        });
    
        const response = await client.models.ReferenceData.list({
          filter: { category: { eq: category } }
        });
        console.log('API Response:', response);
    
        if (response.data) {
          const sortedItems = [...response.data].sort((a, b) => 
            (a.order || 0) - (b.order || 0)
          );
          setItems(sortedItems as ReferenceDataItem[]);
        }
      } catch (err) {
        const error = err as Error;
        console.error('Error fetching reference data:', {
          message: error.message,
          name: error.name,
          stack: error.stack
        });
      }
    };

    const handleAddItem = async () => {
      try {
        const session = await fetchAuthSession();
        console.log('Auth Session for Add Item:', {
          groups: session.tokens?.accessToken?.payload['cognito:groups']
        });
        console.log('Adding new item:', newItem);
       
        // Check for duplicates
        const isDuplicate = items.some(
          item => item.value.trim() === newItem.value.trim() || 
          item.label === newItem.label.trim()
        );
        console.log('Is duplicate:', isDuplicate);
    
        if (!newItem.value.trim() || !newItem.label.trim()) {
          console.warn('Validation failed: Empty value or label');
          return;
        }
    
        const response = await client.models.ReferenceData.create({
          category,
          value: newItem.value.trim(),
          label: newItem.label.trim(),
          isActive: true,
          order: items.length + 1,
          createdAt: new Date().toISOString(),
          createdBy: 'system'
        });
        
        console.log('Create response:', response);
        
        if (response.data && !response.errors) {
          await fetchReferenceData(); // Refresh the list
          setNewItem({ value: '', label: '' });
        }
        
      } catch (err) {
        const error = err as Error;
        console.error('Error adding reference data:', {
          message: error.message,
          name: error.name,
          stack: error.stack
        });
      }
    };
    

    const handleMoveItem = async (item: ReferenceDataItem, direction: 'up' | 'down') => {
        const currentIndex = items.findIndex(i => i.id === item.id);
        const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      
        if (newIndex < 0 || newIndex >= items.length) return;
      
        try {
          // Get all items and reorder them
          const reorderedItems = [...items];
          const [movedItem] = reorderedItems.splice(currentIndex, 1);
          reorderedItems.splice(newIndex, 0, movedItem);
      
          // Update order numbers for all affected items
          const updates = reorderedItems.map((item, index) => 
            client.models.ReferenceData.update({
              id: item.id,
              order: index + 1,
              updatedAt: new Date().toISOString(),
              updatedBy: 'system'
            })
          );
      
          await Promise.all(updates);
          await fetchReferenceData();
        } catch (err) {
          const error = err as Error;
          console.error('Error reordering items:', {
            message: error.message,
            name: error.name,
            stack: error.stack
          });
        }
      };
      

  

    const handleToggleActive = async (item: ReferenceDataItem) => {
        try {
          const response = await client.models.ReferenceData.update({
            id: item.id,
            isActive: !item.isActive,
            updatedAt: new Date().toISOString(),
            updatedBy: 'system'
          });
      
          if (response.data && !response.errors) {
            await fetchReferenceData();
          }
        } catch (error) {
          console.error('Error updating active status:', error);
        }
      };


    const handleEdit = async (item: ReferenceDataItem) => {
      try {
        const response = await client.models.ReferenceData.update({
          id: item.id,
          value: editingItem?.value || item.value,
          label: editingItem?.label || item.label,
          order: item.order, // Maintain the order when editing
          updatedAt: new Date().toISOString(),
          updatedBy: 'system'
        });
  
        if (response.data && !response.errors) {
          await fetchReferenceData();
          setEditingItem(null);
        }
      } catch (error) {
        console.error('Error updating reference data:', error);
      }
    };
  
    const handleDelete = async (id: string) => {
      try {
        if (window.confirm('Are you sure you want to delete this item?')) {
          await client.models.ReferenceData.delete({
            id: id
          });
          await fetchReferenceData();
        }
      } catch (error) {
        console.error('Error deleting reference data:', error);
      }
    };


  
    return (
      <div className="space-y-6 p-6">
        <div className="flex justify-between items-center">
          <select 
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="p-2 border rounded"
          >
            <option value="recordTypes">Record Types</option>
            <option value="employeeTypes">Employee Types</option>
            <option value="ageRanges">Age Ranges</option>
            <option value="tenureRanges">Tenure Ranges</option>
            <option value="experienceLevels">Experience Levels</option>
            <option value="locationTypes">Location Types</option>
            <option value="activityTypes">Activity Types</option>
            <option value="injuryTypes">Injury Types</option>
            <option value="injuredBodyParts">Injured Body Parts</option>
            <option value="incidentTypes">Incident Types</option>
            <option value="whereDidThisOccur">Where Did This Occur</option>
          </select>

        </div>

        {/* Add New Item Form */}
        <div className="flex gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700">Value</label>
            <input
              type="text"
              value={newItem.value}
              onChange={(e) => setNewItem({...newItem, value: e.target.value})}
              className="mt-1 p-2 border rounded"
              placeholder="Internal value"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Label</label>
            <input
              type="text"
              value={newItem.label}
              onChange={(e) => setNewItem({...newItem, label: e.target.value})}
              className="mt-1 p-2 border rounded"
              placeholder="Display label"
            />
          </div>
          <button
            onClick={handleAddItem}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Add Item
          </button>
        </div>


  
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Value</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Label</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {items.map((item, index) => (
              <tr key={item.id}>
                 <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleMoveItem(item, 'up')}
                    disabled={index === 0}
                    className="text-gray-500 hover:text-gray-700 disabled:opacity-50"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => handleMoveItem(item, 'down')}
                    disabled={index === items.length - 1}
                    className="text-gray-500 hover:text-gray-700 disabled:opacity-50"
                  >
                    ↓
                  </button>
                  <span>{item.order}</span>
                </div>
              </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {editingItem?.id === item.id ? (
                    <input
                      type="text"
                      value={editingItem.value}
                      onChange={(e) => setEditingItem({...editingItem, value: e.target.value})}
                      className="p-1 border rounded"
                    />
                  ) : item.value}
                </td>

                <td className="px-6 py-4 whitespace-nowrap">
                  {editingItem?.id === item.id ? (
                    <input
                      type="text"
                      value={editingItem.label}
                      onChange={(e) => setEditingItem({...editingItem, label: e.target.value})}
                      className="p-1 border rounded"
                    />
                  ) : item.label}
                </td>

                <td className="px-6 py-4 whitespace-nowrap">
  <button
    onClick={() => handleToggleActive(item)}
    className={`px-3 py-1 rounded-full text-xs font-medium ${
      item.isActive 
        ? 'bg-green-100 text-green-800' 
        : 'bg-gray-100 text-gray-800'
    }`}
  >
    {item.isActive ? 'Active' : 'Inactive'}
  </button>
</td>

                <td className="px-6 py-4 whitespace-nowrap">
                  {editingItem?.id === item.id ? (
                    <>
                      <button 
                        onClick={() => handleEdit(item)}
                        className="text-green-600 hover:text-green-900 mr-4"
                      >
                        Save
                      </button>
                      <button 
                        onClick={() => setEditingItem(null)}
                        className="text-gray-600 hover:text-gray-900"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button 
                        onClick={() => setEditingItem(item)}
                        className="text-indigo-600 hover:text-indigo-900 mr-4"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDelete(item.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }