/** Validación NIF/NIE/DNI/CIF español (misma lógica que la app Ionic / backend). */
export function validarDocumentoEspanol(documento: string): boolean {
  if (!documento?.trim()) return false
  const doc = documento.trim().toUpperCase()
  return validarNif(doc) || validarNie(doc) || validarCif(doc)
}

function validarNif(documento: string): boolean {
  if (!/^[0-9]{8}[TRWAGMYFPDXBNJZSQVHLCKE]$/.test(documento)) return false
  const number = documento.substring(0, 8)
  const letter = documento.substring(8, 9)
  const letters = 'TRWAGMYFPDXBNJZSQVHLCKE'
  return letter === letters[parseInt(number, 10) % 23]
}

function validarNie(documento: string): boolean {
  if (!/^[XYZ][0-9]{7}[TRWAGMYFPDXBNJZSQVHLCKE]$/.test(documento)) return false
  const replaceMap: Record<string, string> = { X: '0', Y: '1', Z: '2' }
  const fullNumber = replaceMap[documento[0]] + documento.substring(1, 8)
  const letter = documento.substring(8, 9)
  const letters = 'TRWAGMYFPDXBNJZSQVHLCKE'
  return letter === letters[parseInt(fullNumber, 10) % 23]
}

function cifControlDigit(number: string, doublePositions: number[]): number {
  let sum = 0
  for (let i = 0; i < 7; i++) {
    const digit = parseInt(number[i], 10)
    if (doublePositions.includes(i)) {
      const doubled = digit * 2
      sum += Math.floor(doubled / 10) + (doubled % 10)
    } else {
      sum += digit
    }
  }
  return (10 - (sum % 10)) % 10
}

function validarCif(documento: string): boolean {
  if (!/^[ABCDEFGHJNPQRSUVW][0-9]{7}[0-9A-J]$/.test(documento)) return false
  const firstChar = documento[0]
  const number = documento.substring(1, 8)
  const control = documento[8]
  const letters = 'JABCDEFGHI'
  const checkStandard = cifControlDigit(number, [0, 2, 4, 6])
  const validStandard = control === String(checkStandard) || control === letters[checkStandard]

  if (['A', 'B', 'E', 'H'].includes(firstChar)) {
    return control === String(checkStandard)
  }
  if (firstChar === 'G') {
    const checkAlternate = cifControlDigit(number, [0, 2, 4])
    const validAlternate = control === String(checkAlternate) || control === letters[checkAlternate]
    return validStandard || validAlternate
  }
  return control === letters[checkStandard]
}

/** Formatea solo los 22 dígitos (sin ES) con espacios. */
export function formatearIbanDigits(val: string): string {
  const digits = val.replace(/\D/g, '').slice(0, 22)
  const parts: string[] = []
  if (digits.length > 0) parts.push(digits.slice(0, 2))
  if (digits.length > 2) parts.push(digits.slice(2, 6))
  if (digits.length > 6) parts.push(digits.slice(6, 10))
  if (digits.length > 10) parts.push(digits.slice(10, 12))
  if (digits.length > 12) parts.push(digits.slice(12, 22))
  return parts.join(' ')
}

/** IBAN español completo (ES + 22 dígitos) con MOD-97. */
export function validarIbanEspanol(iban: string): boolean {
  const limpio = iban.toUpperCase().replace(/\s/g, '').trim()
  if (!limpio.startsWith('ES') || limpio.length !== 24) return false
  if (!/^\d+$/.test(limpio.slice(2))) return false
  const rearranged = limpio.slice(4) + limpio.slice(0, 4)
  let numeric = ''
  for (let i = 0; i < rearranged.length; i++) {
    const c = rearranged[i]
    numeric += /[A-Z]/.test(c) ? String(c.charCodeAt(0) - 55) : c
  }
  let remainder = 0
  for (let i = 0; i < numeric.length; i++) {
    remainder = (remainder * 10 + parseInt(numeric[i], 10)) % 97
  }
  return remainder === 1
}

export function normalizeIbanEs(digitsOrFull: string): string {
  const raw = digitsOrFull.toUpperCase().replace(/\s/g, '').trim()
  return raw.startsWith('ES') ? raw : `ES${raw}`
}
