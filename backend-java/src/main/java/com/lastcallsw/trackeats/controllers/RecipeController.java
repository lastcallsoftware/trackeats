package com.lastcallsw.trackeats.controllers;

import com.lastcallsw.trackeats.entities.Recipe;
import com.lastcallsw.trackeats.repositories.RecipeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@RestController
@RequestMapping("/api/recipes")
public class RecipeController {

    @Autowired
    private RecipeRepository recipeRepository;

    // Get all recipes
    @GetMapping
    public @ResponseBody Iterable<Recipe> getAllRecipes() {
        return recipeRepository.findAll();
    }

    // Get a single recipe by ID
    @GetMapping("/{id}")
    public ResponseEntity<Recipe> getRecipeById(@PathVariable Integer id) {
        Optional<Recipe> recipe = recipeRepository.findById(id);
        return recipe.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    // Add a new recipe
    @PostMapping
    public ResponseEntity<Recipe> addRecipe(@RequestBody Recipe recipe) {
        Recipe savedRecipe = recipeRepository.save(recipe);
        return ResponseEntity.status(HttpStatus.CREATED).body(savedRecipe);
    }

    // Update an existing recipe
    @PutMapping("/{id}")
    public ResponseEntity<Recipe> updateRecipe(@PathVariable Integer id, @RequestBody Recipe recipeDetails) {
        Optional<Recipe> optionalRecipe = recipeRepository.findById(id);
        if (optionalRecipe.isPresent()) {
            Recipe existingRecipe = optionalRecipe.get();
            // Update fields
            existingRecipe.setUser(recipeDetails.getUser());
            existingRecipe.setCuisine(recipeDetails.getCuisine());
            existingRecipe.setName(recipeDetails.getName());
            existingRecipe.setTotalYield(recipeDetails.getTotalYield());
            existingRecipe.setServings(recipeDetails.getServings());
            existingRecipe.setNutrition(recipeDetails.getNutrition());
            existingRecipe.setPrice(recipeDetails.getPrice());
            existingRecipe.setIngredients(recipeDetails.getIngredients()); // Be cautious with collection updates
            Recipe updatedRecipe = recipeRepository.save(existingRecipe);
            return ResponseEntity.ok(updatedRecipe);
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    // Delete a recipe
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteRecipe(@PathVariable Integer id) {
        if (recipeRepository.existsById(id)) {
            recipeRepository.deleteById(id);
            return ResponseEntity.noContent().build();
        } else {
            return ResponseEntity.notFound().build();
        }
    }
}
