package com.valoreon.service;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import com.valoreon.exception.ApiException;
import com.valoreon.model.User;
import com.valoreon.repository.UserRepository;

@Service
public class CurrentUserService {

	private final UserRepository userRepository;

	public CurrentUserService(UserRepository userRepository) {
		this.userRepository = userRepository;
	}

	public User getCurrentUser() {
		String email = SecurityContextHolder.getContext().getAuthentication().getName();
		if (email == null || email.isBlank() || "anonymousUser".equals(email)) {
			throw new ApiException("Unauthorized", HttpStatus.UNAUTHORIZED);
		}
		return userRepository.findByEmail(email)
				.orElseThrow(() -> new ApiException("User not found", HttpStatus.NOT_FOUND));
	}
}
