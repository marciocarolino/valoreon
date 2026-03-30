package com.valoreon.util;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

/**
 * Builds {@link ResponseCookie} instances for the refresh-token cookie.
 *
 * <p>The {@code cookie.secure} property should be {@code false} in local dev
 * (plain HTTP) and {@code true} in production (HTTPS).
 */
@Component
public class CookieUtils {

	public static final String REFRESH_TOKEN_COOKIE = "refreshToken";
	private static final int MAX_AGE_SECONDS = 7 * 24 * 3600; // 7 days

	@Value("${cookie.secure:false}")
	private boolean secure;

	/** Cookie that carries the refresh token value — httpOnly, never readable by JS. */
	public ResponseCookie createRefreshTokenCookie(@jakarta.annotation.Nonnull String tokenValue) {
		return ResponseCookie.from(REFRESH_TOKEN_COOKIE, tokenValue)
				.httpOnly(true)
				.secure(secure)
				.path("/")
				.maxAge(MAX_AGE_SECONDS)
				.sameSite("Strict")
				.build();
	}

	/** Zero-age cookie that instructs the browser to delete the refresh token cookie. */
	public ResponseCookie clearRefreshTokenCookie() {
		return ResponseCookie.from(REFRESH_TOKEN_COOKIE, "")
				.httpOnly(true)
				.secure(secure)
				.path("/")
				.maxAge(0)
				.sameSite("Strict")
				.build();
	}
}
