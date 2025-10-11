package com.lastcallsw.trackeats.utils;

import java.security.SecureRandom;
import java.util.Base64;

/**
 * Utility class for generating secure random tokens.
 */
public class TokenGenerator {
    
    private static final SecureRandom secureRandom = new SecureRandom();
    
    /**
     * Generates a secure random token of the specified length.
     * 
     * @param length The length of the token in bytes (the resulting Base64 string will be longer)
     * @return A Base64 encoded random token
     */
    public static String generateToken(int length) {
        byte[] randomBytes = new byte[length];
        secureRandom.nextBytes(randomBytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);
    }
    
    /**
     * Generates a secure random token with a default length of 32 bytes.
     * 
     * @return A Base64 encoded random token
     */
    public static String generateToken() {
        return generateToken(32); // 32 bytes = 256 bits, which is sufficiently secure
    }
}
