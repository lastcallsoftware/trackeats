package com.lastcallsw.trackeats.security;

import com.lastcallsw.trackeats.entities.User;
import com.lastcallsw.trackeats.entities.Status;
import com.lastcallsw.trackeats.repositories.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.Collections;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    @Autowired
    private UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with username: " + username));

        // Only allow confirmed users to authenticate
        if (user.getStatus() != Status.confirmed) {
            throw new UsernameNotFoundException("User account is not confirmed: " + username);
        }

        // Create Spring Security UserDetails from our User entity
        return new org.springframework.security.core.userdetails.User(
                user.getUsername(),
                user.getPasswordHash(),
                Collections.singletonList(new SimpleGrantedAuthority("USER"))
        );
    }
}
