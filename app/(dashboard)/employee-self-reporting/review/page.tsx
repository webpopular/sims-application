// app/dashboard/qr-codes/review/page.tsx
export default function QRCodeReviewPage() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
                  
        {/* QR Code Review Content */}
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium mb-2">Plant Specific QR Codes</h3>
            <p className="text-gray-600">
              Anyone can submit a First Report of Injury or Observation using a PLANT SPECIFIC QR Code.
            </p>
            <hr className="my-2 border-gray-300" />
            <p className="text-gray-600">
              The user can see and take action on QR code submissions assigned to them.
            </p>
            <p className="text-gray-600 mt-2">At a high level, the user reviews and decides to:</p>
            <ul className="list-disc pl-5 mt-2 text-gray-600">
              <li>Reject the submission, no further action required.</li>
              <li>Accept the submission. Actions required after submission (see Completing First Reports)</li>
            </ul>
          </div>

          {/* QR Code List/Grid would go here */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* QR Code Items */}
          </div>
        </div>
      </div>
    </div>
  );
}