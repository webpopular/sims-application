// utils/generateRecognitionId.ts
export const generateRecognitionId = (): string => {
    const now = new Date();
    const prefix = 'Rec-';
    return prefix +
      now.getFullYear().toString().slice(-2) + // YY
      String(now.getMonth() + 1).padStart(2, '0') + // MM
      String(now.getDate()).padStart(2, '0') + // DD
      '-' +
      String(now.getHours()).padStart(2, '0') + // HH
      String(now.getMinutes()).padStart(2, '0') + // MM
      String(now.getSeconds()).padStart(2, '0'); // SS
  };
  