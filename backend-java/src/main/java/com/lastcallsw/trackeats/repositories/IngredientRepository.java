package com.lastcallsw.trackeats.repositories;

import com.lastcallsw.trackeats.entities.Ingredient;
import org.springframework.data.repository.CrudRepository;

public interface IngredientRepository extends CrudRepository<Ingredient, Integer> {
    // Basic CRUD methods are inherited from CrudRepository
    // Additional custom query methods can be added here if needed
}
