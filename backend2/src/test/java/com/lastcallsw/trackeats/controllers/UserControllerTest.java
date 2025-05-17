package com.lastcallsw.trackeats.controllers;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lastcallsw.trackeats.entities.User;
import com.lastcallsw.trackeats.entities.Status;
import com.lastcallsw.trackeats.repositories.UserRepository;
import com.lastcallsw.trackeats.services.EmailService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doNothing;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@WithMockUser(username = "testuser", roles = {"USER", "ADMIN"})
@ExtendWith(MockitoExtension.class)
public class UserControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ObjectMapper objectMapper;

    @Mock
    private EmailService emailService;

    private User testUser;

    @BeforeEach
    public void setup() throws Exception {
        // Clear all users before each test
        userRepository.deleteAll();
        
        // Create test user
        testUser = new User();
        testUser.setUsername("testuser");
        testUser.setStatus(Status.confirmed);
        testUser.setCreatedAt(LocalDateTime.now());
        testUser.setPasswordHash("hashedpassword");
        
        // Mock email service to avoid sending actual emails
        doNothing().when(emailService).sendRegistrationConfirmationEmail(
            anyString(), anyString(), anyString());
    }

    @Test
    public void testGetAllUsers() throws Exception {
        // Save a test user to the repository
        User savedUser = userRepository.save(testUser);
        
        // Test getting all users
        mockMvc.perform(get("/api/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(savedUser.getId()))
                .andExpect(jsonPath("$[0].username").value("testuser"))
                .andExpect(jsonPath("$[0].status").value("confirmed"));
    }

    @Test
    public void testGetUserById() throws Exception {
        // Save a test user to the repository
        User savedUser = userRepository.save(testUser);
        
        // Test getting user by ID
        mockMvc.perform(get("/api/users/" + savedUser.getId())
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(savedUser.getId()))
                .andExpect(jsonPath("$.username").value("testuser"))
                .andExpect(jsonPath("$.status").value("confirmed"));
    }

    @Test
    public void testGetUserByIdNotFound() throws Exception {
        // Test getting non-existent user
        mockMvc.perform(get("/api/users/999")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound());
    }

    @Test
    public void testGetCurrentUser() throws Exception {
        // Save a test user to the repository
        userRepository.save(testUser);
        
        // Test getting current user
        mockMvc.perform(get("/api/users/me")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("testuser"));
    }

    @Test
    public void testRegisterUser() throws Exception {
        // Create registration request
        UserController.RegisterRequest registerRequest = new UserController.RegisterRequest();
        registerRequest.setUsername("newuser");
        registerRequest.setPassword("password123");
        registerRequest.setEmail("test@example.com");
        
        // Convert registration request to JSON
        String registerJson = objectMapper.writeValueAsString(registerRequest);
        
        // Test registering a new user
        MvcResult result = mockMvc.perform(post("/api/users/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(registerJson))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.username").value("newuser"))
                .andExpect(jsonPath("$.status").value("pending"))
                .andReturn();
        
        // Verify user was added to the database
        String responseJson = result.getResponse().getContentAsString();
        User createdUser = objectMapper.readValue(responseJson, User.class);
        
        Optional<User> storedUser = userRepository.findById(createdUser.getId());
        assertTrue(storedUser.isPresent());
        assertEquals("newuser", storedUser.get().getUsername());
        assertEquals(Status.pending, storedUser.get().getStatus());
        assertNotNull(storedUser.get().getConfirmationToken());
        
        // Verify email service was called
        Mockito.verify(emailService).sendRegistrationConfirmationEmail(
            anyString(), anyString(), anyString());
    }

    @Test
    public void testRegisterUserWithExistingUsername() throws Exception {
        // Save a test user to the repository
        userRepository.save(testUser);
        
        // Create registration request with same username
        UserController.RegisterRequest registerRequest = new UserController.RegisterRequest();
        registerRequest.setUsername("testuser"); // Same as existing user
        registerRequest.setPassword("password123");
        registerRequest.setEmail("test@example.com");
        
        // Convert registration request to JSON
        String registerJson = objectMapper.writeValueAsString(registerRequest);
        
        // Test registering a user with existing username
        mockMvc.perform(post("/api/users/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(registerJson))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("Username already exists"));
    }
}
