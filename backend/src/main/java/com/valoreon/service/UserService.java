package com.valoreon.service;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.valoreon.dto.user.UpdateUserDTO;
import com.valoreon.dto.user.UserCreateDTO;
import com.valoreon.dto.user.UserResponseDTO;
import com.valoreon.exception.ApiException;
import com.valoreon.model.User;
import com.valoreon.repository.UserRepository;

@Service
public class UserService {

	private final UserRepository userRepository;
	private final PasswordEncoder passwordEncoder;
	private final CurrentUserService currentUserService;

	public UserService(
			UserRepository userRepository,
			PasswordEncoder passwordEncoder,
			CurrentUserService currentUserService) {
		this.userRepository = userRepository;
		this.passwordEncoder = passwordEncoder;
		this.currentUserService = currentUserService;
	}

	@Transactional(readOnly = true)
	public UserResponseDTO getCurrentUserProfile() {
		return toResponseDTO(currentUserService.getCurrentUser());
	}

	@Transactional
	public UserResponseDTO saveUser(UserCreateDTO dto) {
		if (userRepository.existsByEmail(dto.getEmail())) {
			throw new ApiException("Email already exists", HttpStatus.CONFLICT);
		}

		User user = new User();
		user.setName(dto.getName());
		user.setEmail(dto.getEmail());
		user.setPassword(passwordEncoder.encode(dto.getPassword()));

		return toResponseDTO(userRepository.save(user));
	}

	@Transactional
	public UserResponseDTO updateCurrentUser(UpdateUserDTO dto) {
		User user = currentUserService.getCurrentUser();

		if (dto.getName() != null && !dto.getName().isBlank()) {
			user.setName(dto.getName());
		}

		if (dto.getEmail() != null && !dto.getEmail().isBlank()) {
			if (!dto.getEmail().equals(user.getEmail()) && userRepository.existsByEmail(dto.getEmail())) {
				throw new ApiException("Email already exists", HttpStatus.CONFLICT);
			}
			user.setEmail(dto.getEmail());
		}

		if (dto.getPassword() != null && !dto.getPassword().isBlank()) {
			user.setPassword(passwordEncoder.encode(dto.getPassword()));
		}

		return toResponseDTO(userRepository.save(user));
	}

	@Transactional
	public UserResponseDTO disableCurrentUser() {
		User user = currentUserService.getCurrentUser();

		if (!user.isActive()) {
			throw new ApiException("User already deactivated", HttpStatus.BAD_REQUEST);
		}

		user.setActive(false);
		return toResponseDTO(userRepository.save(user));
	}

	private UserResponseDTO toResponseDTO(User user) {
		return UserResponseDTO.builder()
				.id(user.getId())
				.publicId(user.getPublicId())
				.name(user.getName())
				.email(user.getEmail())
				.phone(user.getPhone())
				.profileImageUrl(user.getProfileImageUrl())
				.active(user.isActive())
				.createdAt(user.getCreatedAt())
				.updatedAt(user.getUpdatedAt())
				.build();
	}
}
