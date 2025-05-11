package com.lastcallsw.trackeats.repositories;

import com.lastcallsw.trackeats.entities.Food;
import org.springframework.data.repository.CrudRepository;

public interface FoodRepository extends CrudRepository<Food, Integer> {
    // Basic CRUD methods are inherited from CrudRepository
    // Additional custom query methods can be added here if needed
}
