package com.lastcallsw.trackeats.controllers;

import com.lastcallsw.trackeats.entities.Ingredient;
import com.lastcallsw.trackeats.repositories.IngredientRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@RestController
@RequestMapping("/api/ingredients")
public class IngredientController {

    @Autowired
    private IngredientRepository ingredientRepository;

    // Get all ingredients
    @GetMapping
    public @ResponseBody Iterable<Ingredient> getAllIngredients() {
        return ingredientRepository.findAll();
    }

    // Get a single ingredient by ID
    @GetMapping("/{id}")
    public ResponseEntity<Ingredient> getIngredientById(@PathVariable Integer id) {
        Optional<Ingredient> ingredient = ingredientRepository.findById(id);
        return ingredient.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    // Add a new ingredient
    @PostMapping
    public ResponseEntity<Ingredient> addIngredient(@RequestBody Ingredient ingredient) {
        Ingredient savedIngredient = ingredientRepository.save(ingredient);
        return ResponseEntity.status(HttpStatus.CREATED).body(savedIngredient);
    }

    // Update an existing ingredient
    @PutMapping("/{id}")
    public ResponseEntity<Ingredient> updateIngredient(@PathVariable Integer id, @RequestBody Ingredient ingredientDetails) {
        Optional<Ingredient> optionalIngredient = ingredientRepository.findById(id);
        if (optionalIngredient.isPresent()) {
            Ingredient existingIngredient = optionalIngredient.get();
            // Update fields - assuming ingredientDetails contains all fields
            // For partial updates, a PATCH mapping and more specific logic would be better
            existingIngredient.setRecipe(ingredientDetails.getRecipe());
            existingIngredient.setFoodIngredient(ingredientDetails.getFoodIngredient());
            existingIngredient.setRecipeIngredient(ingredientDetails.getRecipeIngredient());
            existingIngredient.setOrdinal(ingredientDetails.getOrdinal());
            existingIngredient.setServings(ingredientDetails.getServings());
            existingIngredient.setSummary(ingredientDetails.getSummary());
            Ingredient updatedIngredient = ingredientRepository.save(existingIngredient);
            return ResponseEntity.ok(updatedIngredient);
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    // Delete an ingredient
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteIngredient(@PathVariable Integer id) {
        if (ingredientRepository.existsById(id)) {
            ingredientRepository.deleteById(id);
            return ResponseEntity.noContent().build();
        } else {
            return ResponseEntity.notFound().build();
        }
    }
}
