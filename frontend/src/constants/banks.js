export const bankDirectory = [
  { name: "State Bank of India", ifscCode: "SBIN0000001", branch: "Corporate Centre" },
  { name: "HDFC Bank", ifscCode: "HDFC0000001", branch: "Mumbai Main" },
  { name: "ICICI Bank", ifscCode: "ICIC0000001", branch: "Mumbai Main" },
  { name: "Axis Bank", ifscCode: "UTIB0000001", branch: "Mumbai Main" },
  { name: "Punjab National Bank", ifscCode: "PUNB0000001", branch: "New Delhi" },
  { name: "Bank of Baroda", ifscCode: "BARB0MAINXX", branch: "Alkapuri" },
  { name: "Canara Bank", ifscCode: "CNRB0000001", branch: "Bangalore Main" },
  { name: "Union Bank of India", ifscCode: "UBIN0000001", branch: "Fort" },
  { name: "Kotak Mahindra Bank", ifscCode: "KKBK0000001", branch: "Fort" },
  { name: "IDFC FIRST Bank", ifscCode: "IDFB0010001", branch: "Mumbai" }
];

export const findBankByName = (value) => {
  const normalizedValue = String(value || "").trim().toLowerCase();

  if (!normalizedValue) {
    return null;
  }

  return bankDirectory.find((bank) => bank.name.toLowerCase() === normalizedValue) || null;
};

export const findBankByIfsc = (value) => {
  const normalizedValue = String(value || "").trim().toUpperCase();

  if (!normalizedValue) {
    return null;
  }

  return bankDirectory.find((bank) => String(bank.ifscCode || "").toUpperCase() === normalizedValue) || null;
};