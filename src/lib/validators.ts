// Validación de RUT chileno
export const validateRUT = (rut: string): boolean => {
  // Eliminar puntos y guión
  const cleanRUT = rut.replace(/\./g, '').replace(/-/g, '');
  
  if (cleanRUT.length < 2) return false;
  
  const body = cleanRUT.slice(0, -1);
  const dv = cleanRUT.slice(-1).toUpperCase();
  
  // Validar que el cuerpo sea numérico
  if (!/^\d+$/.test(body)) return false;
  
  // Calcular dígito verificador
  let sum = 0;
  let multiplier = 2;
  
  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  
  const calculatedDV = 11 - (sum % 11);
  const expectedDV = calculatedDV === 11 ? '0' : calculatedDV === 10 ? 'K' : calculatedDV.toString();
  
  return dv === expectedDV;
};

// Formatear RUT con puntos y guión
export const formatRUT = (rut: string): string => {
  const cleanRUT = rut.replace(/\./g, '').replace(/-/g, '');
  
  if (cleanRUT.length < 2) return cleanRUT;
  
  const body = cleanRUT.slice(0, -1);
  const dv = cleanRUT.slice(-1);
  
  // Agregar puntos cada 3 dígitos
  const formattedBody = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  
  return `${formattedBody}-${dv}`;
};

// Validación de teléfono chileno
export const validateChileanPhone = (phone: string): boolean => {
  // Eliminar espacios y caracteres especiales
  const cleanPhone = phone.replace(/\s/g, '').replace(/[-()+]/g, '');
  
  // Validar formato chileno: +56 9 XXXX XXXX o 9 XXXX XXXX
  const phoneRegex = /^(\+?56)?9\d{8}$/;
  
  return phoneRegex.test(cleanPhone);
};

// Formatear teléfono chileno
export const formatChileanPhone = (phone: string): string => {
  const cleanPhone = phone.replace(/\s/g, '').replace(/[-()+]/g, '');
  
  // Si tiene código de país
  if (cleanPhone.startsWith('56')) {
    const number = cleanPhone.slice(2);
    return `+56 ${number.slice(0, 1)} ${number.slice(1, 5)} ${number.slice(5)}`;
  }
  
  // Si no tiene código de país
  if (cleanPhone.startsWith('9') && cleanPhone.length === 9) {
    return `+56 ${cleanPhone.slice(0, 1)} ${cleanPhone.slice(1, 5)} ${cleanPhone.slice(5)}`;
  }
  
  return phone;
};
