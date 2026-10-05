// Arabic Number to Words for Egyptian Pounds (Tafqeet)
export function numberToArabicWords(num: number): string {
  if (isNaN(num) || num <= 0) return '';

  const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
  const tens = ['', 'عشرة', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
  const teens = ['عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
  const hundreds = ['', 'مائة', 'مئتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];

  function convertGroup(n: number): string {
    let result = '';
    const h = Math.floor(n / 100);
    const rem = n % 100;
    const t = Math.floor(rem / 10);
    const o = rem % 10;

    if (h > 0) {
      result += hundreds[h];
    }

    if (rem > 0) {
      if (result !== '') result += ' و';
      if (rem < 10) {
        result += ones[rem];
      } else if (rem >= 10 && rem <= 19) {
        result += teens[rem - 10];
      } else {
        if (o > 0) {
          result += ones[o] + ' و' + tens[t];
        } else {
          result += tens[t];
        }
      }
    }
    return result;
  }

  const integerPart = Math.floor(num);
  const decimalPart = Math.round((num - integerPart) * 100);

  if (integerPart === 0 && decimalPart === 0) return 'صفر جنيه مصري';

  let parts: string[] = [];

  // Millions
  const millions = Math.floor(integerPart / 1000000);
  const remainderMillions = integerPart % 1000000;
  if (millions > 0) {
    if (millions === 1) parts.push('مليون');
    else if (millions === 2) parts.push('مليونان');
    else if (millions >= 3 && millions <= 10) parts.push(convertGroup(millions) + ' ملايين');
    else parts.push(convertGroup(millions) + ' مليون');
  }

  // Thousands
  const thousands = Math.floor(remainderMillions / 1000);
  const remainderThousands = remainderMillions % 1000;
  if (thousands > 0) {
    if (thousands === 1) parts.push('ألف');
    else if (thousands === 2) parts.push('ألفان');
    else if (thousands >= 3 && thousands <= 10) parts.push(convertGroup(thousands) + ' آلاف');
    else parts.push(convertGroup(thousands) + ' ألف');
  }

  // Hundreds & Under
  if (remainderThousands > 0) {
    parts.push(convertGroup(remainderThousands));
  }

  let finalStr = 'فقط ' + parts.join(' و') + ' جنيه مصري';

  if (decimalPart > 0) {
    finalStr += ' و' + convertGroup(decimalPart) + ' قرشاً';
  }

  return finalStr + ' لا غير';
}
