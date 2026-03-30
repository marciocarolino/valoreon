package com.valoreon.dto.auth;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class AuthResponseDTO {

	private String accessToken;
	private String email;
}
