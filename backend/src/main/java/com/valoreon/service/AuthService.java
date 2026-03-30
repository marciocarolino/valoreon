package com.valoreon.service;

import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.valoreon.dto.auth.LoginRequestDTO;
import com.valoreon.exception.ApiException;
import com.valoreon.model.RefreshToken;
import com.valoreon.model.User;
import com.valoreon.repository.UserRepository;
import com.valoreon.security.JwtService;

@Service
public class AuthService {

	/**
	 * Bundles everything the controller needs to build its response:
	 * the signed access token, the refresh token entity (to set as cookie),
	 * and the user's email (for the JSON body).
	 */
	public record LoginResult(String accessToken, RefreshToken refreshToken, String email) {}

	private final AuthenticationManager authenticationManager;
	private final UserDetailsService userDetailsService;
	private final UserRepository userRepository;
	private final JwtService jwtService;
	private final RefreshTokenService refreshTokenService;

	public AuthService(
			AuthenticationManager authenticationManager,
			UserDetailsService userDetailsService,
			UserRepository userRepository,
			JwtService jwtService,
			RefreshTokenService refreshTokenService) {
		this.authenticationManager = authenticationManager;
		this.userDetailsService = userDetailsService;
		this.userRepository = userRepository;
		this.jwtService = jwtService;
		this.refreshTokenService = refreshTokenService;
	}

	@Transactional
	public LoginResult login(LoginRequestDTO dto) {
		try {
			authenticationManager.authenticate(
					new UsernamePasswordAuthenticationToken(dto.getEmail(), dto.getPassword()));
		} catch (BadCredentialsException e) {
			throw new ApiException("Invalid email or password", HttpStatus.UNAUTHORIZED);
		}

		User user = userRepository.findByEmail(dto.getEmail())
				.orElseThrow(() -> new ApiException("User not found", HttpStatus.NOT_FOUND));

		UserDetails userDetails = userDetailsService.loadUserByUsername(dto.getEmail());
		String accessToken = jwtService.generateToken(userDetails);

		RefreshToken refreshToken = refreshTokenService.createRefreshToken(user);

		return new LoginResult(accessToken, refreshToken, user.getEmail());
	}

	/**
	 * Rotates the refresh token identified by {@code refreshTokenValue}.
	 *
	 * @return new access token + new refresh token entity
	 */
	@Transactional
	public LoginResult refresh(String refreshTokenValue) {
		RefreshToken oldToken = refreshTokenService.validateRefreshToken(refreshTokenValue);
		RefreshToken newRefreshToken = refreshTokenService.rotateRefreshToken(oldToken);
		UserDetails userDetails = userDetailsService.loadUserByUsername(newRefreshToken.getUser().getEmail());
		String newAccessToken = jwtService.generateToken(userDetails);
		return new LoginResult(newAccessToken, newRefreshToken, newRefreshToken.getUser().getEmail());
	}

	/** Revokes the given refresh token (single-device logout). */
	@Transactional
	public void logout(String refreshTokenValue) {
		refreshTokenService.revokeToken(refreshTokenValue);
	}
}
