package com.lastcallsw.trackeats.entities;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.Data;

@Data
@Entity
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE)
    private Integer id;

    @Column(name = "username", length = 100, nullable = false)
    private String username;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", columnDefinition = "ENUM('pending', 'confirmed', 'cancelled', 'banned')", nullable = false)
    private Status status;

    // Email is a blob because it's encrypted
    @Column(name = "email", columnDefinition = "BLOB", nullable = true)
    private byte[] email;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "password_hash", columnDefinition = "VARCHAR(64)", nullable = false)
    private String passwordHash;

    @Column(name = "confirmation_sent_at", nullable = true)
    private LocalDateTime confirmationSentAt;

    @Column(name = "confirmation_token", columnDefinition = "VARCHAR(64)", nullable = true)
    private String confirmationToken;

}
