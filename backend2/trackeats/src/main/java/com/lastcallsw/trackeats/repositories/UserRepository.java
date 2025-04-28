package com.lastcallsw.trackeats.repositories;

import org.springframework.data.repository.CrudRepository;
//import com.lastcallsw.trackeats.MyEntity;

import com.lastcallsw.trackeats.entities.User;

public interface UserRepository extends CrudRepository<User, Long> {
    // This class is intentionally left empty. It extends CrudRepository to provide CRUD operations for User.
    // You can add custom query methods here if needed.
  
}
