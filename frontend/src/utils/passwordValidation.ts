// Password validation utility for both registration and password change
// Returns an error message string if invalid, or an empty string if valid

export function validatePassword(password: string): string {
    const specialCharsRegex = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/;
    if (password.length === 0) {
        return "Password is required";
    }
    if (password.length < 8) {
        return "Password must be at least 8 characters";
    }
    if (!password.match(/[a-z]/)) {
        return "Password must contain at least one lower-case character";
    }
    if (!password.match(/[A-Z]/)) {
        return "Password must contain at least one upper-case character";
    }
    if (!password.match(/[0-9]/)) {
        return "Password must contain at least one numeric character";
    }
    if (!password.match(specialCharsRegex)) {
        return "Password must contain at least one special character";
    }
    return "";
}
