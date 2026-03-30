package com.valoreon.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.valoreon.dto.user.UpdateUserDTO;
import com.valoreon.dto.user.UserCreateDTO;
import com.valoreon.dto.user.UserResponseDTO;
import com.valoreon.service.UserService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/user")
public class UserController {

	private final UserService userService;

	public UserController(UserService userService) {
		this.userService = userService;
	}

	@GetMapping("/me")
	public ResponseEntity<UserResponseDTO> getCurrentUser() {
		return ResponseEntity.ok(userService.getCurrentUserProfile());
	}

	@PostMapping
	public ResponseEntity<UserResponseDTO> register(@Valid @RequestBody UserCreateDTO dto) {
		return ResponseEntity.status(HttpStatus.CREATED).body(userService.saveUser(dto));
	}

	@PutMapping("/me")
	public ResponseEntity<UserResponseDTO> updateCurrentUser(@Valid @RequestBody UpdateUserDTO dto) {
		return ResponseEntity.ok(userService.updateCurrentUser(dto));
	}

	@DeleteMapping("/me")
	public ResponseEntity<UserResponseDTO> disableCurrentUser() {
		return ResponseEntity.ok(userService.disableCurrentUser());
	}
}
