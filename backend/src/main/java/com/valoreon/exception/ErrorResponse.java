package com.valoreon.exception;

import java.time.Instant;

import lombok.Getter;

@Getter
public class ErrorResponse {

	private final String timestamp;
	private final int status;
	private final String error;
	private final String message;
	private final String path;

	public ErrorResponse(int status, String error, String message, String path) {
		this.timestamp = Instant.now().toString();
		this.status = status;
		this.error = error;
		this.message = message;
		this.path = path;
	}
}
