package com.valoreon.service;

import java.time.Instant;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.valoreon.exception.ApiException;
import com.valoreon.model.RefreshToken;
import com.valoreon.model.User;
import com.valoreon.repository.RefreshTokenRepository;

@Service
public class RefreshTokenService {

	@Value("${refresh.token.expiration-days:7}")
	private int expirationDays;

	private final RefreshTokenRepository refreshTokenRepository;

	public RefreshTokenService(RefreshTokenRepository refreshTokenRepository) {
		this.refreshTokenRepository = refreshTokenRepository;
	}

	/** Creates and persists a new refresh token for the given user. */
	@Transactional
	public RefreshToken createRefreshToken(User user) {
		RefreshToken token = new RefreshToken();
		token.setUser(user);
		token.setToken(UUID.randomUUID().toString());
		token.setExpiryDate(Instant.now().plusSeconds((long) expirationDays * 24 * 3600));
		token.setRevoked(false);
		return refreshTokenRepository.save(token);
	}

	/**
	 * Validates that the token exists, is not revoked, and is not expired.
	 *
	 * @throws ApiException (401) if any check fails
	 */
	@Transactional(readOnly = true)
	public RefreshToken validateRefreshToken(String tokenValue) {
		RefreshToken token = refreshTokenRepository.findByToken(tokenValue)
				.orElseThrow(() -> new ApiException("Invalid refresh token", HttpStatus.UNAUTHORIZED));

		if (token.isRevoked()) {
			throw new ApiException("Refresh token has been revoked", HttpStatus.UNAUTHORIZED);
		}

		if (token.getExpiryDate().isBefore(Instant.now())) {
			throw new ApiException("Refresh token has expired. Please log in again.", HttpStatus.UNAUTHORIZED);
		}

		return token;
	}

	/**
	 * Revokes the old token and issues a fresh one for the same user (rotation).
	 * Both operations run in a single transaction.
	 */
	@Transactional
	public RefreshToken rotateRefreshToken(RefreshToken oldToken) {
		oldToken.setRevoked(true);
		refreshTokenRepository.save(oldToken);
		return createRefreshToken(oldToken.getUser());
	}

	/** Revokes the specific token (single-device logout). */
	@Transactional
	public void revokeToken(String tokenValue) {
		refreshTokenRepository.findByToken(tokenValue).ifPresent(token -> {
			token.setRevoked(true);
			refreshTokenRepository.save(token);
		});
	}
}
