package com.valoreon.security;

import java.io.IOException;

import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Enforces rate limiting on {@code POST /auth/login}.
 * Delegates the per-IP sliding-window check to {@link RateLimitService}.
 * Returns HTTP 429 when the limit is exceeded.
 *
 * <p>IP resolution order (to handle reverse-proxy deployments):
 * <ol>
 *   <li>{@code X-Forwarded-For} — first address in the list</li>
 *   <li>{@code X-Real-IP}</li>
 *   <li>{@code request.getRemoteAddr()} — direct connection fallback</li>
 * </ol>
 * <strong>Note:</strong> {@code X-Forwarded-For} can be spoofed if the reverse proxy
 * does not strip client-supplied values. Ensure the proxy overwrites this header.
 */
@Component
public class RateLimitFilter extends OncePerRequestFilter {

	private static final String LOGIN_PATH = "/auth/login";

	private final RateLimitService rateLimitService;

	public RateLimitFilter(RateLimitService rateLimitService) {
		this.rateLimitService = rateLimitService;
	}

	@Override
	protected void doFilterInternal(
			@NonNull HttpServletRequest request,
			@NonNull HttpServletResponse response,
			@NonNull FilterChain filterChain) throws ServletException, IOException {

		if (!LOGIN_PATH.equals(request.getServletPath())
				|| !HttpMethod.POST.name().equalsIgnoreCase(request.getMethod())) {
			filterChain.doFilter(request, response);
			return;
		}

		String ip = resolveClientIp(request);

		if (!rateLimitService.isAllowed(ip)) {
			response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
			response.setContentType(MediaType.APPLICATION_JSON_VALUE);
			response.getWriter().write("{\"message\":\"Too many requests. Try again in 1 minute.\"}");
			return;
		}

		filterChain.doFilter(request, response);
	}

	/**
	 * Extracts the originating client IP address, respecting common reverse-proxy headers.
	 */
	private static String resolveClientIp(HttpServletRequest request) {
		String forwarded = request.getHeader("X-Forwarded-For");
		if (forwarded != null && !forwarded.isBlank()) {
			// X-Forwarded-For may contain a comma-separated list; the first entry is the client
			return forwarded.split(",")[0].strip();
		}

		String realIp = request.getHeader("X-Real-IP");
		if (realIp != null && !realIp.isBlank()) {
			return realIp.strip();
		}

		return request.getRemoteAddr();
	}
}
