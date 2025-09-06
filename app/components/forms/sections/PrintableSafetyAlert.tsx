import { InjuryFormData } from "@/app/types";
import React from "react";

interface PrintableSafetyAlertProps {
  formData: Partial<InjuryFormData>;
}

const PrintableSafetyAlert: React.FC<PrintableSafetyAlertProps> = ({ formData }) => {
  return (
    <div className="printable-container">
      <h1 className="text-center text-lg font-bold mb-4">Safety Alert Report</h1>

      {/* Author */}
      <div className="mb-4">
        <strong>Author:</strong> {formData.saAuthor || "N/A"}
      </div>

      {/* Injury and Property Damage Flags */}
      <div className="mb-4">
        <strong>Injury:</strong> {formData.saInjuryFlag ? "Yes" : "No"}
        <br />
        <strong>Property Damage:</strong> {formData.saPropertyDamageFlag ? "Yes" : "No"}
      </div>

      {/* Plant Location, Date, and Time */}
      <div className="mb-4">
        <strong>Plant Location:</strong> {formData.locationOnSite || "N/A"}
        <br />
        <strong>Date of Incident:</strong> {formData.dateOfIncident || "N/A"}
        <br />
        <strong>Time of Incident:</strong>{" "}
        {`${formData.timeOfIncidentHour || "--"}:${formData.timeOfIncidentMinute || "--"} ${
          formData.timeOfInjuryAmPm || "--"
        }`}
      </div>

      {/* Incident Description */}
      <div className="mb-4">
        <strong>Incident Description:</strong>
        <p>{formData.incidentDescription || "N/A"}</p>
      </div>

      {/* Action and Following Steps */}
      <div className="mb-4">
        <strong>Action and Following Steps:</strong>
        <p>{formData.saActionAndNextSteps || "N/A"}</p>
      </div>

      {/* Where Did This Occur */}
      <div className="mb-4">
        <strong>Where Did This Occur:</strong> {formData.saWhereInPlant || "N/A"}
      </div>

      {/* Safety Alert Status */}
      <div className="mb-4">
        <strong>Safety Alert Status:</strong>{" "}
        {formData.saStatus === "SAFETY_ALERT_OPEN"
          ? "Open"
          : formData.saStatus === "SAFETY_ALERT_CREATED"
          ? "Created"
          : "Not Created"}
      </div>

      {/* Photos */}
      <div className="mb-4">
        <h2 className="text-lg font-bold">Photos</h2>
        {formData.saImageBefore && (
          <>
            <p><strong>Photo 1 (Before):</strong></p>
            <img
              src={formData.saImageBefore}
              alt="Before Incident"
              className="w-full max-w-md mb-4"
            />
          </>
        )}
        {formData.saImageAfter && (
          <>
            <p><strong>Photo 2 (After):</strong></p>
            <img
              src={formData.saImageAfter}
              alt="After Incident"
              className="w-full max-w-md mb-4"
            />
          </>
        )}
      </div>
    </div>
  );
};

export default PrintableSafetyAlert;
