export const MIN_AGE = 16;

export const calculateAgeInfo = (birthDate) => {
    if (!birthDate) return { age: null, isUnder16: false };
    const today = new Date();
    const dob = new Date(birthDate);
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        age--;
    }
    return { age, isUnder16: age < MIN_AGE };
};

export const AGE_ERROR_MESSAGE = 'Du musst mindestens 16 Jahre alt sein, um Cavio zu nutzen. Für jüngere Athleten folgt in Zukunft ein Managed-Account-System.';
