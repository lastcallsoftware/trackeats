package com.lastcallsw.trackeats.controllers;

import com.lastcallsw.trackeats.repositories.FoodRepository;
import com.lastcallsw.trackeats.repositories.IngredientRepository;
import com.lastcallsw.trackeats.repositories.RecipeRepository;
import com.lastcallsw.trackeats.services.DataLoadService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;

import static org.junit.jupiter.api.Assertions.assertEquals;

@SpringBootTest
@ActiveProfiles("test")
@ExtendWith(MockitoExtension.class)
@WithMockUser(username = "testuser", roles = {"USER", "ADMIN"})
public class DbTruncationTest {

    @Autowired
    private DataLoadService dataLoadService;

    @Autowired
    private FoodRepository foodRepository;

    @Autowired
    private IngredientRepository ingredientRepository;

    @Autowired
    private RecipeRepository recipeRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private final String TEST_FOODS_FILE = "src/test/resources/test-foods.json";
    private final String TEST_INGREDIENTS_FILE = "src/test/resources/test-ingredients.json";
    private final String TEST_RECIPES_FILE = "src/test/resources/test-recipes.json";

    @BeforeEach
    public void setup() {
        // Clear all repositories before each test
        ingredientRepository.deleteAll();
        foodRepository.deleteAll();
        recipeRepository.deleteAll();
    }

    @Test
    @Transactional
    public void testFoodTableTruncation() throws IOException {
        // Load foods first time
        dataLoadService.loadFoodsFromJson(TEST_FOODS_FILE);
        long firstCount = foodRepository.count();
        
        // Manually insert a food to simulate data that might be added outside the load process
        jdbcTemplate.execute("INSERT INTO foods (name, food_group, subtype, description) VALUES ('Manual Test Food', 'test', 'test', 'test')");
        long countAfterManualInsert = foodRepository.count();
        assertEquals(firstCount + 1, countAfterManualInsert, "Manual insert should add one record");
        
        // Load foods again - should truncate first
        dataLoadService.loadFoodsFromJson(TEST_FOODS_FILE);
        long secondCount = foodRepository.count();
        
        // Count should be back to the original count if truncation worked
        assertEquals(firstCount, secondCount, "Table should be truncated before loading");
    }

    @Test
    @Transactional
    public void testRecipeTableTruncation() throws IOException {
        // Load recipes first time
        dataLoadService.loadRecipesFromJson(TEST_RECIPES_FILE);
        long firstCount = recipeRepository.count();
        
        // Manually insert a recipe to simulate data that might be added outside the load process
        jdbcTemplate.execute("INSERT INTO recipes (name, cuisine, total_yield, servings) VALUES ('Manual Test Recipe', 'test', 'test', 1.0)");
        long countAfterManualInsert = recipeRepository.count();
        assertEquals(firstCount + 1, countAfterManualInsert, "Manual insert should add one record");
        
        // Load recipes again - should truncate first
        dataLoadService.loadRecipesFromJson(TEST_RECIPES_FILE);
        long secondCount = recipeRepository.count();
        
        // Count should be back to the original count if truncation worked
        assertEquals(firstCount, secondCount, "Table should be truncated before loading");
    }

    @Test
    @Transactional
    public void testIngredientTableTruncation() throws IOException {
        // First load foods and recipes that ingredients will reference
        dataLoadService.loadFoodsFromJson(TEST_FOODS_FILE);
        dataLoadService.loadRecipesFromJson(TEST_RECIPES_FILE);
        
        // Load ingredients first time
        dataLoadService.loadIngredientsFromJson(TEST_INGREDIENTS_FILE);
        long firstCount = ingredientRepository.count();
        
        // Manually insert an ingredient to simulate data that might be added outside the load process
        jdbcTemplate.execute("INSERT INTO ingredients (recipe_id, ordinal, servings, summary) VALUES (1, 99, 1.0, 'Manual Test Ingredient')");
        long countAfterManualInsert = ingredientRepository.count();
        assertEquals(firstCount + 1, countAfterManualInsert, "Manual insert should add one record");
        
        // Load ingredients again - should truncate first
        dataLoadService.loadIngredientsFromJson(TEST_INGREDIENTS_FILE);
        long secondCount = ingredientRepository.count();
        
        // Count should be back to the original count if truncation worked
        assertEquals(firstCount, secondCount, "Table should be truncated before loading");
    }

    @Test
    @Transactional
    public void testForeignKeyConstraintHandling() throws IOException {
        // Load foods, recipes, and ingredients
        dataLoadService.loadFoodsFromJson(TEST_FOODS_FILE);
        dataLoadService.loadRecipesFromJson(TEST_RECIPES_FILE);
        dataLoadService.loadIngredientsFromJson(TEST_INGREDIENTS_FILE);
        
        // Verify initial counts
        long initialFoodCount = foodRepository.count();
        long initialRecipeCount = recipeRepository.count();
        long initialIngredientCount = ingredientRepository.count();
        
        // Now reload foods - this should work even though ingredients reference foods
        // because the DataLoadService should handle foreign key constraints
        dataLoadService.loadFoodsFromJson(TEST_FOODS_FILE);
        
        // Verify counts after reload
        assertEquals(initialFoodCount, foodRepository.count(), "Food count should be the same after reload");
        
        // Now reload recipes - this should work even though ingredients reference recipes
        dataLoadService.loadRecipesFromJson(TEST_RECIPES_FILE);
        
        // Verify counts after reload
        assertEquals(initialRecipeCount, recipeRepository.count(), "Recipe count should be the same after reload");
        
        // Finally reload ingredients
        dataLoadService.loadIngredientsFromJson(TEST_INGREDIENTS_FILE);
        
        // Verify counts after reload
        assertEquals(initialIngredientCount, ingredientRepository.count(), "Ingredient count should be the same after reload");
    }
}
