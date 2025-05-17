package com.lastcallsw.trackeats.controllers;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lastcallsw.trackeats.entities.Food;
import com.lastcallsw.trackeats.entities.FoodGroup;
import com.lastcallsw.trackeats.entities.Nutrition;
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
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityManager;
import java.time.LocalDate;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
@WithMockUser(username = "testuser", roles = {"USER", "ADMIN"})
@ExtendWith(MockitoExtension.class)
public class FoodControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private FoodRepository foodRepository;

    @Autowired
    private ObjectMapper objectMapper;
    
    @Autowired
    private EntityManager entityManager;

    private Food testFood;
    private Nutrition testNutrition;

    @BeforeEach
    public void setup() {
        // Clear all foods before each test
        foodRepository.deleteAll();
        
        // Create test nutrition
        testNutrition = new Nutrition();
        testNutrition.setServing_size_description("1 medium apple");
        testNutrition.setServing_size_oz(6.0f);
        testNutrition.setServing_size_g(170);
        testNutrition.setCalories(95);
        testNutrition.setTotal_fat_g(0.3f);
        testNutrition.setSaturated_fat_g(0.0f);
        testNutrition.setTrans_fat_g(0);
        testNutrition.setCholesterol_mg(0);
        testNutrition.setSodium_mg(2);
        testNutrition.setTotal_carbs_g(25);
        testNutrition.setFiber_g(4);
        testNutrition.setTotal_sugar_g(19);
        testNutrition.setAdded_sugar_g(0);
        testNutrition.setProtein_g(0);
        testNutrition.setVitamin_d_mcg(0);
        testNutrition.setCalcium_mg(10);
        testNutrition.setIron_mg(0.2f);
        testNutrition.setPotassium_mg(195);
        
        // Create test food
        testFood = new Food();
        testFood.setName("Test Apple");
        testFood.setGroup(FoodGroup.fruits);
        testFood.setSubtype("Fresh");
        testFood.setDescription("A test apple for unit testing");
        testFood.setVendor("Test Vendor");
        testFood.setSizeDescription("1 medium apple");
        testFood.setSizeOz(6.0f);
        testFood.setSizeG(170);
        testFood.setServings(1.0f);
        testFood.setNutrition(testNutrition);
        testFood.setPrice(0.75f);
        testFood.setPriceDate(LocalDate.of(2025, 5, 1));
        testFood.setShelfLife("7 days");
    }

    @Test
    public void testGetAllFoods() throws Exception {
        // Save the nutrition entity first
        entityManager.persist(testNutrition);
        
        // Save a test food to the repository
        Food savedFood = foodRepository.save(testFood);
        
        // Test getting all foods
        mockMvc.perform(get("/api/foods")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(savedFood.getId()))
                .andExpect(jsonPath("$[0].name").value("Test Apple"))
                .andExpect(jsonPath("$[0].group").value("fruits"))
                .andExpect(jsonPath("$[0].vendor").value("Test Vendor"));
    }

    @Test
    public void testGetFoodById() throws Exception {
        // Save the nutrition entity first
        entityManager.persist(testNutrition);
        
        // Save a test food to the repository
        Food savedFood = foodRepository.save(testFood);
        
        // Test getting food by ID
        mockMvc.perform(get("/api/foods/" + savedFood.getId())
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(savedFood.getId()))
                .andExpect(jsonPath("$.name").value("Test Apple"))
                .andExpect(jsonPath("$.group").value("fruits"))
                .andExpect(jsonPath("$.vendor").value("Test Vendor"));
    }

    @Test
    public void testGetFoodByIdNotFound() throws Exception {
        // Test getting non-existent food
        mockMvc.perform(get("/api/foods/999")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound());
    }

    @Test
    public void testAddFood() throws Exception {
        // Save the nutrition entity first
        entityManager.persist(testNutrition);
        
        // Convert food object to JSON
        String foodJson = objectMapper.writeValueAsString(testFood);
        
        // Test adding a new food
        MvcResult result = mockMvc.perform(post("/api/foods")
                .contentType(MediaType.APPLICATION_JSON)
                .content(foodJson))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Test Apple"))
                .andExpect(jsonPath("$.group").value("fruits"))
                .andExpect(jsonPath("$.vendor").value("Test Vendor"))
                .andReturn();
        
        // Verify food was added to the database
        String responseJson = result.getResponse().getContentAsString();
        Food createdFood = objectMapper.readValue(responseJson, Food.class);
        
        Optional<Food> storedFood = foodRepository.findById(createdFood.getId());
        assertTrue(storedFood.isPresent());
        assertEquals("Test Apple", storedFood.get().getName());
    }

    @Test
    public void testUpdateFood() throws Exception {
        // Save the nutrition entity first
        entityManager.persist(testNutrition);
        
        // Save a test food to the repository
        Food savedFood = foodRepository.save(testFood);
        
        // Modify the food
        savedFood.setName("Updated Apple");
        savedFood.setVendor("Updated Vendor");
        savedFood.setPrice(1.25f);
        
        // Convert updated food to JSON
        String updatedFoodJson = objectMapper.writeValueAsString(savedFood);
        
        // Test updating the food
        mockMvc.perform(put("/api/foods/" + savedFood.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .content(updatedFoodJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(savedFood.getId()))
                .andExpect(jsonPath("$.name").value("Updated Apple"))
                .andExpect(jsonPath("$.vendor").value("Updated Vendor"))
                .andExpect(jsonPath("$.price").value(1.25));
        
        // Verify food was updated in the database
        Optional<Food> storedFood = foodRepository.findById(savedFood.getId());
        assertTrue(storedFood.isPresent());
        assertEquals("Updated Apple", storedFood.get().getName());
        assertEquals("Updated Vendor", storedFood.get().getVendor());
        assertEquals(1.25f, storedFood.get().getPrice());
    }

    @Test
    public void testUpdateFoodNotFound() throws Exception {
        // Save the nutrition entity first
        entityManager.persist(testNutrition);
        
        // Convert food object to JSON
        String foodJson = objectMapper.writeValueAsString(testFood);
        
        // Test updating non-existent food
        mockMvc.perform(put("/api/foods/999")
                .contentType(MediaType.APPLICATION_JSON)
                .content(foodJson))
                .andExpect(status().isNotFound());
    }

    @Test
    public void testDeleteFood() throws Exception {
        // Save the nutrition entity first
        entityManager.persist(testNutrition);
        
        // Save a test food to the repository
        Food savedFood = foodRepository.save(testFood);
        
        // Test deleting the food
        mockMvc.perform(delete("/api/foods/" + savedFood.getId())
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNoContent());
        
        // Verify food was deleted from the database
        Optional<Food> storedFood = foodRepository.findById(savedFood.getId());
        assertFalse(storedFood.isPresent());
    }

    @Test
    public void testDeleteFoodNotFound() throws Exception {
        // Test deleting non-existent food
        mockMvc.perform(delete("/api/foods/999")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound());
    }
}
