package com.valoreon.dto.user;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Setter
@Getter
@NoArgsConstructor
public class UpdateUserDTO {

	
	@Size(min = 3, max = 512, message = "Name must be between 3 and 512 characters")
	private String name;

	@Email(message = "Invalid email format")
	@Size(max = 256, message = "Email must have at most 256 characters")
	private String email;

	@Size(min = 8, max = 256, message = "Password must be between 8 and 256 characters")
	private String password;
	
}
