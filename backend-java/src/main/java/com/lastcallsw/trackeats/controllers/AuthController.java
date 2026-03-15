package com.lastcallsw.trackeats.controllers;

import com.lastcallsw.trackeats.security.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.lang.NonNull;

import com.lastcallsw.trackeats.security.CustomUserDetailsService;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private CustomUserDetailsService userDetailsService;

    @Autowired
    private JwtUtil jwtUtil;

    @PostMapping("/login")
    public ResponseEntity<?> createAuthenticationToken(@NonNull @RequestBody AuthenticationRequest authenticationRequest) {
        try {
            // Authenticate the user
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            authenticationRequest.getUsername(),
                            authenticationRequest.getPassword()
                    )
            );
        } catch (BadCredentialsException e) {
            return ResponseEntity.status(401).body("Incorrect username or password");
        }

        // Generate JWT token
        final UserDetails userDetails;
        try {
            userDetails = userDetailsService.loadUserByUsername(authenticationRequest.getUsername());
            if (userDetails == null) {
                return ResponseEntity.status(401).body("User not found or account not confirmed");
            }
        } catch (Exception e) {
            return ResponseEntity.status(401).body("User not found or account not confirmed");
        }
        final String jwt = jwtUtil.generateToken(userDetails);

        return ResponseEntity.ok(new AuthenticationResponse(jwt));
    }

    // Request and response classes
    public static class AuthenticationRequest {
        @NonNull
        private String username;
        @NonNull
        private String password;

        // Default constructor for JSON deserialization
        public AuthenticationRequest() {
            this.username = "";
            this.password = "";
        }

        public AuthenticationRequest(@NonNull String username, @NonNull String password) {
            this.username = username;
            this.password = password;
        }

        public @NonNull String getUsername() {
            return username;
        }

        public void setUsername(@NonNull String username) {
            this.username = username;
        }

        public @NonNull String getPassword() {
            return password;
        }

        public void setPassword(@NonNull String password) {
            this.password = password;
        }
    }

    public static class AuthenticationResponse {
        private final String jwt;

        public AuthenticationResponse(String jwt) {
            this.jwt = jwt;
        }

        public String getJwt() {
            return jwt;
        }
    }
}
