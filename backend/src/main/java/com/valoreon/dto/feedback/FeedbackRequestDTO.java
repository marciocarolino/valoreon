package com.valoreon.dto.feedback;

import com.valoreon.model.enums.FeedbackType;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;

@Getter
public class FeedbackRequestDTO {

	@NotNull(message = "Tipo é obrigatório")
	private FeedbackType type;

	@NotBlank(message = "Mensagem é obrigatória")
	@Size(max = 1000, message = "Mensagem deve ter no máximo 1000 caracteres")
	private String message;

	@Email(message = "Email inválido")
	@Size(max = 255, message = "Email deve ter no máximo 255 caracteres")
	private String email;
}
