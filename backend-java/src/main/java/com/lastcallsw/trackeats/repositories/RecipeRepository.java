package com.lastcallsw.trackeats.repositories;

import com.lastcallsw.trackeats.entities.Recipe;
import org.springframework.data.repository.CrudRepository;

public interface RecipeRepository extends CrudRepository<Recipe, Integer> {
    // Basic CRUD methods are inherited from CrudRepository
    // Additional custom query methods can be added here if needed
}
