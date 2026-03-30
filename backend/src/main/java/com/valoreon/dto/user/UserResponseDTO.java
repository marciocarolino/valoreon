package com.valoreon.dto.user;

import java.time.LocalDateTime;
import java.util.UUID;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class UserResponseDTO {

	private Long id;
	private UUID publicId;
	private String name;
	private String email;
	private String phone;
	private String profileImageUrl;
	private boolean active;
	private LocalDateTime createdAt;
	private LocalDateTime updatedAt;
}
