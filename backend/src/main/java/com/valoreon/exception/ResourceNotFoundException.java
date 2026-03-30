package com.valoreon.exception;

import org.springframework.http.HttpStatus;

public class ResourceNotFoundException extends ApiException {

	public ResourceNotFoundException(String resource, Long id) {
		super(resource + " not found: " + id, HttpStatus.NOT_FOUND);
	}

	public ResourceNotFoundException(String message) {
		super(message, HttpStatus.NOT_FOUND);
	}
}
