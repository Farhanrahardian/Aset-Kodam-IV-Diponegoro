
export const normalizeKodimName = (name) => {
  // Tangani nilai null, undefined, atau string kosong
  if (!name) return "";

  // Normalisasi nama kodim
  const trimmedName = name.trim();
  
  // Tangani kasus khusus untuk Kodim Kota Semarang
  if (trimmedName.includes("Kodim 0733/Semarang") || trimmedName === "Kodim 0733/Semarang" || trimmedName.includes("Semarang")) {
    return "Kodim 0733/Kota Semarang";
  }
  
  // Tangani kasus khusus untuk Grobogan
  if (trimmedName === "Kodim 0717/Purwodadi") {
    return "Kodim 0717/Grobogan";
  }
  
  return trimmedName;
};

export const denormalizeKodimName = (name) => {
  // Tangani nilai null, undefined, atau string kosong
  if (!name) return "";
  
  // Denormalisasi nama kodim
  const trimmedName = name.trim();
  
  // Tangani kasus khusus untuk Kodim Kota Semarang
  if (trimmedName === "Kodim 0733/Kota Semarang") {
    return "Kodim 0733/Semarang (BS)";
  }
  
  // Tangani kasus khusus untuk Grobogan
  if (trimmedName === "Kodim 0717/Grobogan") {
    return "Kodim 0717/Purwodadi";
  }
  
  return trimmedName;
};
