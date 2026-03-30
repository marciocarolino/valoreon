package com.valoreon.controller;

import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.valoreon.dto.auth.AuthResponseDTO;
import com.valoreon.dto.auth.LoginRequestDTO;
import com.valoreon.dto.auth.RefreshResponseDTO;
import com.valoreon.service.AuthService;
import com.valoreon.service.AuthService.LoginResult;
import com.valoreon.util.CookieUtils;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/auth")
public class AuthController {

	private final AuthService authService;
	private final CookieUtils cookieUtils;

	public AuthController(AuthService authService, CookieUtils cookieUtils) {
		this.authService = authService;
		this.cookieUtils = cookieUtils;
	}

	@PostMapping("/login")
	public ResponseEntity<AuthResponseDTO> login(@Valid @RequestBody LoginRequestDTO dto) {
		LoginResult result = authService.login(dto);

		String cookieHeader = cookieUtils
				.createRefreshTokenCookie(result.refreshToken().getToken())
				.toString();

		return ResponseEntity.ok()
				.header(HttpHeaders.SET_COOKIE, cookieHeader)
				.body(AuthResponseDTO.builder()
						.accessToken(result.accessToken())
						.email(result.email())
						.build());
	}

	@PostMapping("/refresh")
	public ResponseEntity<RefreshResponseDTO> refresh(
			@CookieValue(name = CookieUtils.REFRESH_TOKEN_COOKIE, required = false) String refreshToken) {

		if (refreshToken == null || refreshToken.isBlank()) {
			return ResponseEntity.status(401).build();
		}

		LoginResult result = authService.refresh(refreshToken);

		String cookieHeader = cookieUtils
				.createRefreshTokenCookie(result.refreshToken().getToken())
				.toString();

		return ResponseEntity.ok()
				.header(HttpHeaders.SET_COOKIE, cookieHeader)
				.body(new RefreshResponseDTO(result.accessToken()));
	}

	@PostMapping("/logout")
	public ResponseEntity<Void> logout(
			@CookieValue(name = CookieUtils.REFRESH_TOKEN_COOKIE, required = false) String refreshToken) {

		if (refreshToken != null && !refreshToken.isBlank()) {
			authService.logout(refreshToken);
		}

		String clearCookie = cookieUtils.clearRefreshTokenCookie().toString();

		return ResponseEntity.noContent()
				.header(HttpHeaders.SET_COOKIE, clearCookie)
				.build();
	}
}
