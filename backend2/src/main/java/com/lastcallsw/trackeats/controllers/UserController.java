package com.lastcallsw.trackeats.controllers;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import com.lastcallsw.trackeats.entities.User;
import com.lastcallsw.trackeats.entities.Status;
import com.lastcallsw.trackeats.repositories.UserRepository;
import com.lastcallsw.trackeats.services.EmailService;
import com.lastcallsw.trackeats.utils.TokenGenerator;

import jakarta.mail.MessagingException;

import java.time.LocalDateTime;
import java.util.Optional;

@RestController
@RequestMapping("/api/users")
public class UserController {
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private PasswordEncoder passwordEncoder;
    
    @Autowired
    private EmailService emailService;

    // Get all users (admin only in a real app)
    @GetMapping
    public ResponseEntity<Iterable<User>> getAllUsers() {
        return ResponseEntity.ok(userRepository.findAll());
    }
    
    // Get user by ID
    @GetMapping("/{id}")
    public ResponseEntity<User> getUserById(@PathVariable Integer id) {
        Optional<User> user = userRepository.findById(id);
        return user.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }
    
    // Get current authenticated user
    @GetMapping("/me")
    public ResponseEntity<User> getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String username = authentication.getName();
        
        Optional<User> user = userRepository.findByUsername(username);
        return user.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build());
    }
    
    // Register a new user
    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@RequestBody RegisterRequest registerRequest) {
        try {
            // Check if username already exists
            if (userRepository.findByUsername(registerRequest.getUsername()).isPresent()) {
                return ResponseEntity.badRequest().body("Username already exists");
            }
            
            // Generate a confirmation token
            String confirmationToken = TokenGenerator.generateToken();
            
            User newUser = new User();
            newUser.setUsername(registerRequest.getUsername());
            newUser.setPasswordHash(passwordEncoder.encode(registerRequest.getPassword()));
            newUser.setStatus(Status.pending); // New users start as pending until confirmed
            newUser.setCreatedAt(LocalDateTime.now());
            newUser.setConfirmationToken(confirmationToken);
            newUser.setConfirmationSentAt(LocalDateTime.now());
            
            // In a real app, you would handle email encryption here
            // For now, we'll just store the email in a variable to use for sending the confirmation
            String userEmail = registerRequest.getEmail();
            // newUser.setEmail(encryptedEmail);
            
            User savedUser = userRepository.save(newUser);
            
            // Send confirmation email
            emailService.sendRegistrationConfirmationEmail(userEmail, savedUser.getUsername(), confirmationToken);
            
            return ResponseEntity.status(HttpStatus.CREATED).body(savedUser);
        } catch (MessagingException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("User created but failed to send confirmation email: " + e.getMessage());
        }
    }
    
    // The confirmation endpoint has been moved to ConfirmationController
    
    // Request class for user registration
    public static class RegisterRequest {
        private String username;
        private String password;
        private String email;
        
        // Default constructor for JSON deserialization
        public RegisterRequest() {
        }
        
        public String getUsername() {
            return username;
        }
        
        public void setUsername(String username) {
            this.username = username;
        }
        
        public String getPassword() {
            return password;
        }
        
        public void setPassword(String password) {
            this.password = password;
        }
        
        public String getEmail() {
            return email;
        }
        
        public void setEmail(String email) {
            this.email = email;
        }
    }
}
