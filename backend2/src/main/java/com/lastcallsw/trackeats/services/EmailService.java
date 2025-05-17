package com.lastcallsw.trackeats.services;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;

@Service
public class EmailService {

    @Autowired
    private JavaMailSender mailSender;
    
    @Value("${spring.mail.username}")
    private String fromEmail;
    
    @Value("${app.url}")
    private String appUrl;
    
    /**
     * Sends an email with the given subject and content to the specified recipient.
     * 
     * @param to The recipient's email address
     * @param subject The email subject
     * @param content The email content (HTML is supported)
     * @throws MessagingException If there's an error sending the email
     */
    public void sendEmail(String to, String subject, String content) throws MessagingException {
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
        
        helper.setFrom(fromEmail);
        helper.setTo(to);
        helper.setSubject(subject);
        helper.setText(content, true); // true indicates HTML content
        
        mailSender.send(message);
    }
    
    /**
     * Sends a registration confirmation email with a link to confirm the account.
     * 
     * @param to The recipient's email address
     * @param username The user's username
     * @param token The confirmation token
     * @throws MessagingException If there's an error sending the email
     */
    public void sendRegistrationConfirmationEmail(String to, String username, String token) throws MessagingException {
        String confirmationLink = appUrl + "/confirm?token=" + token;
        
        String subject = "TrackEats - Confirm Your Registration";
        
        String content = """
            <html>
            <body>
                <h2>Welcome to TrackEats, %s!</h2>
                <p>Thank you for registering. Please click the link below to confirm your account:</p>
                <p><a href="%s">Confirm Your Account</a></p>
                <p>If you did not register for TrackEats, please ignore this email.</p>
                <p>This link will expire in 24 hours.</p>
                <p>Best regards,<br/>The TrackEats Team</p>
            </body>
            </html>
        """.formatted(username, confirmationLink);
        
        sendEmail(to, subject, content);
    }
}
