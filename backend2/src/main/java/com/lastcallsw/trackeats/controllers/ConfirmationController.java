package com.lastcallsw.trackeats.controllers;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

import com.lastcallsw.trackeats.entities.Status;
import com.lastcallsw.trackeats.entities.User;
import com.lastcallsw.trackeats.repositories.UserRepository;

import java.time.LocalDateTime;
import java.util.Optional;

@Controller
public class ConfirmationController {

    @Autowired
    private UserRepository userRepository;

    /**
     * Handles the confirmation of a user's account by validating the token.
     * Returns an HTML page with the result of the confirmation.
     * 
     * @param token The confirmation token from the email link
     * @param model The Spring MVC model for passing data to the view
     * @return The name of the Thymeleaf template to render
     */
    @GetMapping("/confirm")
    public String confirmRegistration(@RequestParam String token, Model model) {
        Optional<User> userOpt = userRepository.findByConfirmationToken(token);
        
        if (userOpt.isEmpty()) {
            model.addAttribute("errorMessage", "Invalid or expired confirmation token");
            return "confirmation-error";
        }
        
        User user = userOpt.get();
        
        // Check if the token is expired (24 hours)
        if (user.getConfirmationSentAt().plusHours(24).isBefore(LocalDateTime.now())) {
            model.addAttribute("errorMessage", "Confirmation token has expired");
            return "confirmation-error";
        }
        
        // Update user status to confirmed
        user.setStatus(Status.confirmed);
        user.setConfirmationToken(null); // Clear the token after use
        userRepository.save(user);
        
        model.addAttribute("username", user.getUsername());
        return "confirmation-success";
    }
}
