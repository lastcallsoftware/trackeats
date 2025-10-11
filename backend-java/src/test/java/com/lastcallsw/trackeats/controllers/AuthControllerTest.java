package com.lastcallsw.trackeats.controllers;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lastcallsw.trackeats.controllers.AuthController.AuthenticationRequest;
import com.lastcallsw.trackeats.security.CustomUserDetailsService;
import com.lastcallsw.trackeats.security.JwtUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.mockito.Mock;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.ArrayList;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@ExtendWith(MockitoExtension.class)
@WithMockUser(username = "testuser", roles = {"USER", "ADMIN"})
public class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Mock
    private AuthenticationManager authenticationManager;

    @Mock
    private CustomUserDetailsService userDetailsService;

    @Mock
    private JwtUtil jwtUtil;

    private AuthenticationRequest validRequest;
    private UserDetails userDetails;

    @BeforeEach
    public void setup() {
        // Create valid authentication request
        validRequest = new AuthenticationRequest("testuser", "password123");
        
        // Create user details
        userDetails = new User("testuser", "password123", new ArrayList<>());
        
        // Mock authentication manager
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenReturn(new UsernamePasswordAuthenticationToken(userDetails, null, new ArrayList<>()));
        
        // Mock user details service
        when(userDetailsService.loadUserByUsername("testuser")).thenReturn(userDetails);
        
        // Mock JWT util
        when(jwtUtil.generateToken(any(UserDetails.class))).thenReturn("test-jwt-token");
    }

    @Test
    public void testSuccessfulAuthentication() throws Exception {
        // Convert request to JSON
        String requestJson = objectMapper.writeValueAsString(validRequest);
        
        // Test successful authentication
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.jwt").value("test-jwt-token"));
    }

    @Test
    public void testFailedAuthentication() throws Exception {
        // Create invalid authentication request
        AuthenticationRequest invalidRequest = new AuthenticationRequest("testuser", "wrongpassword");
        
        // Convert request to JSON
        String requestJson = objectMapper.writeValueAsString(invalidRequest);
        
        // Mock authentication failure
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenThrow(new BadCredentialsException("Bad credentials"));
        
        // Test failed authentication
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestJson))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$").value("Incorrect username or password"));
    }

    @Test
    public void testMissingCredentials() throws Exception {
        // Create request with missing credentials
        AuthenticationRequest incompleteRequest = new AuthenticationRequest();
        incompleteRequest.setUsername("testuser");
        // Password is missing
        
        // Convert request to JSON
        String requestJson = objectMapper.writeValueAsString(incompleteRequest);
        
        // Test authentication with missing credentials
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestJson))
                .andExpect(status().isBadRequest());
    }
}
