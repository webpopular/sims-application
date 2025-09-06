// In SafetyAlertPrintable.tsx
import { InjuryFormData } from "@/app/types";
import { useEffect, useState } from 'react';
import { getUrl } from 'aws-amplify/storage';

interface SafetyAlertPrintableProps {
  formData: Partial<InjuryFormData>;
}

const SafetyAlertPrintable = ({ formData }: SafetyAlertPrintableProps) => {
  const [beforeImageUrl, setBeforeImageUrl] = useState<string>('');
  const [afterImageUrl, setAfterImageUrl] = useState<string>('');

  useEffect(() => {
    const loadImageUrls = async () => {
      if (formData?.saImageBefore) {
        try {
          const result = await getUrl({
            path: formData.saImageBefore,
            options: {
              bucket: 'safetyAlertStorage',
              validateObjectExistence: false
            }
          });
          setBeforeImageUrl(result.url.toString());
        } catch (error) {
          console.error('Error loading before image URL:', error);
        }
      }

      if (formData?.saImageAfter) {
        try {
          const result = await getUrl({
            path: formData.saImageAfter,
            options: {
              bucket: 'safetyAlertStorage',
              validateObjectExistence: false
            }
          });
          setAfterImageUrl(result.url.toString());
        } catch (error) {
          console.error('Error loading after image URL:', error);
        }
      }
    };

    loadImageUrls();
  }, [formData?.saImageBefore, formData?.saImageAfter]);

  return (
    <div id="printableRef" className="font-['Montserrat'] text-gray-800 p-6 max-w-4xl mx-auto bg-[#f4f4f4] shadow-lg rounded-lg">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 border-b pb-4">
        <p className="text-lg font-bold text-blue-600 font-['Work Sans']">{new Date().toLocaleDateString()}</p>
        <img src="/images/ITW-logo---dk-gray.svg" alt="Company Logo" className="h-12" />
        <h1 className="text-4xl font-bold text-[#e9594d] font-['Montserrat']">SAFETY ALERT</h1>
      </div>

      {/* Card-style information section */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 mb-6">
        {/* Alert Number Card */}
        {/*  <div className="bg-blue-50 rounded-md border border-blue-100 p-3 flex flex-col">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Alert Number</span>
          <span className="text-sm font-medium text-gray-900">{formData.saNumber || "N/A"}</span>
        </div> */}

        {/* Location Card */}
        <div className="bg-purple-50 rounded-md border border-purple-100 p-3 flex flex-col">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Location</span>
          <span className="text-sm font-medium text-gray-900">{formData.locationOnSite || "N/A"}</span>
        </div>

        {/* Where in Plant Card */}
        <div className="bg-amber-50 rounded-md border border-amber-100 p-3 flex flex-col">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Where in Plant</span>
          <span className="text-sm font-medium text-gray-900">{formData.whereDidThisOccur || "N/A"}</span>
        </div>

        {/* Author Card */}
        <div className="bg-green-50 rounded-md border border-green-100 p-3 flex flex-col">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Author</span>
          <span className="text-sm font-medium text-green-600">{formData.saAuthor || "N/A"}</span>
        </div>




        {/* Injury Card */}
        <div className="bg-rose-50 rounded-md border border-rose-100 p-3 flex flex-col">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Injury</span>
          <span className="text-sm font-medium text-gray-900">
            {formData.saInjuryFlag ? "Yes" : "No"}
          </span>
        </div>


        {/* Property Damage Card */}
        <div className="bg-rose-50 rounded-md border border-rose-100 p-3 flex flex-col">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Property Damage</span>
          <span className="text-sm font-medium text-gray-900">
            {formData.saPropertyDamageFlag ? "Yes" : "No"}
          </span>
        </div>

        {/* Submission ID Card */}
        <div className="bg-gray-50 rounded-md border border-gray-100 p-3 flex flex-col">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Submission ID</span>
          <span className="text-sm font-medium text-blue-600">{formData?.submissionId || 'N/A'}</span>
        </div>

        {/* Date Card */}
        <div className="bg-teal-50 rounded-md border border-teal-100 p-3 flex flex-col">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Incident Date</span>
          <span className="text-sm font-medium text-gray-900">
            {formData?.dateOfIncident || 'N/A'}
          </span>
        </div>

        {/* Time Card */}
        <div className="bg-cyan-50 rounded-md border border-cyan-100 p-3 flex flex-col">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Incident Time</span>
          <span className="text-sm font-medium text-gray-900">
            {formData?.timeOfIncidentHour || '00'}:{formData?.timeOfIncidentMinute || '00'} {formData?.timeOfInjuryAmPm || 'AM'}
          </span>
        </div>


      </div>

      <div className="mb-6">
        <h3 className="bg-rose-400 text-white text-lg font-semibold px-4 py-2 rounded-t font-['Montserrat']">Incident Description</h3>
        <p className="p-4 bg-rose-100 rounded-b font-['Work Sans']">{formData.incidentDescription || "N/A"}</p>
      </div>

      <div className="mb-6">
        <h3 className="bg-teal-500 text-white text-lg font-semibold px-4 py-2 rounded-t font-['Montserrat']">Action and Next Steps</h3>
        <p className="p-4 bg-teal-100 rounded-b font-['Work Sans']">{formData.saActionAndNextSteps || "N/A"}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {beforeImageUrl && (
          <div>
            <p className="font-semibold font-['Work Sans'] mb-2">Before</p>
            <img src={beforeImageUrl} alt="Before Incident" crossOrigin="anonymous" className="w-full h-56 object-cover rounded-lg shadow" />
          </div>
        )}
        {afterImageUrl && (
          <div>
            <p className="font-semibold font-['Work Sans'] mb-2">After</p>
            <img src={afterImageUrl} alt="After Incident" crossOrigin="anonymous" className="w-full h-56 object-cover rounded-lg shadow" />
          </div>
        )}
      </div>


      {formData?.saAdditionalDetail && (
        <div className="mt-6 mb-6">
          <h3 className="bg-amber-500 text-white text-lg font-semibold px-4 py-2 rounded-t font-['Montserrat']">Additional Details</h3>
          <p className="p-4 bg-amber-100 rounded-b font-['Work Sans']">{formData.saAdditionalDetail}</p>
        </div>
      )}


    </div>
  );
};

export default SafetyAlertPrintable;
