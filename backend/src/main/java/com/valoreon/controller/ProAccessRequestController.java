package com.valoreon.controller;

import com.valoreon.dto.proaccess.ProAccessRequestDTO;
import com.valoreon.service.ProAccessRequestService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/pro-access")
@RequiredArgsConstructor
public class ProAccessRequestController {

	private final ProAccessRequestService proAccessRequestService;

	@PostMapping
	public ResponseEntity<Void> create(@Valid @RequestBody ProAccessRequestDTO dto) {
		proAccessRequestService.create(dto);
		return ResponseEntity.status(HttpStatus.CREATED).build();
	}
}
