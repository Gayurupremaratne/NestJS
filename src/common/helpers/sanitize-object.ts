import validator from 'validator';

export function sanitizeObject<T>(unsanitizedObject: T): T {
  for (const propertyKey of Object.keys(unsanitizedObject)) {
    const value = unsanitizedObject[propertyKey];

    if (typeof value === 'string') {
      unsanitizedObject[propertyKey] = validator.escape(value);
    }
  }

  return unsanitizedObject;
}
