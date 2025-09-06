//app/components/forms/sections/SafetyAlert.tsx

"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { fetchSubmissionData } from "@/app/api/fetchSubmissionData";
import { getCurrentUser } from "aws-amplify/auth";
import { generateClient } from "aws-amplify/data";
import type { InjuryFormData, ReferenceDataItem } from "@/app/types";
import { type Schema } from "@/amplify/data/schema";
import { fetchUserAttributes } from 'aws-amplify/auth';
import { ChevronDown, ChevronRight } from "lucide-react";
import { uploadData, getUrl } from "aws-amplify/storage";
import { v4 as uuidv4 } from "uuid";
import PrintableSafetyAlert from "./PrintableSafetyAlert";
import ReactToPrint from "react-to-print";
import SafetyAlertPrintable from "./SafetyAlertPrintable";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
//import EmailNotification from "../notifications/EmailNotification"; USE SafetyAlertEmailNotification
import { loadImageAsBase64 } from '@/app/utils/imageUtils';
import { uploadFileToS3, generatePresignedUrl } from "@/app/utils/fileUpload";
import SafetyAlertEmailNotification from "../notifications/SafetyAlertEmailNotification";


const client = generateClient<Schema>();

interface SafetyAlertProps {
  isExpanded: boolean;
  onToggle: () => void;
  formData: Partial<InjuryFormData> | null;
  setInjuryFormData: React.Dispatch<React.SetStateAction<Partial<InjuryFormData> | null>>;
  setHasFormChanges: (value: boolean) => void;
  submissionId?: string;
  formType?: "US" | "Global";
}

export default function SafetyAlertSection({
  isExpanded,
  onToggle,
  formData,
  setInjuryFormData,
  setHasFormChanges,
  //submissionId,
}: SafetyAlertProps) {
  const searchParams = useSearchParams();
  const urlSubmissionId = searchParams.get("id"); // Fallback mechanism
  //const effectiveSubmissionId = submissionId || urlSubmissionId; // Use either prop or URL value
  const submissionId = formData?.submissionId || urlSubmissionId; // Use form data or fallback to URL
  const [showEmailNotification, setShowEmailNotification] = useState(false);
  const [showSafetyAlertForm, setShowSafetyAlertForm] = useState<boolean>(false);
  //const [dataLoaded, setDataLoaded] = useState(false);
  const [uploadingBefore, setUploadingBefore] = useState(false);
  const [uploadingAfter, setUploadingAfter] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const printableRef = useRef<HTMLDivElement>(null);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [showSafetyAlertEmail, setShowSafetyAlertEmail] = useState<boolean>(false);
  const [beforeImageUrl, setBeforeImageUrl] = useState<string>('');
  const [afterImageUrl, setAfterImageUrl] = useState<string>('');
  const [showSaveConfirmationModal, setShowSaveConfirmationModal] = useState<boolean>(false);


  const [referenceData, setReferenceData] = useState<{
    recordTypes: ReferenceDataItem[];
    employeeTypes: ReferenceDataItem[];
    ageRanges: ReferenceDataItem[];
    tenureRanges: ReferenceDataItem[];
    experienceLevels: ReferenceDataItem[];
    locationTypes: ReferenceDataItem[];
    activityTypes: ReferenceDataItem[];
    injuryTypes: ReferenceDataItem[];
    injuredBodyParts: ReferenceDataItem[];
    incidentTypes: ReferenceDataItem[];
    whereDidThisOccur: ReferenceDataItem[];
    obsTypeOfConcern: ReferenceDataItem[];
    obsPriorityType: ReferenceDataItem[];    
  }>({
    recordTypes: [],
    employeeTypes: [],
    ageRanges: [],
    tenureRanges: [],
    experienceLevels: [],
    locationTypes: [],
    activityTypes: [],
    injuryTypes: [],
    injuredBodyParts: [],
    incidentTypes: [],
    whereDidThisOccur: [],
    obsTypeOfConcern: [],
    obsPriorityType: [],  
  });


  //  generate URLs when formData changes
  // Add effect to load image URLs when formData changes
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



  // Add this useEffect to auto-close the modal after 3 seconds
  useEffect(() => {
    if (showSaveConfirmationModal) {
      const timer = setTimeout(() => {
        setShowSaveConfirmationModal(false);
      }, 3000); // 3 seconds

      // Clear the timeout if the component unmounts or the modal is closed manually
      return () => clearTimeout(timer);
    }
  }, [showSaveConfirmationModal]);


  // Auto-show the form if the Safety Alert exists
  useEffect(() => {
    if (formData?.saStatus === "SAFETY_ALERT_OPEN" || formData?.saStatus === "SAFETY_ALERT_CREATED") {
      setShowSafetyAlertForm(true);
    }
  }, [formData?.saStatus]);


  useEffect(() => {
    const loadData = async () => {
      try {
        const submissionID = submissionId || urlSubmissionId;
        if (!submissionID) return;

        const [data, userAttributes, latestSaNumber] = await Promise.all([
          fetchSubmissionData(submissionID),
          fetchUserAttributes(), // ✅ Fetch all user attributes
          fetchLatestSafetyAlertNumber(), // Fetch highest saNumber

        ]);

        if (data) {
          const sanitizedData: Partial<InjuryFormData> = {
            submissionId: data.submissionId ?? "",
            recordType: data.recordType ?? "",
            dateOfIncident: data.dateOfIncident ?? "",
            timeOfIncidentHour: data.timeOfIncidentHour ?? "",  // ✅ Ensure correct field
            timeOfIncidentMinute: data.timeOfIncidentMinute ?? "",  // ✅ Ensure correct field
            timeOfInjuryAmPm: data.timeOfInjuryAmPm ?? "", // ✅ Ensure correct field
            locationOnSite: data.locationOnSite ?? "",
            incidentDescription: data.incidentDescription ?? "",
            saNumber: data.saNumber ?? latestSaNumber,
            saLocation: data.saLocation ?? "",
            saWhereInPlant: data.saWhereInPlant ?? "",
            whereDidThisOccur: data.whereDidThisOccur ?? "",
            saAdditionalDetail: data.saAdditionalDetail ?? "",
            //saAuthor: data.saAuthor ?? userAttributes.email, // ✅ Assign user email
            saAuthor: userAttributes.email ?? "Unknown User", // ✅ Assign user email
            saInjuryFlag: data.saInjuryFlag ?? false,
            saPropertyDamageFlag: data.saPropertyDamageFlag ?? false,
            saIncidentDescripotion: data.saIncidentDescripotion ?? "",
            saActionAndNextSteps: data.saActionAndNextSteps ?? "",
            saImageBefore: data.saImageBefore ?? "",
            saImageAfter: data.saImageAfter ?? "",
            saCreateDate: data.saCreateDate ?? "",
            saUpdateDate: data.saUpdateDate ?? "",
            saStatus: data.saStatus ?? "SAFETY_ALERT_NOT_CREATED",
            saPDF: data.saPDF ?? "",
          };




          setInjuryFormData((prev) => ({
            ...prev!,
            ...sanitizedData, // ✅ Ensure only required fields update
          }));

          //setDataLoaded(true); // ✅ Force UI to update when data loads

          console.log("State Updated: ", sanitizedData);


        }
      } catch (error) {
        console.error("❌ Error fetching submission data:", error);
      }
    };

    loadData();
  }, [submissionId, setInjuryFormData]);


  // Add a new useEffect for refreshing URLs on window focus
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
          console.error('Error refreshing before image URL on focus:', error);
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
          console.error('Error refreshing after image URL on focus:', error);
        }
      }
    };

    const handleFocus = () => {
      console.log('Window focused - refreshing image URLs');
      if (formData?.saImageBefore || formData?.saImageAfter) {
        loadImageUrls();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        handleFocus();
      }
    });

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [formData?.saImageBefore, formData?.saImageAfter]);


  const fetchLatestSafetyAlertNumber = async (): Promise<string> => {
    try {
      const result = await client.models.Submission.list();

      if (!result.data || result.data.length === 0) {
        return "Alert # 100"; // ✅ Start from 100 if no existing records
      }

      // ✅ Extract and sort valid `saNumber` values
      const latestNumber = result.data
        .map((item) => {
          if (!item.saNumber) return NaN; // Handle missing values
          const extractedNumber = parseInt(item.saNumber.replace("Alert # ", ""), 10);
          return isNaN(extractedNumber) ? NaN : extractedNumber;
        })
        .filter((num) => !isNaN(num)) // Remove NaN values
        .sort((a, b) => b - a)[0]; // Get the highest number

      const nextNumber = latestNumber ? latestNumber + 1 : 100;
      console.log('nextNumber saNumber:', nextNumber);

      return `Alert # ${nextNumber}`; // ✅ Ensure it's a formatted string
    } catch (error) {
      console.error("❌ Error fetching latest saNumber:", error);
      return "Alert # 100"; // Default fallback
    }
  };



  // Updated saveSafetyAlert function 

  const saveSafetyAlert = async (isDraft = false) => {
    setIsLoading(true);
    try {
      if (!formData?.submissionId) {
        console.error("❌ Error: No submission ID found");
        alert("Error: No submission ID found");
        return;
      }

      const updatedStatus = isDraft ? "SAFETY_ALERT_NOT_CREATED" : "SAFETY_ALERT_CREATED";
      const currentDate = new Date().toISOString();

      const existingSubmissions = await client.models.Submission.list({
        filter: { submissionId: { eq: formData.submissionId } },
      });

      if (!existingSubmissions.data.length) {
        console.error("❌ Error: No matching submission found");
        alert("Error: No matching submission found");
        return;
      }

      const submissionToUpdate = existingSubmissions.data[0];

      // Generate PDF using the same approach as handleEmailPDF
      let pdfS3Key = formData?.saPDF ?? '';

      try {
        // Ensure images are preloaded
        await preloadImages();

        // Get the printable element
        const element = document.getElementById('printableRef');
        if (!element) {
          throw new Error('Printable element not found');
        }

        // Generate canvas with proper settings (same as handleEmailPDF)
        console.log('Generating canvas for PDF...');
        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          logging: true,
          onclone: (clonedDoc) => {
            // Fix for images in cloned document
            const clonedImages = clonedDoc.querySelectorAll('img');
            clonedImages.forEach(img => {
              img.crossOrigin = 'anonymous';
            });
          }
        });

        // Create PDF with proper settings (same as handleEmailPDF)
        console.log('Creating PDF from canvas...');
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = 210; // A4 width in mm
        const pdfHeight = 297; // A4 height in mm

        // Calculate aspect ratio
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        const ratio = imgHeight / imgWidth;

        // Fit image to page while maintaining aspect ratio
        let finalWidth, finalHeight;
        if (ratio > pdfHeight / pdfWidth) {
          finalHeight = pdfHeight - 20; // Add some margin
          finalWidth = finalHeight / ratio;
        } else {
          finalWidth = pdfWidth - 20; // Add some margin
          finalHeight = finalWidth * ratio;
        }

        // Add image to PDF with proper dimensions
        pdf.addImage(imgData, 'JPEG', 10, 10, finalWidth, finalHeight);

        // Get PDF as blob
        const pdfBlob = pdf.output('blob');

        // Use existing key or generate new one
        pdfS3Key = pdfS3Key || `public/safetyalertpdfs/${formData.submissionId || Date.now()}-safety-alert.pdf`;

        // Upload PDF directly as blob (same as handleEmailPDF)
        console.log('Uploading PDF to S3...');
        await uploadData({
          path: pdfS3Key,
          data: pdfBlob,  // Use blob directly instead of wrapping in File
          options: {
            bucket: 'safetyAlertStorage',
            contentType: 'application/pdf'
          }
        });

        console.log('PDF successfully uploaded to S3:', pdfS3Key);
      } catch (error) {
        console.error('Error generating or uploading PDF:', error);
        // Continue with the save process even if PDF generation fails
      }

      const updatedSubmission = await client.models.Submission.update({
        id: submissionToUpdate.id,
        saStatus: updatedStatus,
        saUpdateDate: currentDate,
        saPDF: pdfS3Key,
        saAuthor: formData.saAuthor ?? "",
        saCreateDate: formData.saCreateDate ?? "",
        saImageBefore: formData.saImageBefore ?? "",
        saImageAfter: formData.saImageAfter ?? "",
        locationOnSite: formData.locationOnSite ?? "",
        dateOfIncident: formData.dateOfIncident ?? "",
        timeOfIncidentHour: formData.timeOfIncidentHour ?? "",
        timeOfIncidentMinute: formData.timeOfIncidentMinute ?? "",
        timeOfInjuryAmPm: formData.timeOfInjuryAmPm ?? "",
        incidentDescription: formData.incidentDescription ?? "",
        saWhereInPlant: formData.saWhereInPlant ?? "",
        whereDidThisOccur: formData.whereDidThisOccur ?? "",
        saActionAndNextSteps: formData.saActionAndNextSteps ?? "",
        saNumber: formData.saNumber ?? "",
        saLocation: formData.saLocation ?? "",
        saAdditionalDetail: formData.saAdditionalDetail ?? "",
        saInjuryFlag: formData.saInjuryFlag ?? false,
        saPropertyDamageFlag: formData.saPropertyDamageFlag ?? false,
      });

      console.log("✅ Submission updated with PDF:", updatedSubmission.data);

      setInjuryFormData((prev) => ({
        ...prev!,
        saStatus: updatedStatus,
        saUpdateDate: currentDate,
        saPDF: pdfS3Key,
        ...((!prev?.saCreateDate || prev.saCreateDate === "") && { saCreateDate: currentDate }),
      }));

      setShowSaveConfirmationModal(true);
    } catch (error) {
      console.error("❌ Error saving Safety Alert:", error);
      alert("Error saving Safety Alert. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };







  // Update your existing handleFileUpload function
  const handleFileUpload = async (file: File, type: "before" | "after") => {
    if (type === "before") {
      setUploadingBefore(true);
    } else {
      setUploadingAfter(true);
    }

    try {
      // Upload file and get both the key and URL
      const uploadResult = await uploadFileToS3(file);

      // Update state with both the key and URL
      setHasFormChanges(true);

      if (type === "before") {
        setBeforeImageUrl(uploadResult.url);
        setInjuryFormData((prev) => ({
          ...prev!,
          saImageBefore: uploadResult.key
        }));
      } else {
        setAfterImageUrl(uploadResult.url);
        setInjuryFormData((prev) => ({
          ...prev!,
          saImageAfter: uploadResult.key
        }));
      }
    } catch (error) {
      console.error(`Error uploading ${type} image:`, error);
      alert(`Failed to upload ${type} image. Please try again.`);
    } finally {
      if (type === "before") {
        setUploadingBefore(false);
      } else {
        setUploadingAfter(false);
      }
    }
  };



  const generatePDFDocument = async (): Promise<Blob | null> => {
    console.log('Starting PDF document generation...');
    if (!printableRef.current) {
      console.error('printableRef is null or undefined');
      return null;
    }

    try {
      // Preload images to ensure they're available for PDF generation
      await preloadImages();

      console.log('Creating temporary container...');
      // Create a temporary container and add it to the DOM
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'fixed';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '0';
      document.body.appendChild(tempContainer);

      // Clone the element to avoid modifying the original
      console.log('Cloning printable element...');
      const clonedElement = printableRef.current.cloneNode(true) as HTMLElement;
      tempContainer.appendChild(clonedElement);

      // Update image sources in the cloned element to use the proper S3 URLs
      const images = clonedElement.querySelectorAll('img');
      images.forEach(img => {
        if (img.alt === "Before Incident" && beforeImageUrl) {
          img.src = beforeImageUrl;
        } else if (img.alt === "After Incident" && afterImageUrl) {
          img.src = afterImageUrl;
        }
        img.crossOrigin = "anonymous";
      });

      // Wait for the DOM to update
      console.log('Waiting for DOM update...');
      await new Promise(resolve => setTimeout(resolve, 500));

      // Process images in the cloned element
      console.log('Processing images in cloned element...');
      await Promise.all(Array.from(images).map(async (img, index) => {
        if (img instanceof HTMLImageElement) {
          console.log(`Processing image ${index + 1}/${images.length}: ${img.src}`);
          return new Promise<void>((resolve) => {
            if (img.complete) {
              console.log(`Image ${index + 1} already loaded`);
              resolve();
            } else {
              console.log(`Waiting for image ${index + 1} to load...`);
              img.onload = () => {
                console.log(`Image ${index + 1} loaded successfully`);
                resolve();
              };
              img.onerror = () => {
                console.error(`Error loading image ${index + 1}`);
                resolve();
              };
            }
          });
        }
        return Promise.resolve();
      }));

      // Generate canvas
      console.log('Generating canvas with html2canvas...');
      const canvas = await html2canvas(clonedElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: true,
        onclone: (documentClone) => {
          console.log('html2canvas clone callback executed');
          // Remove any data-html2canvas-ignore attributes
          const ignoreElements = documentClone.querySelectorAll('[data-html2canvas-ignore]');
          console.log(`Found ${ignoreElements.length} elements with data-html2canvas-ignore`);
          ignoreElements.forEach(el => {
            el.removeAttribute('data-html2canvas-ignore');
          });
        }
      });

      // Clean up the temporary container
      console.log('Removing temporary container from DOM...');
      document.body.removeChild(tempContainer);

      // Create PDF
      console.log('Creating PDF from canvas...');
      const imgData = canvas.toDataURL('image/jpeg', 0.95);

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = 210; // A4 width in mm
      const pdfHeight = 297; // A4 height in mm

      // Calculate aspect ratio
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = imgHeight / imgWidth;

      // Fit image to page while maintaining aspect ratio
      let finalWidth, finalHeight;
      if (ratio > pdfHeight / pdfWidth) {
        finalHeight = pdfHeight - 20; // Add some margin
        finalWidth = finalHeight / ratio;
      } else {
        finalWidth = pdfWidth - 20; // Add some margin
        finalHeight = finalWidth * ratio;
      }

      // Add image to PDF with proper dimensions
      pdf.addImage(imgData, 'JPEG', 10, 10, finalWidth, finalHeight);

      // Get PDF as blob
      //const pdfBlob = pdf.output('blob');
      const arrayBuffer = pdf.output('arraybuffer');
      const pdfBlob = new Blob([arrayBuffer], { type: 'application/pdf' });


      console.log('PDF document generation completed successfully!');
      return pdfBlob;
    } catch (error) {
      console.error('Error generating PDF:', error);
      if (error instanceof Error) {
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      return null;
    }
  };




  // Update email function to use the PDF blob and your existing EmailNotification component
  const handleEmailPDF = async () => {
    setIsLoading(true);
    try {
      // Use the same method that works for downloading
      const element = document.getElementById('printableRef');
      if (!element) {
        throw new Error('Printable element not found');
      }

      // Ensure images are preloaded
      await preloadImages();

      // Generate canvas with proper settings
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: true,
        onclone: (clonedDoc) => {
          // Fix for images in cloned document
          const clonedImages = clonedDoc.querySelectorAll('img');
          clonedImages.forEach(img => {
            img.crossOrigin = 'anonymous';
          });
        }
      });

      // Create PDF with proper settings
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = 210; // A4 width in mm
      const pdfHeight = 297; // A4 height in mm

      // Calculate aspect ratio
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = imgHeight / imgWidth;

      // Fit image to page while maintaining aspect ratio
      let finalWidth, finalHeight;
      if (ratio > pdfHeight / pdfWidth) {
        finalHeight = pdfHeight - 20; // Add some margin
        finalWidth = finalHeight / ratio;
      } else {
        finalWidth = pdfWidth - 20; // Add some margin
        finalHeight = finalWidth * ratio;
      }

      // Add image to PDF with proper dimensions
      pdf.addImage(imgData, 'JPEG', 10, 10, finalWidth, finalHeight);

      // Get PDF as blob
      const pdfBlob = pdf.output('blob');

      // Convert blob to file with explicit content type
      const pdfFile = new File([pdfBlob], 'safety-alert.pdf', {
        type: 'application/pdf'
      });

      // Upload PDF to S3 with explicit content type
      const uploadResult = await uploadData({
        path: `public/safetyalertpdfs/${Date.now()}-safety-alert.pdf`,
        data: pdfFile,
        options: {
          bucket: 'safetyAlertStorage',
          contentType: 'application/pdf', // Explicitly set content type
          metadata: {
            'Content-Disposition': 'inline' // Ensure browser displays it inline
          }
        }
      }).result;

      // Generate a presigned URL with proper parameters
      const presignedUrlResult = await getUrl({
        path: uploadResult.path,
        options: {
          bucket: 'safetyAlertStorage',
          validateObjectExistence: false,
          expiresIn: 90480000, // 7 days
          //responseContentType: 'application/pdf', // Ensure correct content type in response
          //responseContentDisposition: 'inline' // Display inline in browser
        }
      });

      // Get the URL string
      let urlString = presignedUrlResult.url.toString();

      // Add response-content-type and response-content-disposition parameters
      // Note: This approach may not work for all S3 configurations
      if (!urlString.includes('response-content-type')) {
        const separator = urlString.includes('?') ? '&' : '?';
        urlString += `${separator}response-content-type=application/pdf&response-content-disposition=inline`;
      }

      // Store the presigned URL for the email notification component
      setPdfUrl(presignedUrlResult.url.toString());

      // Show safety alert email notification component
      setShowSafetyAlertEmail(true);
    } catch (error) {
      console.error('Error preparing safety alert email:', error);
      alert('Failed to prepare safety alert email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };






  // Function to generate PDF
  const handleGeneratePDF = async () => {

    await preloadImages();


    try {
      // Ensure all images are loaded before generating PDF
      const images = document.querySelectorAll('img');
      await Promise.all(Array.from(images).map(img => {
        return new Promise<void>((resolve) => {
          if (img.complete) {
            resolve();
          } else {
            img.onload = () => resolve();
            img.onerror = () => {
              console.error(`#2 ${Date.now() - performance.now()}ms Error loading image ${img.src}`);
              resolve();
            };
          }
        });
      }));

      // Set proper options for html2canvas
      const element = document.getElementById('printableRef');
      if (!element) return;

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true, // Enable CORS for cross-origin images
        allowTaint: true, // Allow tainted canvas
        logging: true,
        onclone: (clonedDoc) => {
          // Fix for images in cloned document
          const clonedImages = clonedDoc.querySelectorAll('img');
          clonedImages.forEach(img => {
            img.crossOrigin = 'anonymous';
          });
        }
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = 210; // A4 width in mm
      const pdfHeight = 297; // A4 height in mm

      // Calculate aspect ratio
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = imgHeight / imgWidth;

      // Fit image to page while maintaining aspect ratio
      let finalWidth, finalHeight;
      if (ratio > pdfHeight / pdfWidth) {
        finalHeight = pdfHeight - 20; // Add some margin
        finalWidth = finalHeight / ratio;
      } else {
        finalWidth = pdfWidth - 20; // Add some margin
        finalHeight = finalWidth * ratio;
      }

      // Add image to PDF with proper dimensions
      pdf.addImage(imgData, 'JPEG', 10, 10, finalWidth, finalHeight);

      // Save the PDF
      pdf.save('safety-alert.pdf');
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };



  // Helper function to limit canvas size
  function limitCanvasSize(width: number, height: number): { width: number, height: number } {
    const maxPixels = 16000000; // Safe for most browsers including Safari
    const totalPixels = width * height;

    if (totalPixels <= maxPixels) {
      return { width, height };
    }

    const scalar = Math.sqrt(maxPixels) / Math.sqrt(totalPixels);
    return {
      width: Math.floor(width * scalar),
      height: Math.floor(height * scalar)
    };
  }





  // Function to generate PDF
  const generatePDF = async (): Promise<Blob | null> => {
    if (!printableRef.current) return null;

    try {
      const canvas = await html2canvas(printableRef.current, {
        scale: 2,
        useCORS: true,
      });

      const imgData = canvas.toDataURL("image/png");

      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = 210;
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);

      return pdf.output("blob"); // Return PDF as a Blob
    } catch (error) {
      console.error("Error generating PDF:", error);
      return null;
    }
  };

  // Handle Send Email Logic
  const handleSendEmail = async () => {
    const generatedPdfBlob = await generatePDF();
    if (!generatedPdfBlob) {
      console.error("Failed to generate PDF.");
      return;
    }

    setPdfBlob(generatedPdfBlob); // Save the generated PDF Blob
    setIsEmailModalOpen(true); // Open Email Modal
  };

  // Handle Print Logic
  const handlePrint = async () => {
    const generatedPdfBlob = await generatePDF();
    if (generatedPdfBlob) {
      const url = URL.createObjectURL(generatedPdfBlob);
      window.open(url); // Open the PDF in a new tab for printing
    }
  };



  const getImageUrl = async (key: string) => {
    try {
      const urlResult = await getUrl({
        path: key,
        options: {
          bucket: 'safetyAlertStorage',
          validateObjectExistence: false
        }
      });
      return urlResult.url.toString();
    } catch (error) {
      console.error('Error generating image URL:', error);
      return ''; // Return empty string or placeholder image URL
    }
  };



  const generateImageUrl = async (key: string): Promise<string> => {
    try {
      const urlResult = await getUrl({
        path: key,
        options: {
          bucket: 'safetyAlertStorage',
          validateObjectExistence: false
        }
      });
      return urlResult.url.toString();
    } catch (error) {
      console.error('Error generating image URL:', error);
      return ''; // Return empty string on error
    }
  };

  const handleImageError = (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const img = event.currentTarget;
    img.onerror = null; // Prevent infinite loop
    img.src = '/placeholder-image.png'; // Path to a placeholder image in your public folder
  };

  const preloadImages = async (): Promise<void> => {
    console.log('Preloading images...');
    console.log('Before image URL:', beforeImageUrl);
    console.log('After image URL:', afterImageUrl);

    const imageUrls = [beforeImageUrl, afterImageUrl].filter(Boolean);

    if (imageUrls.length === 0) {
      console.log('No images to preload');
      return;
    }

    try {
      // Use Promise.all to wait for all images to load
      await Promise.all(imageUrls.map((url, index) => {
        return new Promise<void>((resolve) => {
          console.log(`Starting to preload image ${index + 1}/${imageUrls.length}: ${url}`);
          const img = new Image();
          img.crossOrigin = 'anonymous';

          // Properly typed onload handler
          img.onload = () => {
            console.log(`Successfully preloaded image ${index + 1}: ${url}`);
            resolve();
          };

          // Properly typed onerror handler
          img.onerror = (error) => {
            console.error(`Failed to preload image ${index + 1}: ${url}`, error);
            console.log('Continuing despite image load error');
            resolve(); // Resolve anyway to continue the process
          };

          // Set the src after setting up event handlers
          img.src = url;
          console.log(`Image ${index + 1} src set to: ${url}`);
        });
      }));

      console.log('All images successfully preloaded');
    } catch (error) {
      console.error('Error during image preloading:', error);
    }
  };





  return (
    <div className="border-b">
      {/* Section Header */}
      <button
        onClick={onToggle}
        className={`w-full flex justify-between items-center px-4 py-3 text-sm font-medium transition-all duration-200 border-b border-gray-200 last:border-b-0
        ${isExpanded ? "bg-red-50" : "bg-white"} 
        hover:bg-red-200 hover:text-sm rounded-md`}
      >
        <div className="flex items-center">
          {isExpanded ? <ChevronDown className="h-5 w-5 mr-2" /> : <ChevronRight className="h-5 w-5 mr-2" />}
          <span>Safety Alert</span>
        </div>

        {/* Status Display */}
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-full 
            ${formData?.saStatus === "SAFETY_ALERT_NOT_CREATED"
              ? "bg-yellow-100 text-yellow-800"
              : formData?.saStatus === "SAFETY_ALERT_OPEN"
                ? "bg-blue-100 text-blue-800"
                : formData?.saStatus === "SAFETY_ALERT_CREATED"
                  ? "bg-green-100 text-green-800"
                  : "bg-gray-100 text-gray-800"
            }`}
        >
          {(() => {
            switch (formData?.saStatus) {
              case "SAFETY_ALERT_NOT_CREATED":
                return "Safety Alert - Not Created";
              case "SAFETY_ALERT_OPEN":
                return "Safety Alert - Open";
              case "SAFETY_ALERT_CREATED":
                return "Safety Alert - Created";
              default:
                return "Unknown";
            }
          })()}
        </span>
      </button>

      {isExpanded && (
        <div className="p-4">
          {/* Do you wish to create a safety alert? */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200 mb-6">
            <div className="bg-slate-50 px-4 py-3 border-b border-gray-200">
              <h2 className="text-sm font-semibold text-gray-600">Safety Alert Options</h2>
            </div>

            <div className="p-6 space-y-4">
              <div className="mb-4">
                <label className="block text-gray-700 text-xs uppercase tracking-wider font-bold mb-2">
                  Do you wish to create a safety alert?
                </label>
                <div className="flex gap-4 mt-1">
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      name="createSafetyAlert"
                      value="yes"
                      checked={showSafetyAlertForm}
                      onChange={() => setShowSafetyAlertForm(true)}
                      className="custom-radio"
                    />
                    <span className="ml-2 text-[#800000] font-medium">Yes</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      name="createSafetyAlert"
                      value="no"
                      checked={!showSafetyAlertForm}
                      onChange={() => setShowSafetyAlertForm(false)}
                      className="custom-radio"
                    />
                    <span className="ml-2 text-[#800000] font-medium">No</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {showSafetyAlertForm && formData && (
            <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200 mb-6">
              <div className="bg-slate-50 px-4 py-3 border-b border-gray-200">
                <h2 className="text-sm font-semibold text-gray-600">Safety Alert Details</h2>
              </div>

              <div className="p-6 space-y-4">
                {/* Author, Injury, and Property Damage */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  {/* Author Field */}
                  <div className="space-y-1">
                    <label className="block text-gray-700 text-xs uppercase tracking-wider font-bold">
                      Author <span className="text-gray-300 text-xs italic font-mono">(read-only)</span>
                    </label>
                    <input
                      type="text"
                      value={formData.saAuthor || ""}
                      readOnly
                      className="w-full p-2 border border-gray-300 rounded-md text-sm bg-gray-100 text-gray-600 cursor-not-allowed"
                    />
                  </div>

                  {/* Injury Flag */}
                  <div className="space-y-1">
                    <label className="block text-gray-700 text-xs uppercase tracking-wider font-bold">
                      Injury Status
                    </label>
                    <div className="flex items-center h-10">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.saInjuryFlag}
                          onChange={(e) => {
                            setHasFormChanges(true);
                            setInjuryFormData((prev) => ({
                              ...prev!,
                              saInjuryFlag: e.target.checked,
                            }));
                          }}
                          className="custom-checkbox h-4 w-4 border-gray-400 rounded-sm focus:ring-[#800000] checked:border-[#800000]"
                        />
                        <span className="text-gray-700">Injury</span>
                      </label>
                    </div>
                  </div>

                  {/* Property Damage Flag */}
                  <div className="space-y-1">
                    <label className="block text-gray-700 text-xs uppercase tracking-wider font-bold">
                      Property Status
                    </label>
                    <div className="flex items-center h-10">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.saPropertyDamageFlag}
                          onChange={(e) => {
                            setHasFormChanges(true);
                            setInjuryFormData((prev) => ({
                              ...prev!,
                              saPropertyDamageFlag: e.target.checked,
                            }));
                          }}
                          className="custom-checkbox h-4 w-4 border-gray-400 rounded-sm focus:ring-[#800000] checked:border-[#800000]"
                        />
                        <span className="text-gray-700">Property Damage</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Plant Location, Date, Time */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  {/* Plant Location Field */}
                  <div className="space-y-1">
                    <label className="block text-gray-700 text-xs uppercase tracking-wider font-bold">
                      Plant Location <span className="text-gray-300 text-xs italic font-mono">(read-only)</span>
                    </label>
                    <input
                      type="text"
                      value={formData.locationOnSite || ""}
                      readOnly
                      className="w-full p-2 border border-gray-300 rounded-md text-sm bg-gray-100 text-gray-600 cursor-not-allowed"
                    />
                  </div>


                  {/* Date of Incident Field */}
                  <div className="space-y-1">
                    <label className="block text-gray-700 text-xs uppercase tracking-wider font-bold">
                      Date of Incident <span className="text-gray-300 text-xs italic font-mono">(read-only)</span>
                    </label>
                    <input
                      type="date"
                      value={formData.dateOfIncident || ""}
                      readOnly
                      className="w-full p-2 border border-gray-300 rounded-md text-sm bg-gray-100 text-gray-600 cursor-not-allowed"
                    />
                  </div>

                  {/* Time of Incident Field */}
                  <div className="space-y-1">
                    <label className="block text-gray-700 text-xs uppercase tracking-wider font-bold">
                      Time Of Incident <span className="text-gray-300 text-xs italic font-mono">(read-only)</span>
                    </label>
                    <input
                      type="text"
                      value={`${formData.timeOfIncidentHour || "00"}:${formData.timeOfIncidentMinute || "00"} ${formData.timeOfInjuryAmPm || ""}`}
                      readOnly
                      className="w-full p-2 border border-gray-300 rounded-md text-sm bg-gray-100 text-gray-600 cursor-not-allowed"
                    />
                  </div>


                </div>

                {/* Where did this Occur? */}
                <div className="space-y-1">
                  <label className="block text-gray-700 text-xs uppercase tracking-wider font-bold">
                    Where did this Occur? <span className="text-gray-300 text-xs italic font-mono">(read-only)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.whereDidThisOccur || ""}
                    readOnly
                    className="w-full p-2 border border-gray-300 rounded-md text-sm bg-gray-100 text-gray-600 cursor-not-allowed"
                  />
                </div>
                {/* Incident Description / Problem Description */}
                <div className="space-y-1">
                  <label className="block text-gray-700 text-xs uppercase tracking-wider font-bold">
                    {formData.recordType === "OBSERVATION_REPORT" 
                      ? "Describe Problem or Issue" 
                      : "Incident Description"
                    } <span className="text-gray-300 text-xs italic font-mono">(read-only)</span>
                  </label>
                  <textarea
                    value={formData.incidentDescription || ""}
                    readOnly
                    className="w-full p-2 border border-gray-300 rounded-md text-sm bg-gray-100 text-gray-600 cursor-not-allowed"
                    rows={4}
                  />
                </div>


                {/* Action and Next Steps */}
                <div className="space-y-1">
                  <label className="block text-gray-700 text-xs uppercase tracking-wider font-bold">
                    Action and Following Steps
                  </label>
                  <textarea
                    placeholder="Specific action and next steps (<600 characters)"
                    value={formData.saActionAndNextSteps || ""}
                    onChange={(e) => {
                      setHasFormChanges(true);
                      setInjuryFormData((prev) => ({
                        ...prev!,
                        saActionAndNextSteps: e.target.value,
                      }));
                    }}
                    maxLength={600}
                    className="w-full p-2 border border-gray-300 rounded-md text-sm placeholder:text-xs placeholder:font-mono focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                    rows={3}
                  />
                </div>



                {/* Image Upload Section */}
                <div className="space-y-1 mt-6">
                  <label className="block text-gray-700 text-xs uppercase tracking-wider font-bold mb-2">
                    Image Uploads
                  </label>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    {/* Upload format instruction */}
                    <div className="mb-3 w-full">
                      <p className="text-sm text-gray-500 italic flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        Upload jpg or png format only (max 5MB)
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Before Photo */}
                      <div className="space-y-2">
                        <label className="block text-gray-700 text-xs uppercase tracking-wider font-bold">
                          Photo 1: Before
                        </label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              handleFileUpload(e.target.files[0], "before");
                            }
                          }}
                          className="block w-full text-sm text-gray-500 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                        {uploadingBefore && <p className="text-xs text-gray-500 mt-1">Uploading...</p>}
                        {formData?.saImageBefore && (
                          <div className="mt-2 border border-gray-200 rounded-md overflow-hidden">
                            {beforeImageUrl ? (
                              <img
                                src={beforeImageUrl || undefined}
                                alt="Before Incident"
                                crossOrigin="anonymous"
                                className="w-full h-48 object-cover"
                                onError={(e) => {
                                  e.currentTarget.src = '/placeholder-image-before.jpg';
                                  console.log('Image failed to load, using fallback');
                                }}
                              />
                            ) : (
                              <div className="w-full h-48 bg-gray-100 flex items-center justify-center">
                                <p className="text-sm text-gray-500">Loading image...</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>


                      {/* After Photo */}
                      <div className="space-y-2">
                        <label className="block text-gray-700 text-xs uppercase tracking-wider font-bold">
                          Photo 2: After
                        </label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              handleFileUpload(e.target.files[0], "after");
                            }
                          }}
                          className="block w-full text-sm text-gray-500 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                        {uploadingAfter && <p className="text-xs text-gray-500 mt-1">Uploading...</p>}
                        {formData?.saImageAfter && (
                          <div className="mt-2 border border-gray-200 rounded-md overflow-hidden">
                            {afterImageUrl ? (
                              <img
                                src={afterImageUrl || undefined}
                                alt="After Incident"
                                crossOrigin="anonymous"
                                className="w-full h-48 object-cover"
                                onError={(e) => {
                                  e.currentTarget.src = '/placeholder-image-after.jpeg';
                                  console.log('After image failed to load, using fallback');
                                }}
                              />
                            ) : (
                              <div className="w-full h-48 bg-gray-100 flex items-center justify-center">
                                <p className="text-sm text-gray-500">Loading image...</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                    </div>
                  </div>
                </div>

                {/* Hidden printable view for PDF generation */}
                <div ref={printableRef} style={{ position: 'absolute', left: '-9999px', top: 0, opacity: 0 }}>
                  {formData && <SafetyAlertPrintable formData={formData} />}
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end mt-6 pt-4 border-t border-gray-100">
                  {/* Save Changes Button - Always visible */}
                  <button
                    onClick={() => saveSafetyAlert(false)}
                    className="px-4 py-2 bg-red-600 text-white rounded-md flex items-center gap-2 hover:bg-red-700 transition-colors shadow-sm"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Saving...' : 'Save Changes'}
                  </button>

                  {/* PDF and Email buttons - Only visible after saving and when both images are available */}
                  {formData.saStatus === "SAFETY_ALERT_CREATED" && formData.saImageBefore && formData.saImageAfter && (
                    <>
                      {/* Download PDF Button */}
                      <button
                        onClick={handleGeneratePDF}
                        className="px-4 py-2 ml-3 bg-cyan-400 text-white rounded-md flex items-center gap-2 hover:bg-cyan-700 transition-colors shadow-sm"
                        disabled={isLoading}
                      >
                        <span>Download PDF</span>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>

                      {/* Email Safety Alert Button */}
                      <button
                        onClick={handleEmailPDF}
                        className="px-4 py-2 ml-3 bg-indigo-400 text-white rounded-md flex items-center gap-2 hover:bg-indigo-700 transition-colors shadow-sm"
                        disabled={isLoading}
                      >
                        <span>Email Safety Alert</span>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                          <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                        </svg>
                      </button>
                    </>
                  )}
                </div>

                {/* Display a message if images are missing but status is created */}
                {formData.saStatus === "SAFETY_ALERT_CREATED" && (!formData.saImageBefore || !formData.saImageAfter) && (
                  <p className="text-amber-600 text-center mt-2">
                    Please upload both before and after images to enable PDF download and email options.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Email notification modal */}
          {showSafetyAlertEmail && (
            <SafetyAlertEmailNotification
              isOpen={showSafetyAlertEmail}
              onClose={() => setShowSafetyAlertEmail(false)}
              onSuccess={() => {
                setShowSafetyAlertEmail(false);
              }}
              alertId={formData?.submissionId || 'SA-' + new Date().getTime()}
              title={formData?.title || 'Safety Alert'}
              attachmentUrl={pdfUrl}
            />
          )}

          {/* Save Confirmation Modal */}
          {showSaveConfirmationModal && (
            <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
              <div className="bg-white rounded-md shadow-lg p-6 w-full max-w-xs text-center">
                <h3 className="text-md font-semibold text-gray-800 mb-4">Success</h3>
                <p className="text-sm text-gray-700 mb-6">
                  Safety Alert changes have been saved successfully.
                </p>
                <button
                  onClick={() => setShowSaveConfirmationModal(false)}
                  className="px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 transition"
                >
                  OK
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );



}
