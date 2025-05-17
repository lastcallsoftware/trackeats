package com.lastcallsw.trackeats.controllers;

import com.lastcallsw.trackeats.entities.User;
import com.lastcallsw.trackeats.entities.Status;
import com.lastcallsw.trackeats.repositories.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@ExtendWith(MockitoExtension.class)
@WithMockUser(username = "testuser", roles = {"USER", "ADMIN"})
public class ConfirmationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    private User testUser;
    private String validToken;

    @BeforeEach
    public void setup() {
        // Clear all users before each test
        userRepository.deleteAll();
        
        // Create valid token
        validToken = "valid-confirmation-token";
        
        // Create test user with pending status and confirmation token
        testUser = new User();
        testUser.setUsername("testuser");
        testUser.setStatus(Status.pending);
        testUser.setCreatedAt(LocalDateTime.now());
        testUser.setPasswordHash("hashedpassword");
        testUser.setConfirmationToken(validToken);
        testUser.setConfirmationSentAt(LocalDateTime.now());
        
        // Save test user
        userRepository.save(testUser);
    }

    @Test
    public void testSuccessfulConfirmation() throws Exception {
        // Test successful confirmation
        mockMvc.perform(get("/confirm")
                .param("token", validToken))
                .andExpect(status().isOk())
                .andExpect(view().name("confirmation-success"))
                .andExpect(model().attribute("username", "testuser"));
        
        // Verify user status was updated
        Optional<User> updatedUser = userRepository.findByUsername("testuser");
        assertTrue(updatedUser.isPresent());
        assertEquals(Status.confirmed, updatedUser.get().getStatus());
        assertNull(updatedUser.get().getConfirmationToken());
    }

    @Test
    public void testInvalidToken() throws Exception {
        // Test invalid token
        mockMvc.perform(get("/confirm")
                .param("token", "invalid-token"))
                .andExpect(status().isOk())
                .andExpect(view().name("confirmation-error"))
                .andExpect(model().attribute("errorMessage", "Invalid or expired confirmation token"));
        
        // Verify user status was not updated
        Optional<User> updatedUser = userRepository.findByUsername("testuser");
        assertTrue(updatedUser.isPresent());
        assertEquals(Status.pending, updatedUser.get().getStatus());
        assertEquals(validToken, updatedUser.get().getConfirmationToken());
    }

    @Test
    public void testExpiredToken() throws Exception {
        // Update user with expired confirmation sent time (25 hours ago)
        testUser.setConfirmationSentAt(LocalDateTime.now().minusHours(25));
        userRepository.save(testUser);
        
        // Test expired token
        mockMvc.perform(get("/confirm")
                .param("token", validToken))
                .andExpect(status().isOk())
                .andExpect(view().name("confirmation-error"))
                .andExpect(model().attribute("errorMessage", "Confirmation token has expired"));
        
        // Verify user status was not updated
        Optional<User> updatedUser = userRepository.findByUsername("testuser");
        assertTrue(updatedUser.isPresent());
        assertEquals(Status.pending, updatedUser.get().getStatus());
        assertEquals(validToken, updatedUser.get().getConfirmationToken());
    }

    @Test
    public void testMissingToken() throws Exception {
        // Test missing token
        mockMvc.perform(get("/confirm"))
                .andExpect(status().isBadRequest());
    }
}
