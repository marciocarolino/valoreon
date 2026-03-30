package com.valoreon.exception;

import java.util.stream.Collectors;

import jakarta.servlet.http.HttpServletRequest;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

	private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

	/** Handles all ApiException subclasses (ResourceNotFoundException, UnauthorizedAccessException, etc.). */
	@ExceptionHandler(ApiException.class)
	public ResponseEntity<ErrorResponse> handleApiException(ApiException ex, HttpServletRequest request) {
		HttpStatus status = ex.getStatus();
		return ResponseEntity
				.status(status.value())
				.body(new ErrorResponse(status.value(), status.getReasonPhrase(), ex.getMessage(), request.getRequestURI()));
	}

	/** Spring Security access denied — return 403 instead of redirecting. */
	@ExceptionHandler(AccessDeniedException.class)
	public ResponseEntity<ErrorResponse> handleAccessDenied(HttpServletRequest request) {
		return ResponseEntity
				.status(HttpStatus.FORBIDDEN)
				.body(new ErrorResponse(403, "Forbidden", "Access denied to this resource", request.getRequestURI()));
	}

	/** Bean Validation failures. */
	@ExceptionHandler(MethodArgumentNotValidException.class)
	public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException ex,
			HttpServletRequest request) {
		String message = ex.getBindingResult().getFieldErrors().stream()
				.map(e -> e.getField() + ": " + e.getDefaultMessage())
				.collect(Collectors.joining(", "));
		return ResponseEntity
				.status(HttpStatus.BAD_REQUEST)
				.body(new ErrorResponse(400, "Bad Request", message, request.getRequestURI()));
	}

	/** Catch-all — never expose stack traces. */
	@ExceptionHandler(Exception.class)
	public ResponseEntity<ErrorResponse> handleGeneric(Exception ex, HttpServletRequest request) {
		log.error("Unhandled exception at {}", request.getRequestURI(), ex);
		return ResponseEntity
				.status(HttpStatus.INTERNAL_SERVER_ERROR)
				.body(new ErrorResponse(500, "Internal Server Error", "Internal server error", request.getRequestURI()));
	}
}
