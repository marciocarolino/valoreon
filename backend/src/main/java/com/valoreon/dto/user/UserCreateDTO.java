package com.valoreon.dto.user;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class UserCreateDTO {

	@NotNull
	@NotBlank(message = "name is required")
	@Size(min = 3, max = 512, message = "Name must be between 3 and 512 characters")
	private String name;

	@NotNull
	@NotBlank(message = "email is required")
	@Email(message = "Invalid email format")
	@Size(max = 256, message = "Email must have at most 256 characters")
	private String email;

	@NotNull(message = "Password is required")
	@NotBlank(message = "password is required")
	@Size(min = 8, max = 256, message = "Password must be between 8 and 256 characters")
	private String password;

}
