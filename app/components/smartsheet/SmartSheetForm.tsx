// app/components/smartsheet/SmartSheetForm.tsx
'use client';

export default function SmartSheetForm() {

  return (
    <div className="flex justify-center items-center w-full h-full">
      <iframe
        src="https://app.smartsheet.com/b/form/42c7367685a2480ca91471cf2e0a45d0"
        title="Injury Report Form"
        className="custom-iframe border-0"
        allow="accelerometer; camera; encrypted-media; geolocation; gyroscope; microphone"
      />
    </div>
  );
}

 // return (
    //<div className="main-content">
      //<div className="content-wrapper">
   //     <iframe
     //     src="https://app.smartsheet.com/b/form/42c7367685a2480ca91471cf2e0a45d0"
       //   title="Injury Report Form"
        //  className="custom-iframe-width border-0"
        //  allow="accelerometer; camera; encrypted-media; geolocation; gyroscope; microphone"
       // />
      //</div>
    //</div>
  //);