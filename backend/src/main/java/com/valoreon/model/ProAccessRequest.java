package com.valoreon.model;

import java.time.LocalDateTime;
import java.util.UUID;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "pro_access_requests")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProAccessRequest {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	@Column(name = "id", nullable = false, updatable = false)
	private UUID id;

	@Column(name = "name", nullable = false, length = 512)
	private String name;

	@Column(name = "email", nullable = false, length = 256)
	private String email;

	@Column(name = "source", nullable = false, length = 64)
	private String source;

	@Column(name = "status", nullable = false, length = 32)
	private String status;

	@Column(name = "created_at", nullable = false)
	private LocalDateTime createdAt;

	@PrePersist
	public void prePersist() {
		this.createdAt = LocalDateTime.now();
		if (this.source == null) this.source = "dashboard";
		if (this.status == null) this.status  = "NEW";
	}
}
