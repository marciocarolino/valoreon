package com.valoreon.exception;

import org.springframework.http.HttpStatus;

public class UnauthorizedAccessException extends ApiException {

	public UnauthorizedAccessException() {
		super("Access denied to this resource", HttpStatus.FORBIDDEN);
	}

	public UnauthorizedAccessException(String message) {
		super(message, HttpStatus.FORBIDDEN);
	}
}
