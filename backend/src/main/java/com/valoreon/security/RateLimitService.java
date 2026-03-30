package com.valoreon.security;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Service;

/**
 * In-memory sliding-window rate limiter.
 * Allows at most {@link #MAX_REQUESTS} calls per IP within a {@link #WINDOW_MILLIS} rolling window.
 */
@Service
public class RateLimitService {

	private static final int MAX_REQUESTS = 5;
	private static final long WINDOW_MILLIS = 60_000L; // 1 minute

	private final ConcurrentHashMap<String, List<Long>> requestLog = new ConcurrentHashMap<>();

	/**
	 * Returns {@code true} if the request from {@code ip} is within the allowed limit.
	 * The call itself counts as one attempt.
	 */
	public boolean isAllowed(String ip) {
		long now = System.currentTimeMillis();
		long windowStart = now - WINDOW_MILLIS;

		List<Long> timestamps = requestLog.compute(ip, (key, existing) -> {
			List<Long> list = (existing != null) ? existing : new ArrayList<>();
			list.removeIf(ts -> ts < windowStart);
			list.add(now);
			return list;
		});

		return timestamps.size() <= MAX_REQUESTS;
	}
}
