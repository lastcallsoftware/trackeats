package com.lastcallsw.trackeats;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;

import com.lastcallsw.trackeats.entities.User;
import com.lastcallsw.trackeats.repositories.UserRepository;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;


@Controller
@RequestMapping("/user")
public class MyController {
    @Autowired
    private UserRepository userRepository;

    @PostMapping("/add")
    public String addNewEntity(@RequestBody String entity) {
        //TODO: process POST request
        
        return "entity added";
    }
    
    @RequestMapping("/get")    
    public @ResponseBody Iterable<User> getAllEntities() {
        // This returns a JSON or XML with the users
        return userRepository.findAll();
    }
}
