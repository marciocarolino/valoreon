package com.valoreon.dto.maintenance;

import java.math.BigDecimal;
import java.time.LocalDate;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.valoreon.model.enums.MaintenanceType;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MaintenanceCreateDTO {

	@NotNull
	private Long printerId;

	@NotNull
	private MaintenanceType type;

	@Size(max = 1000)
	private String description;

	@NotNull
	private BigDecimal cost;

	@JsonProperty("date")
	@NotNull
	private LocalDate date;

	private String notes;
}
