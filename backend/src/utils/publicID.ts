export const generatePublicId = (): string => {
  const year = new Date().getFullYear();
  const randomNumber = Math.floor(100000 + Math.random() * 900000);

  return `SJPOS-${year}-${randomNumber}`;
};