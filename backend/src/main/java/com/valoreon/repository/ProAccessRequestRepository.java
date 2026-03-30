package com.valoreon.repository;

import com.valoreon.model.ProAccessRequest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface ProAccessRequestRepository extends JpaRepository<ProAccessRequest, UUID> {
	boolean existsByEmail(String email);
}
