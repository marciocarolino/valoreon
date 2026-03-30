package com.valoreon.dto.maintenance;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.valoreon.model.enums.MaintenanceStatus;
import com.valoreon.model.enums.MaintenanceType;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MaintenanceResponseDTO {

	private Long id;
	private Long printerId;
	private String printerName;
	private MaintenanceType type;
	private MaintenanceStatus status;
	private String description;
	private BigDecimal cost;

	/** Legacy scheduled calendar day (reporting). */
	@JsonProperty("date")
	private LocalDate date;

	private LocalDateTime startDate;
	private LocalDateTime endDate;

	/** Legacy field; mirrors {@code endDate} when present. */
	private LocalDateTime finishedAt;

	private LocalDateTime createdAt;

	private String notes;

	/** Elapsed time when both {@code startDate} and {@code endDate} are known; otherwise null. */
	private Long durationInSeconds;

	/** Human-readable duration (e.g. {@code 01:32:15}); null if duration is unknown. */
	private String durationFormatted;
}
