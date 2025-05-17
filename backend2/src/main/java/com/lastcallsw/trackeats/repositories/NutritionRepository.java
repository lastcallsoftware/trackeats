package com.lastcallsw.trackeats.repositories;

import org.springframework.data.repository.CrudRepository;
import com.lastcallsw.trackeats.entities.Nutrition;

public interface NutritionRepository extends CrudRepository<Nutrition, Integer> {
    // This class is intentionally left empty. It extends CrudRepository to provide CRUD operations for Nutrition.
    // You can add custom query methods here if needed.
    
}
