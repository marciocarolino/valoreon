package com.valoreon.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.valoreon.dto.feedback.FeedbackRequestDTO;
import com.valoreon.service.FeedbackService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/feedback")
public class FeedbackController {

	private final FeedbackService feedbackService;

	public FeedbackController(FeedbackService feedbackService) {
		this.feedbackService = feedbackService;
	}

	@PostMapping
	public ResponseEntity<Void> create(@Valid @RequestBody FeedbackRequestDTO dto) {
		feedbackService.createFeedback(dto);
		return ResponseEntity.status(HttpStatus.CREATED).build();
	}
}
