package com.valoreon.service;

import com.valoreon.dto.proaccess.ProAccessRequestDTO;
import com.valoreon.exception.ApiException;
import com.valoreon.model.ProAccessRequest;
import com.valoreon.repository.ProAccessRequestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ProAccessRequestService {

	private final ProAccessRequestRepository repository;

	@Transactional
	public void create(ProAccessRequestDTO dto) {
		if (repository.existsByEmail(dto.getEmail())) {
			throw new ApiException("Email already registered for early access", HttpStatus.CONFLICT);
		}
		ProAccessRequest entity = ProAccessRequest.builder()
				.name(dto.getName())
				.email(dto.getEmail())
				.source("dashboard")
				.status("NEW")
				.build();
		repository.save(entity);
	}
}
