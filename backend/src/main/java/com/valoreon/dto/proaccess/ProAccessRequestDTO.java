package com.valoreon.dto.proaccess;

import jakarta.validation.constraints.*;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
public class ProAccessRequestDTO {

	@NotBlank(message = "name is required")
	@Size(max = 512)
	private String name;

	@NotBlank(message = "email is required")
	@Email(message = "Invalid email format")
	@Size(max = 256)
	private String email;
}
