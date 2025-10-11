package com.lastcallsw.trackeats.services;

import com.lastcallsw.trackeats.repositories.FoodRepository;
import com.lastcallsw.trackeats.repositories.IngredientRepository;
import com.lastcallsw.trackeats.repositories.NutritionRepository;
import com.lastcallsw.trackeats.repositories.RecipeRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
public class DataLoadServiceTest {

    @Autowired
    private DataLoadService dataLoadService;

    @Autowired
    private FoodRepository foodRepository;

    @Autowired
    private IngredientRepository ingredientRepository;

    @Autowired
    private RecipeRepository recipeRepository;

    @Autowired
    private NutritionRepository nutritionRepository;

    private final String TEST_FOODS_FILE = "src/test/resources/test-foods.json";
    private final String TEST_INGREDIENTS_FILE = "src/test/resources/test-ingredients.json";
    private final String TEST_RECIPES_FILE = "src/test/resources/test-recipes.json";
    private final String EXPORT_FOODS_FILE = "src/test/resources/export-foods.json";
    private final String EXPORT_INGREDIENTS_FILE = "src/test/resources/export-ingredients.json";
    private final String EXPORT_RECIPES_FILE = "src/test/resources/export-recipes.json";

    @BeforeEach
    public void setup() {
        // Clear all repositories before each test
        ingredientRepository.deleteAll();
        foodRepository.deleteAll();
        recipeRepository.deleteAll();
        nutritionRepository.deleteAll();
        
        // Delete any existing export files
        deleteFileIfExists(EXPORT_FOODS_FILE);
        deleteFileIfExists(EXPORT_INGREDIENTS_FILE);
        deleteFileIfExists(EXPORT_RECIPES_FILE);
    }
    
    private void deleteFileIfExists(String filePath) {
        try {
            Files.deleteIfExists(Paths.get(filePath));
        } catch (IOException e) {
            // Ignore exceptions
        }
    }

    @Test
    public void testLoadFoodsFromJson() throws IOException {
        // Test loading foods
        Map<String, Object> result = dataLoadService.loadFoodsFromJson(TEST_FOODS_FILE);
        
        // Verify the result
        assertNotNull(result);
        assertTrue(result.containsKey("successCount"));
        assertTrue(result.containsKey("totalProcessed"));
        assertEquals(2, result.get("successCount"));
        assertEquals(2, result.get("totalProcessed"));
        
        // Verify foods were loaded into the database
        assertEquals(2, foodRepository.count());
        
        // Verify nutrition was loaded
        assertEquals(2, nutritionRepository.count());
    }

    @Test
    public void testLoadRecipesFromJson() throws IOException {
        // Test loading recipes
        Map<String, Object> result = dataLoadService.loadRecipesFromJson(TEST_RECIPES_FILE);
        
        // Verify the result
        assertNotNull(result);
        assertTrue(result.containsKey("successCount"));
        assertTrue(result.containsKey("totalProcessed"));
        assertEquals(2, result.get("successCount"));
        assertEquals(2, result.get("totalProcessed"));
        
        // Verify recipes were loaded into the database
        assertEquals(2, recipeRepository.count());
        
        // Verify nutrition was loaded
        assertEquals(2, nutritionRepository.count());
    }

    @Test
    public void testLoadIngredientsFromJson() throws IOException {
        // First load foods and recipes
        dataLoadService.loadFoodsFromJson(TEST_FOODS_FILE);
        dataLoadService.loadRecipesFromJson(TEST_RECIPES_FILE);
        
        // Test loading ingredients
        Map<String, Object> result = dataLoadService.loadIngredientsFromJson(TEST_INGREDIENTS_FILE);
        
        // Verify the result
        assertNotNull(result);
        assertTrue(result.containsKey("successCount"));
        assertTrue(result.containsKey("totalProcessed"));
        assertEquals(6, result.get("successCount"));
        assertEquals(6, result.get("totalProcessed"));
        
        // Verify ingredients were loaded into the database
        assertEquals(6, ingredientRepository.count());
    }

    @Test
    public void testExportFoodsToJson() throws IOException {
        // First load foods
        dataLoadService.loadFoodsFromJson(TEST_FOODS_FILE);
        
        // Test exporting foods
        Map<String, Object> result = dataLoadService.exportFoodsToJson(EXPORT_FOODS_FILE);
        
        // Verify the result
        assertNotNull(result);
        assertTrue(result.containsKey("totalExported"));
        assertEquals(2, result.get("totalExported"));
        
        // Verify the export file was created
        File exportFile = new File(EXPORT_FOODS_FILE);
        assertTrue(exportFile.exists());
        assertTrue(exportFile.length() > 0);
    }

    @Test
    public void testExportRecipesToJson() throws IOException {
        // First load recipes
        dataLoadService.loadRecipesFromJson(TEST_RECIPES_FILE);
        
        // Test exporting recipes
        Map<String, Object> result = dataLoadService.exportRecipesToJson(EXPORT_RECIPES_FILE);
        
        // Verify the result
        assertNotNull(result);
        assertTrue(result.containsKey("totalExported"));
        assertEquals(2, result.get("totalExported"));
        
        // Verify the export file was created
        File exportFile = new File(EXPORT_RECIPES_FILE);
        assertTrue(exportFile.exists());
        assertTrue(exportFile.length() > 0);
    }

    @Test
    public void testExportIngredientsToJson() throws IOException {
        // First load foods, recipes, and ingredients
        dataLoadService.loadFoodsFromJson(TEST_FOODS_FILE);
        dataLoadService.loadRecipesFromJson(TEST_RECIPES_FILE);
        dataLoadService.loadIngredientsFromJson(TEST_INGREDIENTS_FILE);
        
        // Test exporting ingredients
        Map<String, Object> result = dataLoadService.exportIngredientsToJson(EXPORT_INGREDIENTS_FILE);
        
        // Verify the result
        assertNotNull(result);
        assertTrue(result.containsKey("totalExported"));
        assertEquals(6, result.get("totalExported"));
        
        // Verify the export file was created
        File exportFile = new File(EXPORT_INGREDIENTS_FILE);
        assertTrue(exportFile.exists());
        assertTrue(exportFile.length() > 0);
    }

    @Test
    public void testTruncateBeforeLoad() throws IOException {
        // Load foods twice to verify truncation
        dataLoadService.loadFoodsFromJson(TEST_FOODS_FILE);
        long firstCount = foodRepository.count();
        
        dataLoadService.loadFoodsFromJson(TEST_FOODS_FILE);
        long secondCount = foodRepository.count();
        
        // Counts should be the same if truncation worked
        assertEquals(firstCount, secondCount);
    }
}
