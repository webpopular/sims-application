// app/components/users/user-form.tsx
'use client';
import { useEffect, useState } from 'react';
import { generateClient } from 'aws-amplify/api';
import { type Schema } from '@/amplify/data/schema';
import { getCurrentUser } from 'aws-amplify/auth';


const client = generateClient<Schema>();

export function UserForm() {
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    firstName: '',
    lastName: '',
    isActive: true
  });


  useEffect(() => {
    async function checkAuth() {
        try {
            const currentUser = await getCurrentUser();
            console.log('Current user:', currentUser);
          } catch (error) {
            console.error('Auth error:', error);
          }
    }
    checkAuth();
  }, []);

  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      console.log('Submitting form data:', formData);
      const result = await client.models.Person.create({
        email: formData.email,
        name: formData.name,
        firstName: formData.firstName,
        lastName: formData.lastName, // Changed to match schema
        isActive: formData.isActive,
        createdBy: 'system', // Added required field
        createdAt: new Date().toISOString(),
        levelId: [],
        role: [],
        plantAccess: [],
        metadata: null
      });
      console.log('Form submission result:', result);

    // Reset form after successful submission
    setFormData({
      email: '',
      name: '',
      firstName: '',
      lastName: '',
      isActive: true
    });

    } catch (error: any) {
        if (error.errors) {
          console.error('GraphQL errors:', error.errors);
        } else {
          console.error('Error creating person:', error);
        }
  };
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-xl mx-auto p-6 bg-white rounded-lg shadow">
      <h2 className="text-xl font-bold mb-6">Add New User</h2>
      
      <div>
        <label className="block text-sm font-medium mb-1">Email</label>
        <input
          type="email"
          required
          className="w-full p-2 border rounded"
          value={formData.email}
          onChange={(e) => setFormData(prev => ({...prev, email: e.target.value}))}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Name</label>
        <input
          type="text"
          required
          className="w-full p-2 border rounded"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({...prev, name: e.target.value}))}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">First Name</label>
        <input
          type="text"
          required
          className="w-full p-2 border rounded"
          value={formData.firstName}
          onChange={(e) => setFormData(prev => ({...prev, firstName: e.target.value}))}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Last Name</label>
        <input
          type="text"
          required
          className="w-full p-2 border rounded"
          value={formData.lastName}
          onChange={(e) => setFormData(prev => ({...prev, lastName: e.target.value}))}
        />
      </div>

      <button
        type="submit"
        className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
      >
        Add User
      </button>
    </form>
  );

}
