package com.lastcallsw.trackeats.controllers;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lastcallsw.trackeats.entities.Ingredient;
import com.lastcallsw.trackeats.entities.Recipe;
import com.lastcallsw.trackeats.entities.Food;
import com.lastcallsw.trackeats.entities.FoodGroup;
import com.lastcallsw.trackeats.repositories.IngredientRepository;
import com.lastcallsw.trackeats.repositories.RecipeRepository;
import com.lastcallsw.trackeats.repositories.FoodRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.ArrayList;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@WithMockUser(username = "testuser", roles = {"USER", "ADMIN"})
@ExtendWith(MockitoExtension.class)
public class IngredientControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private IngredientRepository ingredientRepository;

    @Autowired
    private RecipeRepository recipeRepository;

    @Autowired
    private FoodRepository foodRepository;

    @Autowired
    private ObjectMapper objectMapper;

    private Ingredient testIngredient;
    private Recipe testRecipe;
    private Food testFood;

    @BeforeEach
    public void setup() {
        // Clear all ingredients before each test
        ingredientRepository.deleteAll();
        recipeRepository.deleteAll();
        foodRepository.deleteAll();
        
        // Create test recipe
        testRecipe = new Recipe();
        testRecipe.setName("Test Recipe");
        testRecipe.setCuisine("Test Cuisine");
        testRecipe.setTotalYield("1 serving");
        testRecipe.setServings(1.0f);
        testRecipe.setIngredients(new ArrayList<>());
        testRecipe = recipeRepository.save(testRecipe);
        
        // Create test food
        testFood = new Food();
        testFood.setName("Test Food");
        testFood.setGroup(FoodGroup.fruits);
        testFood.setVendor("Test Vendor");
        testFood.setServings(1.0f);
        testFood = foodRepository.save(testFood);
        
        // Create test ingredient
        testIngredient = new Ingredient();
        testIngredient.setRecipe(testRecipe);
        testIngredient.setFoodIngredient(testFood);
        testIngredient.setOrdinal(1);
        testIngredient.setServings(2.0f);
        testIngredient.setSummary("2 units of test food");
    }

    @Test
    public void testGetAllIngredients() throws Exception {
        // Save a test ingredient to the repository
        Ingredient savedIngredient = ingredientRepository.save(testIngredient);
        
        // Test getting all ingredients
        mockMvc.perform(get("/api/ingredients")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(savedIngredient.getId()))
                .andExpect(jsonPath("$[0].ordinal").value(1))
                .andExpect(jsonPath("$[0].servings").value(2.0))
                .andExpect(jsonPath("$[0].summary").value("2 units of test food"));
    }

    @Test
    public void testGetIngredientById() throws Exception {
        // Save a test ingredient to the repository
        Ingredient savedIngredient = ingredientRepository.save(testIngredient);
        
        // Test getting ingredient by ID
        mockMvc.perform(get("/api/ingredients/" + savedIngredient.getId())
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(savedIngredient.getId()))
                .andExpect(jsonPath("$.ordinal").value(1))
                .andExpect(jsonPath("$.servings").value(2.0))
                .andExpect(jsonPath("$.summary").value("2 units of test food"));
    }

    @Test
    public void testGetIngredientByIdNotFound() throws Exception {
        // Test getting non-existent ingredient
        mockMvc.perform(get("/api/ingredients/999")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound());
    }

    @Test
    public void testAddIngredient() throws Exception {
        // Convert ingredient object to JSON
        String ingredientJson = objectMapper.writeValueAsString(testIngredient);
        
        // Test adding a new ingredient
        MvcResult result = mockMvc.perform(post("/api/ingredients")
                .contentType(MediaType.APPLICATION_JSON)
                .content(ingredientJson))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.ordinal").value(1))
                .andExpect(jsonPath("$.servings").value(2.0))
                .andExpect(jsonPath("$.summary").value("2 units of test food"))
                .andReturn();
        
        // Verify ingredient was added to the database
        String responseJson = result.getResponse().getContentAsString();
        Ingredient createdIngredient = objectMapper.readValue(responseJson, Ingredient.class);
        
        Optional<Ingredient> storedIngredient = ingredientRepository.findById(createdIngredient.getId());
        assertTrue(storedIngredient.isPresent());
        assertEquals(1, storedIngredient.get().getOrdinal());
        assertEquals(2.0f, storedIngredient.get().getServings());
        assertEquals("2 units of test food", storedIngredient.get().getSummary());
    }

    @Test
    public void testUpdateIngredient() throws Exception {
        // Save a test ingredient to the repository
        Ingredient savedIngredient = ingredientRepository.save(testIngredient);
        
        // Modify the ingredient
        savedIngredient.setOrdinal(2);
        savedIngredient.setServings(3.0f);
        savedIngredient.setSummary("3 units of test food");
        
        // Convert updated ingredient to JSON
        String updatedIngredientJson = objectMapper.writeValueAsString(savedIngredient);
        
        // Test updating the ingredient
        mockMvc.perform(put("/api/ingredients/" + savedIngredient.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .content(updatedIngredientJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(savedIngredient.getId()))
                .andExpect(jsonPath("$.ordinal").value(2))
                .andExpect(jsonPath("$.servings").value(3.0))
                .andExpect(jsonPath("$.summary").value("3 units of test food"));
        
        // Verify ingredient was updated in the database
        Optional<Ingredient> storedIngredient = ingredientRepository.findById(savedIngredient.getId());
        assertTrue(storedIngredient.isPresent());
        assertEquals(2, storedIngredient.get().getOrdinal());
        assertEquals(3.0f, storedIngredient.get().getServings());
        assertEquals("3 units of test food", storedIngredient.get().getSummary());
    }

    @Test
    public void testUpdateIngredientNotFound() throws Exception {
        // Convert ingredient object to JSON
        String ingredientJson = objectMapper.writeValueAsString(testIngredient);
        
        // Test updating non-existent ingredient
        mockMvc.perform(put("/api/ingredients/999")
                .contentType(MediaType.APPLICATION_JSON)
                .content(ingredientJson))
                .andExpect(status().isNotFound());
    }

    @Test
    public void testDeleteIngredient() throws Exception {
        // Save a test ingredient to the repository
        Ingredient savedIngredient = ingredientRepository.save(testIngredient);
        
        // Test deleting the ingredient
        mockMvc.perform(delete("/api/ingredients/" + savedIngredient.getId())
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNoContent());
        
        // Verify ingredient was deleted from the database
        Optional<Ingredient> storedIngredient = ingredientRepository.findById(savedIngredient.getId());
        assertFalse(storedIngredient.isPresent());
    }

    @Test
    public void testDeleteIngredientNotFound() throws Exception {
        // Test deleting non-existent ingredient
        mockMvc.perform(delete("/api/ingredients/999")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound());
    }
}
