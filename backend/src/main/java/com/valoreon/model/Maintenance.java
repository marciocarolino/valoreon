package com.valoreon.model;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.valoreon.model.enums.MaintenanceStatus;
import com.valoreon.model.enums.MaintenanceType;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "maintenances")
@Getter
@Setter
@NoArgsConstructor
public class Maintenance {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "printer_id", nullable = false)
	private Printer printer;

	@JsonBackReference
	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "user_id", nullable = false)
	private User user;

	@Enumerated(EnumType.STRING)
	@Column(name = "type", nullable = false, length = 32)
	private MaintenanceType type;

	@Enumerated(EnumType.STRING)
	@Column(name = "status", nullable = false, length = 32)
	private MaintenanceStatus status = MaintenanceStatus.IN_PROGRESS;

	@Column(name = "description", columnDefinition = "TEXT")
	private String description;

	@Column(name = "cost", precision = 15, scale = 4, nullable = false)
	private BigDecimal cost;

	/** Legacy calendar day; kept for reporting and backward compatibility. */
	@Column(name = "maintenance_date", nullable = false)
	private LocalDate maintenanceDate;

	@Column(name = "notes", columnDefinition = "TEXT")
	private String notes;

	@Column(name = "start_date", nullable = false)
	private LocalDateTime startDate;

	@Column(name = "end_date")
	private LocalDateTime endDate;

	@Column(name = "finished_at")
	private LocalDateTime finishedAt;

	@Column(name = "created_at", nullable = false)
	private LocalDateTime createdAt;

	@PrePersist
	public void prePersist() {
		if (createdAt == null) {
			createdAt = LocalDateTime.now();
		}
		if (status == null) {
			status = MaintenanceStatus.IN_PROGRESS;
		}
		if (startDate == null && maintenanceDate != null) {
			startDate = maintenanceDate.atStartOfDay();
		}
	}
}
