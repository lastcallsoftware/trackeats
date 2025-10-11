package com.lastcallsw.trackeats.repositories;

import org.springframework.data.repository.CrudRepository;
import java.util.Optional;

import com.lastcallsw.trackeats.entities.User;

public interface UserRepository extends CrudRepository<User, Integer> {
    // Find a user by username for authentication
    Optional<User> findByUsername(String username);
    
    // Find a user by confirmation token
    Optional<User> findByConfirmationToken(String confirmationToken);
}
